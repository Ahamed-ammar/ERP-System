/**
 * Seed helpers for tests
 * Creates commonly needed test data directly via models.
 */

import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Customer from '../../models/Customer.js';
import DeliveryStaff from '../../models/DeliveryStaff.js';
import { ORDER_STATUS, GRIND_TYPES, ORDER_TYPES, DELIVERY_TYPES } from '../../config/constants.js';

/**
 * Create a test product.
 * Default stockKg is 100 so existing order tests pass the Phase 1 stock check.
 * Pass stockKg: 0 explicitly to test out-of-stock scenarios.
 */
export const createProduct = async (overrides = {}) => {
  const defaults = {
    name: 'Test Wheat Flour',
    rawMaterialPricePerKg: 40,
    grindingChargePerKg: 10,
    isActive: true,
    description: 'Test product',
    stockKg: 100,
    lowStockThresholdKg: 10,
  };
  return Product.create({ ...defaults, ...overrides });
};

/**
 * Create a test customer (direct model insert, no hashing bypass needed — model handles it).
 */
export const createCustomer = async (overrides = {}) => {
  const defaults = {
    username: `customer_${Date.now()}`,
    email: `customer_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test Customer',
    role: 'customer',
  };
  return Customer.create({ ...defaults, ...overrides });
};

/**
 * Create a test delivery staff member.
 */
export const createDeliveryStaff = async (overrides = {}) => {
  const defaults = {
    name: 'Test Driver',
    phone: '9876543210',
    isActive: true,
  };
  return DeliveryStaff.create({ ...defaults, ...overrides });
};

/**
 * Create a fully-formed order with price snapshots.
 */
export const createOrder = async (customerId, product, overrides = {}) => {
  const rawMaterialPriceSnapshot = product.rawMaterialPricePerKg;
  const grindingChargeSnapshot = product.grindingChargePerKg;
  const quantity = 2;
  const orderType = ORDER_TYPES.BUY_AND_SERVICE;
  const itemTotal = quantity * (rawMaterialPriceSnapshot + grindingChargeSnapshot);

  const defaults = {
    customerId,
    items: [
      {
        productId: product._id,
        productName: product.name,
        quantity,
        grindType: GRIND_TYPES.FINE,
        orderType,
        rawMaterialPriceSnapshot,
        grindingChargeSnapshot,
        itemTotal,
      },
    ],
    deliveryAddress: {
      name: 'Test Customer',
      phone: '9876543210',
      streetType: 'Center',
      houseName: 'Test House',
      doorNo: '10',
      landmark: 'Near School',
    },
    deliveryType: DELIVERY_TYPES.DELIVERY,
    totalAmount: itemTotal,
    status: ORDER_STATUS.PENDING,
  };

  return Order.create({ ...defaults, ...overrides });
};
