import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { uploadProductImage, handleUploadError } from '../middleware/uploadMiddleware.js';
import {
  validateProductId,
  validateCreateProduct,
  validateUpdateProduct
} from '../validators/productValidator.js';

const router = express.Router();

/**
 * Admin routes (authentication + admin role required)
 * IMPORTANT: Must be declared BEFORE /:id to avoid Express matching
 * "admin" as a product ID and returning a validation error.
 */

// GET /api/products/admin/all - Get all products including inactive (admin only)
router.get('/admin/all', authenticate, requireAdmin, productController.getAllProducts);

/**
 * Public routes (no authentication required)
 */

// GET /api/products - Get all active products for customers
router.get('/', productController.getActiveProducts);

// GET /api/products/:id - Get single product by ID
router.get('/:id', validateProductId, productController.getProductById);

// POST /api/products - Create new product (admin only)
router.post(
  '/',
  authenticate,
  requireAdmin,
  uploadProductImage,
  handleUploadError,
  validateCreateProduct,
  productController.createProduct
);

// PUT /api/products/:id - Update product (admin only)
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  uploadProductImage,
  handleUploadError,
  validateProductId,
  validateUpdateProduct,
  productController.updateProduct
);

// PATCH /api/products/:id/toggle - Toggle product active status (admin only)
router.patch(
  '/:id/toggle',
  authenticate,
  requireAdmin,
  validateProductId,
  productController.toggleProductStatus
);

export default router;
