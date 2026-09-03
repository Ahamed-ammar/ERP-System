import * as productService from '../services/productService.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import path from 'path';
import fs from 'fs';
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
      data: {
        products,
        count: products.length
      }
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch products'
      }
    });
  }
};

/**
 * Get all products (admin endpoint - includes inactive products)
 * GET /api/products/all
 */
export const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(false);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        products,
        count: products.length
      }
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch products'
      }
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
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        product
      }
    });
  } catch (error) {
    if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
    
    if (error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch product'
      }
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
    
    // Add image URL if file was uploaded
    if (req.file) {
      productData.imageUrl = `/uploads/products/${req.file.filename}`;
    }
    
    const product = await productService.createProduct(productData);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        product
      },
      message: 'Product created successfully'
    });
  } catch (error) {
    // Clean up uploaded file if product creation fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.warn('Error deleting uploaded file after create failure', { error: unlinkError.message });
      }
    }
    
    if (error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create product'
      }
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
    
    // Get existing product to handle image replacement
    const existingProduct = await productService.getProductById(id);
    
    // Add new image URL if file was uploaded
    if (req.file) {
      updateData.imageUrl = `/uploads/products/${req.file.filename}`;
      
      // Delete old image file if it exists
      if (existingProduct.imageUrl) {
        const oldImagePath = path.join('uploads/products', path.basename(existingProduct.imageUrl));
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (unlinkError) {
          logger.warn('Error deleting old image file', { error: unlinkError.message });
        }
      }
    }
    
    const product = await productService.updateProduct(id, updateData);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        product
      },
      message: 'Product updated successfully'
    });
  } catch (error) {
    // Clean up uploaded file if product update fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.warn('Error deleting uploaded file after update failure', { error: unlinkError.message });
      }
    }
    
    if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
    
    if (error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update product'
      }
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
      data: {
        product
      },
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
    
    if (error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to toggle product status'
      }
    });
  }
};
