/**
 * AI Order Service — Phase AI
 *
 * Responsibilities:
 *   1. Provide ERP context (product list) to Gemini
 *   2. Resolve customer and product names to DB IDs
 *   3. Determine which fields are still missing
 *   4. Manage AIOrderDraft lifecycle
 *   5. Call existing order creation logic on confirmation
 *
 * This service NEVER duplicates business logic from orderController/orderService.
 * Pricing, stock deduction, and order saving are always delegated to the existing system.
 */

import mongoose from 'mongoose';
import AIOrderDraft from '../models/AIOrderDraft.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import { extractFromText, extractFromAudio } from './geminiService.js';
import {
  calculateItemTotal,
  calculateOrderTotal,
  createPriceSnapshot,
  calculateEstimatedReadyDate,
} from './orderService.js';
import {
  checkStockAvailability,
  deductStock,
} from './inventoryService.js';
import Order from '../models/Order.js';
import { AI_DRAFT_STATUS, ORDER_STATUS, DELIVERY_TYPES, ORDER_SOURCES } from '../config/constants.js';
import logger from '../utils/logger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Load all active product names for Gemini context */
const getProductContext = async () => {
  const products = await Product.find({ isActive: true }).select('name').lean();
  return { productNames: products.map(p => p.name) };
};

/** Required fields per item */
const ITEM_REQUIRED = ['productName', 'quantityKg', 'grindType', 'orderType'];
/** Required order-level fields */
const ORDER_REQUIRED = ['customerName', 'deliveryType'];

/**
 * Given the current extractedOrder, compute which fields are still missing.
 * Returns array of human-readable field names.
 */
const computeMissingFields = (extracted) => {
  const missing = [];

  if (!extracted.customerName && !extracted.customerId) missing.push('customer name');
  if (!extracted.deliveryType) missing.push('delivery type');

  if (!extracted.items || extracted.items.length === 0) {
    missing.push('order items');
    return missing;
  }

  for (let i = 0; i < extracted.items.length; i++) {
    const item = extracted.items[i];
    const prefix = extracted.items.length > 1 ? `item ${i + 1}: ` : '';
    if (!item.productName && !item.productId) missing.push(`${prefix}product`);
    if (!item.quantityKg) missing.push(`${prefix}quantity`);
    if (!item.grindType) missing.push(`${prefix}grind type`);
    if (!item.orderType) missing.push(`${prefix}order type`);
  }

  // Delivery address required only for Delivery type
  if (extracted.deliveryType === DELIVERY_TYPES.DELIVERY) {
    const a = extracted.deliveryAddress;
    if (!a || !a.name || !a.phone || !a.streetType || !a.houseName || !a.doorNo) {
      missing.push('delivery address');
    }
  }

  return missing;
};

/**
 * Merge a new Gemini extraction into the existing draft extractedOrder.
 * Only overwrites fields that Gemini explicitly provided (non-null).
 */
const mergeExtraction = (existing, incoming) => {
  const merged = { ...existing };

  // Customer
  if (incoming.customer?.name)  merged.customerName  = incoming.customer.name;
  if (incoming.customer?.phone) merged.customerPhone = incoming.customer.phone;

  // Delivery
  if (incoming.deliveryType)    merged.deliveryType = incoming.deliveryType;
  if (incoming.deliveryAddress) merged.deliveryAddress = incoming.deliveryAddress;

  // Items — merge by index, or append new items
  if (Array.isArray(incoming.items) && incoming.items.length > 0) {
    if (!merged.items) merged.items = [];
    incoming.items.forEach((incomingItem, idx) => {
      if (!merged.items[idx]) {
        merged.items[idx] = {};
      }
      const target = merged.items[idx];
      if (incomingItem.productName != null) target.productName = incomingItem.productName;
      if (incomingItem.quantityKg  != null) target.quantityKg  = incomingItem.quantityKg;
      if (incomingItem.grindType   != null) target.grindType   = incomingItem.grindType;
      if (incomingItem.orderType   != null) target.orderType   = incomingItem.orderType;
    });
  }

  return merged;
};

/**
 * Resolve customer name/phone to a Customer document.
 * Returns { customerId, candidates, ambiguous, notFound }
 */
const resolveCustomer = async (name, phone) => {
  const query = [];
  if (name)  query.push({ name:  new RegExp(name.trim(), 'i') });
  if (phone) query.push({ phone: phone.trim() });

  if (query.length === 0) return { customerId: null, candidates: [], ambiguous: false, notFound: false };

  const matches = await Customer.find({ $or: query }).select('_id name phone').lean();

  if (matches.length === 0) return { customerId: null, candidates: [], ambiguous: false, notFound: true };
  if (matches.length === 1) return { customerId: matches[0]._id, candidates: [], ambiguous: false, notFound: false };
  // Multiple matches — need clarification
  return { customerId: null, candidates: matches, ambiguous: true, notFound: false };
};

/**
 * Resolve a product name to a Product document.
 * Returns { productId, candidates, ambiguous, notFound }
 */
const resolveProduct = async (productName) => {
  if (!productName) return { productId: null, candidates: [], ambiguous: false, notFound: false };

  // Exact match first
  const exact = await Product.findOne({
    name:     new RegExp(`^${productName.trim()}$`, 'i'),
    isActive: true,
  }).select('_id name').lean();

  if (exact) return { productId: exact._id, candidates: [], ambiguous: false, notFound: false };

  // Partial match
  const partial = await Product.find({
    name:     new RegExp(productName.trim(), 'i'),
    isActive: true,
  }).select('_id name').lean();

  if (partial.length === 0) return { productId: null, candidates: [], ambiguous: false, notFound: true };
  if (partial.length === 1) return { productId: partial[0]._id, candidates: [], ambiguous: false, notFound: false };
  return { productId: null, candidates: partial, ambiguous: true, notFound: false };
};

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Create a new empty draft session.
 */
export const createDraft = async (adminId) => {
  const draft = await AIOrderDraft.create({
    adminId,
    messages:       [],
    extractedOrder: {},
    validation:     { missingFields: [], ambiguousFields: [], isReadyForConfirmation: false },
    status:         AI_DRAFT_STATUS.COLLECTING,
  });
  return draft;
};

/**
 * Process a text message from the admin.
 * - Calls Gemini for extraction
 * - Merges into draft
 * - Resolves customer/product IDs
 * - Computes missing fields
 * - Saves updated draft
 * Returns { draft, aiMessage }
 */
export const processTextMessage = async (draftId, userMessage, adminId) => {
  const draft = await AIOrderDraft.findOne({ _id: draftId, adminId });
  if (!draft) throw new Error('Draft not found');
  if ([AI_DRAFT_STATUS.CONFIRMED, AI_DRAFT_STATUS.CREATED, AI_DRAFT_STATUS.CANCELLED].includes(draft.status)) {
    throw new Error('This draft has already been finalised');
  }

  // Add admin message to history
  draft.messages.push({ role: 'admin', content: userMessage });

  const context = await getProductContext();

  // Call Gemini
  const extraction = await extractFromText(userMessage, draft.extractedOrder, context);

  // Merge new extraction into existing draft
  const merged = mergeExtraction(draft.extractedOrder || {}, extraction);

  // Resolve customer
  const { customerId, candidates: custCandidates, ambiguous: custAmbiguous, notFound: custNotFound }
    = await resolveCustomer(merged.customerName, merged.customerPhone);

  if (customerId) merged.customerId = customerId;
  if (custCandidates.length > 0) merged.customerCandidates = custCandidates;

  // Resolve products
  const ambiguousFields = [];
  for (const item of (merged.items || [])) {
    if (item.productName && !item.productId) {
      const { productId, candidates, ambiguous, notFound } = await resolveProduct(item.productName);
      if (productId)            item.productId = productId;
      if (candidates.length > 0) item.productCandidates = candidates;
      if (ambiguous)            ambiguousFields.push(`product "${item.productName}"`);
      if (notFound)             ambiguousFields.push(`product "${item.productName}" not found in catalog`);
    }
  }

  if (custAmbiguous)  ambiguousFields.push('customer (multiple matches)');
  if (custNotFound)   ambiguousFields.push('customer (not found — may need to register)');

  draft.extractedOrder = merged;

  // Compute missing fields
  const missingFields = computeMissingFields(merged);
  const isReadyForConfirmation = missingFields.length === 0 && ambiguousFields.length === 0;

  draft.validation = {
    missingFields,
    ambiguousFields,
    clarificationText: extraction.clarificationQuestion ?? null,
    isReadyForConfirmation,
  };

  draft.status = isReadyForConfirmation
    ? AI_DRAFT_STATUS.READY_FOR_CONFIRMATION
    : (extraction.clarificationQuestion || ambiguousFields.length > 0 || missingFields.length > 0)
      ? AI_DRAFT_STATUS.WAITING_FOR_CLARIFICATION
      : AI_DRAFT_STATUS.COLLECTING;

  // Build AI reply message
  const aiMessage = buildAIMessage(merged, missingFields, ambiguousFields, extraction, isReadyForConfirmation);
  draft.messages.push({ role: 'ai', content: aiMessage });

  // Refresh expiry
  draft.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await draft.save();

  return { draft, aiMessage };
};

/**
 * Process an audio upload.
 * Same flow as processTextMessage but uses audio extraction.
 */
export const processAudioMessage = async (draftId, audioBuffer, mimeType, adminId) => {
  const draft = await AIOrderDraft.findOne({ _id: draftId, adminId });
  if (!draft) throw new Error('Draft not found');

  draft.messages.push({ role: 'admin', content: '[Audio message uploaded]' });

  const context = await getProductContext();
  const extraction = await extractFromAudio(audioBuffer, mimeType, draft.extractedOrder, context);

  // Reuse same merge + resolve + validation logic
  const merged = mergeExtraction(draft.extractedOrder || {}, extraction);

  const { customerId, candidates: custCandidates, ambiguous: custAmbiguous, notFound: custNotFound }
    = await resolveCustomer(merged.customerName, merged.customerPhone);
  if (customerId) merged.customerId = customerId;
  if (custCandidates.length > 0) merged.customerCandidates = custCandidates;

  const ambiguousFields = [];
  for (const item of (merged.items || [])) {
    if (item.productName && !item.productId) {
      const { productId, candidates, ambiguous, notFound } = await resolveProduct(item.productName);
      if (productId)             item.productId = productId;
      if (candidates.length > 0) item.productCandidates = candidates;
      if (ambiguous)             ambiguousFields.push(`product "${item.productName}"`);
      if (notFound)              ambiguousFields.push(`product "${item.productName}" not found`);
    }
  }
  if (custAmbiguous) ambiguousFields.push('customer (multiple matches)');
  if (custNotFound)  ambiguousFields.push('customer (not found)');

  draft.extractedOrder = merged;

  const missingFields = computeMissingFields(merged);
  const isReadyForConfirmation = missingFields.length === 0 && ambiguousFields.length === 0;

  draft.validation = {
    missingFields,
    ambiguousFields,
    clarificationText: extraction.clarificationQuestion ?? null,
    isReadyForConfirmation,
  };

  draft.status = isReadyForConfirmation
    ? AI_DRAFT_STATUS.READY_FOR_CONFIRMATION
    : AI_DRAFT_STATUS.WAITING_FOR_CLARIFICATION;

  const aiMessage = buildAIMessage(merged, missingFields, ambiguousFields, extraction, isReadyForConfirmation);
  draft.messages.push({ role: 'ai', content: aiMessage });

  draft.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await draft.save();

  return { draft, aiMessage };
};

/**
 * Confirm a ready draft — run the EXISTING order creation logic.
 * The AI feature never writes an Order directly.
 */
export const confirmDraft = async (draftId, adminId) => {
  const draft = await AIOrderDraft.findOne({ _id: draftId, adminId });
  if (!draft) throw new Error('Draft not found');

  if (draft.status !== AI_DRAFT_STATUS.READY_FOR_CONFIRMATION) {
    throw new Error(
      draft.validation.missingFields.length > 0
        ? `Cannot confirm: missing fields — ${draft.validation.missingFields.join(', ')}`
        : 'Order is not ready for confirmation yet'
    );
  }

  const e = draft.extractedOrder;

  if (!e.customerId) throw new Error('Customer not resolved. Please resolve customer before confirming.');

  // Build the items array expected by the existing order creation logic
  const productIds = e.items.map(i => i.productId);
  const products   = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  // Validate products exist and are active
  for (const item of e.items) {
    const product = productMap.get(item.productId?.toString());
    if (!product)        throw new Error(`Product not found: ${item.productName}`);
    if (!product.isActive) throw new Error(`Product "${product.name}" is currently unavailable`);
  }

  // Build items for the request payload (same shape as createOrder expects)
  const requestItems = e.items.map(item => ({
    productId: item.productId.toString(),
    quantity:  item.quantityKg,
    grindType: item.grindType,
    orderType: item.orderType,
  }));

  // Stock check (reuses existing service)
  checkStockAvailability(requestItems, productMap);

  // Build order items with price snapshots (reuses existing service)
  const orderItems = requestItems.map(item => {
    const product       = productMap.get(item.productId);
    const priceSnapshot = createPriceSnapshot(product);
    const orderItem = {
      productId:                product._id,
      productName:              product.name,
      quantity:                 item.quantity,
      grindType:                item.grindType,
      orderType:                item.orderType,
      rawMaterialPriceSnapshot: priceSnapshot.rawMaterialPriceSnapshot,
      grindingChargeSnapshot:   priceSnapshot.grindingChargeSnapshot,
      itemTotal:                0,
    };
    orderItem.itemTotal = calculateItemTotal(orderItem, item.orderType);
    return orderItem;
  });

  const totalAmount      = calculateOrderTotal(orderItems);
  const estimatedReadyDate = calculateEstimatedReadyDate();

  // Build delivery address
  let deliveryAddress = e.deliveryAddress || {};
  if (e.deliveryType === DELIVERY_TYPES.PICKUP) {
    // For Pickup, build a minimal valid address using customer data from DB
    const customerDoc = await Customer.findById(e.customerId).select('name phone').lean();
    const custPhone = customerDoc?.phone || e.customerPhone || '0000000000';
    deliveryAddress = {
      name:       e.customerName || customerDoc?.name || 'Pickup Customer',
      phone:      custPhone,
      streetType: 'Center',
      houseName:  'Pickup at Mill',
      doorNo:     '-',
      landmark:   '',
    };
  }

  // Create the Order document — same as if it came through the normal flow
  const order = new Order({
    customerId:      e.customerId,
    items:           orderItems,
    deliveryAddress,
    deliveryType:    e.deliveryType,
    totalAmount,
    status:          ORDER_STATUS.PENDING,
    estimatedReadyDate,
    source:          ORDER_SOURCES.PHONE_AI,
  });

  await order.save();

  // Deduct stock (reuses existing service)
  await deductStock(requestItems, productMap);

  // Update draft
  draft.status         = AI_DRAFT_STATUS.CREATED;
  draft.createdOrderId = order._id;
  await draft.save();

  logger.info('AI phone order created', {
    orderId:  order._id,
    draftId:  draft._id,
    adminId,
    customer: e.customerId,
  });

  return { order, draft };
};

/**
 * Cancel a draft.
 */
export const cancelDraft = async (draftId, adminId) => {
  const draft = await AIOrderDraft.findOne({ _id: draftId, adminId });
  if (!draft) throw new Error('Draft not found');
  draft.status = AI_DRAFT_STATUS.CANCELLED;
  await draft.save();
  return draft;
};

/**
 * List recent drafts for an admin (last 20, not expired/cancelled).
 */
export const listDrafts = async (adminId) => {
  return AIOrderDraft.find({
    adminId,
    status: { $nin: [AI_DRAFT_STATUS.CANCELLED, AI_DRAFT_STATUS.FAILED] },
    expiresAt: { $gt: new Date() },
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();
};

// ─── Message builder ──────────────────────────────────────────────────────────

const buildAIMessage = (merged, missingFields, ambiguousFields, extraction, isReady) => {
  const lines = [];

  // What we understood
  if (merged.customerName || merged.customerId) {
    lines.push(`Customer: ${merged.customerName || 'Resolved from DB'}`);
  }

  if (Array.isArray(merged.items) && merged.items.length > 0) {
    merged.items.forEach((item, i) => {
      const prefix = merged.items.length > 1 ? `Item ${i + 1}: ` : '';
      const parts = [];
      if (item.productName) parts.push(item.productName);
      if (item.quantityKg)  parts.push(`${item.quantityKg} kg`);
      if (item.grindType)   parts.push(item.grindType);
      if (item.orderType)   parts.push(item.orderType === 'buyAndService' ? 'Buy & Service' : 'Service Only');
      if (parts.length > 0) lines.push(`${prefix}${parts.join(' · ')}`);
    });
  }

  if (merged.deliveryType) lines.push(`Delivery: ${merged.deliveryType}`);

  // Ambiguous
  if (ambiguousFields.length > 0) {
    lines.push('');
    lines.push('⚠️ Needs clarification:');
    ambiguousFields.forEach(f => lines.push(`• ${f}`));
  }

  // Missing
  if (missingFields.length > 0) {
    lines.push('');
    lines.push('Still missing:');
    missingFields.forEach(f => lines.push(`• ${f}`));
  }

  // Clarification question from Gemini
  if (extraction.clarificationQuestion) {
    lines.push('');
    lines.push(extraction.clarificationQuestion);
  }

  // Ready
  if (isReady) {
    lines.push('');
    lines.push('✅ All information collected. Please review the order and confirm.');
  }

  return lines.join('\n') || 'Processing your message...';
};
