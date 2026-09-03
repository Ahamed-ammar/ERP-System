import { customerRegister, customerLogin, customerLoginOrRegister, adminLogin } from '../services/authService.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Customer registration controller
 * POST /api/auth/customer/register
 */
export const customerRegisterController = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    const result = await customerRegister({ username, email, password, name });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Account created successfully',
      data: {
        customer: result.customer,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Customer registration error', { error: error.message, requestId: req.requestId });
    
    if (error.code === ERROR_CODES.DUPLICATE_ENTRY) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.DUPLICATE_ENTRY,
          message: error.message
        }
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message || 'Registration failed'
      }
    });
  }
};

/**
 * Customer login controller
 * POST /api/auth/customer/login
 */
export const customerLoginController = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    const result = await customerLogin({ usernameOrEmail, password });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login successful',
      data: {
        customer: result.customer,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Customer login error', { error: error.message, requestId: req.requestId });
    
    if (error.code === ERROR_CODES.INVALID_CREDENTIALS) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Invalid username/email or password'
        }
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Login failed'
      }
    });
  }
};

/**
 * Legacy: Customer login/register controller (phone-based)
 * POST /api/auth/customer/login-phone
 */
export const customerAuth = async (req, res) => {
  try {
    const { phone, name } = req.body;

    const result = await customerLoginOrRegister({ phone, name });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.isNewCustomer 
        ? 'Account created successfully' 
        : 'Login successful',
      data: {
        customer: result.customer,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Customer phone auth error', { error: error.message, requestId: req.requestId });
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message || 'Authentication failed'
      }
    });
  }
};

/**
 * Admin login controller
 * POST /api/auth/admin/login
 */
export const adminAuth = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await adminLogin({ username, password });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: result.admin,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Admin auth error', { error: error.message, requestId: req.requestId });
    
    // Handle invalid credentials specifically
    if (error.code === ERROR_CODES.INVALID_CREDENTIALS) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Invalid username or password'
        }
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Authentication failed'
      }
    });
  }
};

/**
 * Verify token controller
 * POST /api/auth/verify
 */
export const verifyAuth = async (req, res) => {
  try {
    // If we reach here, the authenticate middleware has already verified the token
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Token verification error', { error: error.message, requestId: req.requestId });
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Verification failed'
      }
    });
  }
};
