import Customer from '../models/Customer.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Get customer profile
 * GET /api/customer/profile
 */
export const getCustomerProfile = async (req, res) => {
  try {
    const customerId = req.user.userId;

    const customer = await Customer.findById(customerId).select('-__v');

    if (!customer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Customer profile not found'
        }
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: customer
    });
  } catch (error) {
    logger.error('Error fetching customer profile', { error: error.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch profile. Please try again.'
      }
    });
  }
};

/**
 * Update customer profile (address information)
 * PUT /api/customer/profile
 */
export const updateCustomerProfile = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { name, streetType, houseName, doorNo, landmark } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Customer profile not found'
        }
      });
    }

    // Update fields if provided
    if (name !== undefined) customer.name = name;
    if (streetType !== undefined) customer.streetType = streetType;
    if (houseName !== undefined) customer.houseName = houseName;
    if (doorNo !== undefined) customer.doorNo = doorNo;
    if (landmark !== undefined) customer.landmark = landmark;

    await customer.save();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: customer,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Error updating customer profile', { error: error.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update profile. Please try again.'
      }
    });
  }
};
