import * as productService from '../services/productService.js';
import { setProductStock, getLowStockProducts } from '../services/inventoryService.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Get all active products (public endpoint for customers)
 * GET /api/products
 */
export const getActiveProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(true);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { products, count: products.length }
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch products' }
    });
  }
};

/**
 * Get all products including inactive (admin only)
 * GET /api/products/admin/all
 */
export const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(false);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { products, count: products.length }
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch products' }
    });
  }
};

/**
 * Get single product by ID
 * GET /api/products/:id
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: { product } });
  } catch (error) {
    if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    if (error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch product' }
    });
  }
};

/**
 * Create new product (admin only)
 * POST /api/products
 */
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Upload image to Cloudinary if provided
    if (req.file) {
      const { url } = await uploadImageToCloudinary(req.file.buffer, req.file.mimetype);
      productData.imageUrl = url;
      logger.info('Product image uploaded to Cloudinary', { url });
    }

    const product = await productService.createProduct(productData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: { product },
      message: 'Product created successfully'
    });
  } catch (error) {
    if (error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    logger.error('Error creating product', { error: error.message, requestId: req.requestId });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create product' }
    });
  }
};

/**
 * Update product (admin only)
 * PUT /api/products/:id
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Fetch existing product so we can delete the old Cloudinary image if needed
    const existingProduct = await productService.getProductById(id);

    if (req.file) {
      // Upload new image to Cloudinary
      const { url } = await uploadImageToCloudinary(req.file.buffer, req.file.mimetype);
      updateData.imageUrl = url;
      logger.info('Product image updated on Cloudinary', { url });

      // Delete old Cloudinary image (non-fatal if it fails)
      if (existingProduct.imageUrl) {
        await deleteImageFromCloudinary(existingProduct.imageUrl);
      }
    }

    const product = await productService.updateProduct(id, updateData);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { product },
      message: 'Product updated successfully'
    });
  } catch (error) {
    if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    if (error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    logger.error('Error updating product', { error: error.message, requestId: req.requestId });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update product' }
    });
  }
};

/**
 * Toggle product active status (admin only)
 * PATCH /api/products/:id/toggle
 */
export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.toggleProductStatus(id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { product },
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to toggle product status' }
    });
  }
};

/**
 * Update product stock level (admin only) — Phase 1
 * PATCH /api/products/:id/stock
 */
export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stockKg, lowStockThresholdKg } = req.body;

    const existing = await productService.getProductById(id);
    if (!existing) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: ERROR_CODES.PRODUCT_NOT_FOUND, message: 'Product not found' }
      });
    }

    const product = await setProductStock(id, stockKg, lowStockThresholdKg);

    logger.info('Product stock updated', {
      productId: id,
      productName: product.name,
      newStockKg: product.stockKg,
      updatedBy: req.user.userId,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { product },
      message: `Stock updated to ${product.stockKg} kg for "${product.name}"`
    });
  } catch (error) {
    if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    logger.error('Error updating product stock', { error: error.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update stock' }
    });
  }
};

/**
 * Get products below low-stock threshold (admin only) — Phase 1
 * GET /api/products/admin/low-stock
 */
export const getLowStockProductsController = async (req, res) => {
  try {
    const products = await getLowStockProducts();
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { products, count: products.length }
    });
  } catch (error) {
    logger.error('Error fetching low stock products', { error: error.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch low stock products' }
    });
  }
};
