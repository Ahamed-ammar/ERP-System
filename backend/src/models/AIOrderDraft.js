/**
 * AIOrderDraft — Phase AI
 *
 * Stores the stateful conversation and extracted order information
 * for the AI Phone Order Assistant feature.
 *
 * An AIOrderDraft is NEVER an Order. It becomes an Order only after:
 *   1. All required fields are resolved against the DB
 *   2. Admin explicitly confirms
 *   3. The existing createOrder business logic succeeds
 */

import mongoose from 'mongoose';
import { AI_DRAFT_STATUS } from '../config/constants.js';

// A single chat message in the conversation history
const messageSchema = new mongoose.Schema(
  {
    role:      { type: String, enum: ['admin', 'ai'], required: true },
    content:   { type: String, required: true },
    timestamp: { type: Date,   default: Date.now },
  },
  { _id: false }
);

// One extracted order item (before DB resolution)
const draftItemSchema = new mongoose.Schema(
  {
    // What Gemini extracted (may still be null while collecting)
    productName:  { type: String, default: null },  // raw extracted name e.g. "Chilli"
    productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    quantityKg:   { type: Number, default: null },
    grindType:    { type: String, default: null },   // Fine | Medium | Coarse
    orderType:    { type: String, default: null },   // serviceOnly | buyAndService
    // If multiple products matched the name, store them here for admin selection
    productCandidates: [{ _id: mongoose.Schema.Types.ObjectId, name: String }],
  },
  { _id: false }
);

// Delivery address as extracted/resolved
const draftAddressSchema = new mongoose.Schema(
  {
    name:       { type: String, default: null },
    phone:      { type: String, default: null },
    streetType: { type: String, default: null },
    houseName:  { type: String, default: null },
    doorNo:     { type: String, default: null },
    landmark:   { type: String, default: null },
  },
  { _id: false }
);

const aiOrderDraftSchema = new mongoose.Schema(
  {
    adminId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Admin',
      required: true,
    },

    // Full conversation history for this draft session
    messages: [messageSchema],

    // --- Extracted order data ---
    extractedOrder: {
      // Customer
      customerName:       { type: String, default: null },
      customerPhone:      { type: String, default: null },
      customerId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
      // If multiple customers matched, stored here for admin selection
      customerCandidates: [{ _id: mongoose.Schema.Types.ObjectId, name: String, phone: String }],

      items:        [draftItemSchema],
      deliveryType: { type: String, default: null },  // Pickup | Delivery
      deliveryAddress: draftAddressSchema,
    },

    // --- Backend validation results ---
    validation: {
      missingFields:     [String],           // e.g. ['grindType', 'deliveryType']
      ambiguousFields:   [String],           // e.g. ['product', 'customer']
      clarificationText: { type: String, default: null },
      isReadyForConfirmation: { type: Boolean, default: false },
    },

    // Draft lifecycle status
    status: {
      type:    String,
      enum:    Object.values(AI_DRAFT_STATUS),
      default: AI_DRAFT_STATUS.COLLECTING,
    },

    // Set after successful order creation
    createdOrderId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Order',
      default: null,
    },

    // Auto-expire drafts after 24 hours of inactivity
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes expired drafts
aiOrderDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
aiOrderDraftSchema.index({ adminId: 1, createdAt: -1 });

const AIOrderDraft = mongoose.model('AIOrderDraft', aiOrderDraftSchema);
export default AIOrderDraft;
