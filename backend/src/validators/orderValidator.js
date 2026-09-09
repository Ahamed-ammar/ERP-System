import Joi from 'joi';
import { ORDER_TYPES, GRIND_TYPES, STREET_TYPES, ORDER_STATUS, DELIVERY_TYPES } from '../config/constants.js';

/**
 * Validation schema for order creation
 */
export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            'string.pattern.base': 'Invalid product ID format',
            'any.required': 'Product ID is required'
          }),
        quantity: Joi.number()
          .positive()
          .min(0.1)
          .required()
          .messages({
            'number.positive': 'Quantity must be greater than 0',
            'number.min': 'Quantity must be at least 0.1 kg',
            'any.required': 'Quantity is required'
          }),
        grindType: Joi.string()
          .valid(...Object.values(GRIND_TYPES))
          .required()
          .messages({
            'any.only': 'Grind type must be Fine, Medium, or Coarse',
            'any.required': 'Grind type is required'
          }),
        orderType: Joi.string()
          .valid(...Object.values(ORDER_TYPES))
          .required()
          .messages({
            'any.only': 'Order type must be either "serviceOnly" or "buyAndService"',
            'any.required': 'Order type is required for each item'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Order must have at least one item',
      'any.required': 'Items are required'
    }),

  // Phase 2B: Customer can now choose Pickup or Delivery
  // Defaults to Delivery if not provided (backward compatible)
  deliveryType: Joi.string()
    .valid(...Object.values(DELIVERY_TYPES))
    .optional()
    .default(DELIVERY_TYPES.DELIVERY)
    .messages({
      'any.only': 'Delivery type must be Pickup or Delivery'
    }),

  deliveryAddress: Joi.when('deliveryType', {
    is: DELIVERY_TYPES.PICKUP,
    // For Pickup, address is fully optional — customer comes to the mill
    then: Joi.object({
      name: Joi.string().trim().optional().allow(''),
      phone: Joi.string().trim().pattern(/^[0-9]{10}$/).optional().allow('').messages({
        'string.pattern.base': 'Phone number must be 10 digits'
      }),
      streetType: Joi.string().valid(...Object.values(STREET_TYPES)).optional().allow(''),
      houseName: Joi.string().trim().optional().allow(''),
      doorNo: Joi.string().trim().optional().allow(''),
      landmark: Joi.string().trim().allow('').optional()
    }).optional().default({}),
    // For Delivery (default), full address is required
    otherwise: Joi.object({
      name: Joi.string().trim().required().messages({ 'any.required': 'Name is required' }),
      phone: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
        'string.pattern.base': 'Phone number must be 10 digits',
        'any.required': 'Phone number is required'
      }),
      streetType: Joi.string().valid(...Object.values(STREET_TYPES)).required().messages({
        'any.only': 'Street type must be Center, Top, or Down side',
        'any.required': 'Street type is required'
      }),
      houseName: Joi.string().trim().required().messages({ 'any.required': 'House name is required' }),
      doorNo: Joi.string().trim().required().messages({ 'any.required': 'Door number is required' }),
      landmark: Joi.string().trim().allow('').optional()
    }).required()
  })
});

/**
 * Validation schema for order status update
 */
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .required()
    .messages({
      'any.only': 'Invalid order status',
      'any.required': 'Status is required'
    })
});

/**
 * Validation schema for order ID parameter
 */
export const orderIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID format'
    })
});

/**
 * Validation schema for order filters
 */
export const orderFiltersSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .optional(),
  startDate: Joi.date()
    .iso()
    .optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  deliveryType: Joi.string()
    .optional(),
  page: Joi.number()
    .integer()
    .min(1)
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
});

/**
 * Middleware to validate request body
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      });
    }
    
    req.body = value;
    next();
  };
};

/**
 * Middleware to validate request params
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      });
    }
    
    req.params = value;
    next();
  };
};

/**
 * Middleware to validate request query
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      });
    }
    
    req.query = value;
    next();
  };
};

/**
 * Validation schema for assigning delivery staff
 */
export const assignStaffSchema = Joi.object({
  deliveryStaffId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid delivery staff ID format',
      'any.required': 'Delivery staff ID is required'
    })
});
