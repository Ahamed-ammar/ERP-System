/**
 * Inventory Service — Phase 1
 *
 * Handles raw material stock operations for the grinding mill.
 *
 * KEY BUSINESS RULE:
 *   Only `buyAndService` order items consume mill stock.
 *   `serviceOnly` items — customer brings their own material — do NOT touch stock.
 *
 * Stock is deducted at ORDER CREATION (not fulfillment).
 * Stock is restored when an order is CANCELLED.
 */

import Product from '../models/Product.js';
import { ORDER_TYPES, ERROR_CODES } from '../config/constants.js';

/**
 * Check stock availability for all buyAndService items in an order.
 * Throws an error (with code INSUFFICIENT_STOCK) if any product lacks stock.
 *
 * @param {Array} items     - raw request items [{ productId, quantity, orderType, ... }]
 * @param {Map}   productMap - Map<productId string, Product document>
 */
export const checkStockAvailability = (items, productMap) => {
  for (const item of items) {
    // serviceOnly items don't use mill stock
    if (item.orderType !== ORDER_TYPES.BUY_AND_SERVICE) continue;

    const product = productMap.get(item.productId.toString());
    if (!product) continue; // already caught by product existence check

    if (product.stockKg < item.quantity) {
      const available = product.stockKg.toFixed(2);
      const requested = item.quantity.toFixed(2);
      const err = new Error(
        `Insufficient stock for "${product.name}". Available: ${available} kg, Requested: ${requested} kg.`
      );
      err.code = ERROR_CODES.INSUFFICIENT_STOCK;
      err.productId = product._id;
      err.productName = product.name;
      err.available = product.stockKg;
      err.requested = item.quantity;
      throw err;
    }
  }
};

/**
 * Deduct stock for buyAndService items after an order is confirmed.
 * Uses atomic $inc operations via bulkWrite to avoid race conditions.
 *
 * @param {Array} items     - validated order items with orderType + productId + quantity
 * @param {Map}   productMap - Map<productId string, Product document>
 */
export const deductStock = async (items, productMap) => {
  const bulkOps = [];

  for (const item of items) {
    if (item.orderType !== ORDER_TYPES.BUY_AND_SERVICE) continue;

    bulkOps.push({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { stockKg: -item.quantity } },
      },
    });
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }
};

/**
 * Restore stock for buyAndService items when an order is cancelled.
 * Uses atomic $inc to add back the deducted quantity.
 *
 * @param {Array} orderItems - the order's embedded items array (from the Order document)
 */
export const restoreStock = async (orderItems) => {
  const bulkOps = [];

  for (const item of orderItems) {
    if (item.orderType !== ORDER_TYPES.BUY_AND_SERVICE) continue;

    bulkOps.push({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { stockKg: item.quantity } },
      },
    });
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }
};

/**
 * Get all products that are below their low-stock threshold.
 * Sorted by stockKg ascending (most critical first).
 *
 * @returns {Array} Product documents where stockKg < lowStockThresholdKg
 */
export const getLowStockProducts = async () => {
  // MongoDB $expr allows comparing two fields in the same document
  return Product.find({
    isActive: true,
    $expr: { $lt: ['$stockKg', '$lowStockThresholdKg'] },
  })
    .select('name stockKg lowStockThresholdKg')
    .sort({ stockKg: 1 });
};

/**
 * Set the stock level for a product directly (admin stock-in / adjustment).
 *
 * @param {string} productId
 * @param {number} stockKg           - new absolute stock value (≥ 0)
 * @param {number} lowStockThresholdKg - optional new threshold
 * @returns {Product} updated product document
 */
export const setProductStock = async (productId, stockKg, lowStockThresholdKg) => {
  const update = { stockKg };
  if (lowStockThresholdKg !== undefined) {
    update.lowStockThresholdKg = lowStockThresholdKg;
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: update },
    { new: true, runValidators: true }
  );

  return product;
};
