import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Map error codes to HTTP status codes
 */
const errorStatusMap = {
  // Authentication errors (401)
  [ERROR_CODES.INVALID_TOKEN]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.UNAUTHORIZED]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
  
  // Authorization errors (403)
  [ERROR_CODES.FORBIDDEN]: HTTP_STATUS.FORBIDDEN,
  [ERROR_CODES.INVALID_ROLE]: HTTP_STATUS.FORBIDDEN,
  
  // Validation errors (400)
  [ERROR_CODES.VALIDATION_ERROR]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.INVALID_ORDER_TYPE]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: HTTP_STATUS.BAD_REQUEST,
  
  // Resource errors (404)
  [ERROR_CODES.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.PRODUCT_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.ORDER_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.CUSTOMER_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  
  // Business logic errors (422)
  [ERROR_CODES.INVALID_STATUS_TRANSITION]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ERROR_CODES.PRODUCT_INACTIVE]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ERROR_CODES.CANNOT_CANCEL_ORDER]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ERROR_CODES.EMPTY_CART]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ERROR_CODES.STAFF_INACTIVE]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  
  // Server errors (500)
  [ERROR_CODES.INTERNAL_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ERROR_CODES.DATABASE_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
    this.statusCode = errorStatusMap[code] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Catches all errors and returns consistent error response format
 */
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging (but don't expose to client)
  logger.error('Unhandled error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    errorCode: err.code,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: Object.values(err.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      }
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid ID format'
      }
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `${field} already exists`
      }
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Token expired'
      }
    });
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
  }

  // Handle unknown errors - don't expose internal details
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'An unexpected error occurred'
    }
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
