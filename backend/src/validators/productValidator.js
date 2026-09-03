import Joi from 'joi';
import mongoose from 'mongoose';

/**
 * Validation schema for creating a product
 */
export const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .required()
    .min(1)
    .max(100)
    .messages({
      'string.empty': 'Product name is required',
      'string.min': 'Product name must be at least 1 character',
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required'
    }),
  
  rawMaterialPricePerKg: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Raw material price must be a number',
      'number.min': 'Raw material price cannot be negative',
      'any.required': 'Raw material price per kg is required'
    }),
  
  grindingChargePerKg: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Grinding charge must be a number',
      'number.min': 'Grinding charge cannot be negative',
      'any.required': 'Grinding charge per kg is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

/**
 * Validation schema for updating a product
 */
export const updateProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Product name cannot be empty',
      'string.min': 'Product name must be at least 1 character',
      'string.max': 'Product name cannot exceed 100 characters'
    }),
  
  rawMaterialPricePerKg: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Raw material price must be a number',
      'number.min': 'Raw material price cannot be negative'
    }),
  
  grindingChargePerKg: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Grinding charge must be a number',
      'number.min': 'Grinding charge cannot be negative'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validate MongoDB ObjectId format
 * @param {String} id - ID to validate
 * @returns {Boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Middleware to validate product ID parameter
 */
export const validateProductId = (req, res, next) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid product ID format'
      }
    });
  }
  
  next();
};

/**
 * Middleware to validate create product request
 */
export const validateCreateProduct = (req, res, next) => {
  const { error } = createProductSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    });
  }
  
  next();
};

/**
 * Middleware to validate update product request
 */
export const validateUpdateProduct = (req, res, next) => {
  const { error } = updateProductSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    });
  }
  
  next();
};

/**
 * Validation schema for updating product stock — Phase 1
 */
export const updateStockSchema = Joi.object({
  stockKg: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Stock must be a number',
      'number.min': 'Stock cannot be negative',
      'any.required': 'stockKg is required'
    }),

  lowStockThresholdKg: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Low stock threshold must be a number',
      'number.min': 'Low stock threshold cannot be negative'
    })
});

/**
 * Middleware to validate stock update request
 */
export const validateUpdateStock = (req, res, next) => {
  const { error } = updateStockSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(d => d.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    });
  }

  next();
};
