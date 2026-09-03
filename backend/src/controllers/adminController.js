import * as analyticsService from '../services/analyticsService.js';
import { getLowStockProducts } from '../services/inventoryService.js';

/**
 * Get admin dashboard metrics
 * GET /api/admin/dashboard
 */
export const getDashboard = async (req, res, next) => {
  try {
    // Fetch all dashboard metrics in parallel
    const [
      ordersToday,
      revenueToday,
      pendingOrders,
      orderCountsLast7Days,
      revenueLast7Days,
      mostOrderedProducts,
      pickupVsDelivery,
      lowStockProducts,
    ] = await Promise.all([
      analyticsService.countOrdersToday(),
      analyticsService.calculateRevenueToday(),
      analyticsService.countPendingOrders(),
      analyticsService.getOrderCountsLast7Days(),
      analyticsService.getRevenueLast7Days(),
      analyticsService.getMostOrderedProducts(),
      analyticsService.getPickupVsDeliveryPercentage(),
      getLowStockProducts(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ordersToday,
        revenueToday,
        pendingOrders,
        orderCountsLast7Days,
        revenueLast7Days,
        mostOrderedProducts,
        pickupVsDelivery,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue analytics with date filtering
 * GET /api/admin/analytics/revenue
 */
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date and end date are required'
        }
      });
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date format. Use YYYY-MM-DD'
        }
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date must be before or equal to end date'
        }
      });
    }

    const revenueData = await analyticsService.getRevenueByDateRange(startDate, endDate);

    // Also get most ordered products and pickup vs delivery stats
    const [mostOrderedProducts, pickupVsDelivery] = await Promise.all([
      analyticsService.getMostOrderedProducts(),
      analyticsService.getPickupVsDeliveryPercentage()
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenueData,
        mostOrderedProducts,
        pickupVsDelivery
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export orders report as CSV
 * GET /api/admin/reports/export
 */
export const exportReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date and end date are required'
        }
      });
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date format. Use YYYY-MM-DD'
        }
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date must be before or equal to end date'
        }
      });
    }

    const revenueData = await analyticsService.getRevenueByDateRange(startDate, endDate);

    // Generate CSV content
    let csv = 'Date,Revenue,Order Count\n';
    revenueData.forEach(row => {
      csv += `${row.date},${row.revenue},${row.orderCount}\n`;
    });

    // Calculate totals
    const totalRevenue = revenueData.reduce((sum, row) => sum + row.revenue, 0);
    const totalOrders = revenueData.reduce((sum, row) => sum + row.orderCount, 0);
    csv += `\nTotal,${totalRevenue},${totalOrders}\n`;

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${startDate}-to-${endDate}.csv`);
    
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
