import {
  createDeliveryStaff,
  getAllDeliveryStaff,
  getDeliveryStaffById,
  updateDeliveryStaff,
  toggleDeliveryStaffStatus,
  countStaffDeliveries
} from '../services/deliveryStaffService.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Get all delivery staff
 * GET /api/delivery-staff
 */
export const getDeliveryStaff = async (req, res) => {
  try {
    const staff = await getAllDeliveryStaff();
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: staff
    });
  } catch (error) {
    logger.error('Error fetching delivery staff', { error: error.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch delivery staff. Please try again.'
      }
    });
  }
};

/**
 * Create new delivery staff
 * POST /api/delivery-staff
 */
export const addDeliveryStaff = async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const staff = await createDeliveryStaff({ name, phone });
    
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: staff,
      message: 'Delivery staff added successfully'
    });
  } catch (error) {
    logger.error('Error creating delivery staff', { error: error.message, requestId: req.requestId });
    
    // Handle duplicate phone number error
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Phone number already exists'
        }
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to add delivery staff. Please try again.'
      }
    });
  }
};

/**
 * Update delivery staff
 * PUT /api/delivery-staff/:id
 */
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const staff = await updateDeliveryStaff(id, updateData);
    
    if (!staff) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Delivery staff not found'
        }
      });
    }
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: staff,
      message: 'Delivery staff updated successfully'
    });
  } catch (error) {
    logger.error('Error updating delivery staff', { error: error.message, requestId: req.requestId });
    
    // Handle duplicate phone number error
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Phone number already exists'
        }
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update delivery staff. Please try again.'
      }
    });
  }
};

/**
 * Toggle delivery staff active status
 * PATCH /api/delivery-staff/:id/toggle
 */
export const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const staff = await toggleDeliveryStaffStatus(id);
    
    if (!staff) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Delivery staff not found'
        }
      });
    }
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: staff,
      message: `Delivery staff ${staff.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    logger.error('Error toggling staff status', { error: error.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update staff status. Please try again.'
      }
    });
  }
};

/**
 * Get delivery count for a staff member
 * GET /api/delivery-staff/:id/deliveries
 */
export const getStaffDeliveryCount = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if staff exists
    const staff = await getDeliveryStaffById(id);
    if (!staff) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Delivery staff not found'
        }
      });
    }
    
    const deliveryCount = await countStaffDeliveries(id);
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        staffId: id,
        staffName: staff.name,
        deliveryCount
      }
    });
  } catch (error) {
    logger.error('Error fetching delivery count', { error: error.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch delivery count. Please try again.'
      }
    });
  }
};
