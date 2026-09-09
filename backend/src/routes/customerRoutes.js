import express from 'express';
import {
  getCustomerProfile,
  updateCustomerProfile
} from '../controllers/customerController.js';
import {
  getCustomerOrders,
  cancelOrder
} from '../controllers/orderController.js';
import { authenticate, requireCustomer } from '../middleware/authMiddleware.js';
import {
  validateBody,
  updateProfileSchema
} from '../validators/customerValidator.js';
import {
  validateParams,
  orderIdSchema
} from '../validators/orderValidator.js';

const router = express.Router();

// All customer routes require a valid customer JWT (not admin)
// authenticate verifies the token; requireCustomer ensures role === 'customer'

router.get(
  '/profile',
  authenticate,
  requireCustomer,
  getCustomerProfile
);

router.put(
  '/profile',
  authenticate,
  requireCustomer,
  validateBody(updateProfileSchema),
  updateCustomerProfile
);

router.get(
  '/orders',
  authenticate,
  requireCustomer,
  getCustomerOrders
);

router.put(
  '/orders/:id/cancel',
  authenticate,
  requireCustomer,
  validateParams(orderIdSchema),
  cancelOrder
);

export default router;
