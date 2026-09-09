import Order from '../models/Order.js';
import { ORDER_STATUS, DELIVERY_TYPES } from '../config/constants.js';

/**
 * Get the start and end of today in UTC
 */
const getTodayRange = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return { startOfDay, endOfDay };
};

/**
 * Get the date range for the last N days
 */
const getLastNDaysRange = (days) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);
  
  return { startDate, endDate };
};

/**
 * Count orders for today
 */
export const countOrdersToday = async () => {
  const { startOfDay, endOfDay } = getTodayRange();
  
  const count = await Order.countDocuments({
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
  
  return count;
};

/**
 * Calculate revenue for today
 */
export const calculateRevenueToday = async () => {
  const { startOfDay, endOfDay } = getTodayRange();
  
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: { $ne: ORDER_STATUS.CANCELLED }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].totalRevenue : 0;
};

/**
 * Count pending orders
 */
export const countPendingOrders = async () => {
  const count = await Order.countDocuments({
    status: ORDER_STATUS.PENDING
  });
  
  return count;
};

/**
 * Get order counts for last 7 days
 */
export const getOrderCountsLast7Days = async () => {
  const { startDate, endDate } = getLastNDaysRange(7);
  
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  // Create array with all 7 days, filling in zeros for days with no orders
  const orderCounts = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const dayData = result.find(r => r._id === dateString);
    orderCounts.push({
      date: dateString,
      count: dayData ? dayData.count : 0
    });
  }
  
  return orderCounts;
};

/**
 * Get revenue for last 7 days
 */
export const getRevenueLast7Days = async () => {
  const { startDate, endDate } = getLastNDaysRange(7);
  
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        },
        status: { $ne: ORDER_STATUS.CANCELLED }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        revenue: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  // Create array with all 7 days, filling in zeros for days with no revenue
  const revenueData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const dayData = result.find(r => r._id === dateString);
    revenueData.push({
      date: dateString,
      revenue: dayData ? dayData.revenue : 0
    });
  }
  
  return revenueData;
};

/**
 * Calculate most ordered products
 */
export const getMostOrderedProducts = async (limit = 5) => {
  const result = await Order.aggregate([
    {
      $match: {
        status: { $ne: ORDER_STATUS.CANCELLED }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        totalQuantity: { $sum: '$items.quantity' },
        orderCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalQuantity: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        productName: 1,
        totalQuantity: 1,
        orderCount: 1
      }
    }
  ]);
  
  return result;
};

/**
 * Calculate pickup vs delivery percentage
 */
export const getPickupVsDeliveryPercentage = async () => {
  const result = await Order.aggregate([
    {
      $match: {
        status: { $ne: ORDER_STATUS.CANCELLED }
      }
    },
    {
      $group: {
        _id: '$deliveryType',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalOrders = result.reduce((sum, item) => sum + item.count, 0);
  
  if (totalOrders === 0) {
    return {
      pickup: 0,
      delivery: 0,
      total: 0
    };
  }
  
  const pickupCount = result.find(r => r._id === DELIVERY_TYPES.PICKUP)?.count || 0;
  const deliveryCount = result.find(r => r._id === DELIVERY_TYPES.DELIVERY)?.count || 0;
  
  return {
    pickup: Math.round((pickupCount / totalOrders) * 100),
    delivery: Math.round((deliveryCount / totalOrders) * 100),
    total: totalOrders,
    pickupCount,
    deliveryCount
  };
};

/**
 * Get revenue for a specific date range
 */
export const getRevenueByDateRange = async (startDate, endDate) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: start,
          $lte: end
        },
        status: { $ne: ORDER_STATUS.CANCELLED }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        revenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        revenue: 1,
        orderCount: 1
      }
    }
  ]);
  
  return result;
};

/**
 * ─────────────────────────────────────────────
 * Phase 3 — Enhanced Analytics
 * ─────────────────────────────────────────────
 */

/**
 * Monthly comparison — current month vs previous month
 * Returns orders, revenue, and % change for both months
 */
export const getMonthlyComparison = async () => {
  const now = new Date();

  // Current month
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Previous month
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const pipeline = (start, end) => [
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: { $ne: ORDER_STATUS.CANCELLED },
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
  ];

  const [current, previous] = await Promise.all([
    Order.aggregate(pipeline(currentStart, currentEnd)),
    Order.aggregate(pipeline(prevStart,    prevEnd)),
  ]);

  const cur = current[0]  || { revenue: 0, orders: 0 };
  const prev = previous[0] || { revenue: 0, orders: 0 };

  const revenueChange = prev.revenue > 0
    ? Math.round(((cur.revenue - prev.revenue) / prev.revenue) * 100)
    : cur.revenue > 0 ? 100 : 0;

  const ordersChange = prev.orders > 0
    ? Math.round(((cur.orders - prev.orders) / prev.orders) * 100)
    : cur.orders > 0 ? 100 : 0;

  return {
    current:  { revenue: cur.revenue,  orders: cur.orders  },
    previous: { revenue: prev.revenue, orders: prev.orders },
    revenueChange,
    ordersChange,
    currentMonth:  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    previousMonth: `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`,
  };
};

/**
 * Grind type breakdown across all non-cancelled orders
 * Returns Fine / Medium / Coarse totals (kg + order count)
 */
export const getGrindTypeBreakdown = async (startDate, endDate) => {
  const matchStage = { status: { $ne: ORDER_STATUS.CANCELLED } };
  if (startDate && endDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);
    matchStage.createdAt = { $gte: start, $lte: end };
  }

  const result = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.grindType',
        totalKg:    { $sum: '$items.quantity' },
        orderCount: { $sum: 1 },
        revenue:    { $sum: '$items.itemTotal' },
      },
    },
    { $sort: { totalKg: -1 } },
  ]);

  const totalKg = result.reduce((s, r) => s + r.totalKg, 0);
  return result.map(r => ({
    grindType:  r._id,
    totalKg:    r.totalKg,
    orderCount: r.orderCount,
    revenue:    r.revenue,
    percentage: totalKg > 0 ? Math.round((r.totalKg / totalKg) * 100) : 0,
  }));
};

/**
 * Order type breakdown — serviceOnly vs buyAndService
 * Returns quantities, order counts, and revenue contribution for each type
 */
export const getOrderTypeBreakdown = async (startDate, endDate) => {
  const matchStage = { status: { $ne: ORDER_STATUS.CANCELLED } };
  if (startDate && endDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);
    matchStage.createdAt = { $gte: start, $lte: end };
  }

  const result = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.orderType',
        totalKg:    { $sum: '$items.quantity' },
        orderCount: { $sum: 1 },
        revenue:    { $sum: '$items.itemTotal' },
      },
    },
  ]);

  const totalRevenue = result.reduce((s, r) => s + r.revenue, 0);
  return result.map(r => ({
    orderType:  r._id,
    label:      r._id === 'buyAndService' ? 'Buy & Service' : 'Service Only',
    totalKg:    r.totalKg,
    orderCount: r.orderCount,
    revenue:    r.revenue,
    revenueShare: totalRevenue > 0 ? Math.round((r.revenue / totalRevenue) * 100) : 0,
  }));
};

/**
 * Delivery staff performance
 * Returns orders assigned, completed, and cancellation rate per staff member
 */
export const getDeliveryStaffPerformance = async () => {
  const result = await Order.aggregate([
    {
      $match: {
        deliveryStaffId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$deliveryStaffId',
        totalAssigned: { $sum: 1 },
        delivered:     { $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0] } },
        cancelled:     { $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.CANCELLED] }, 1, 0] } },
        totalRevenue:  {
          $sum: {
            $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, '$totalAmount', 0],
          },
        },
      },
    },
    {
      $lookup: {
        from:         'deliverystaffs',
        localField:   '_id',
        foreignField: '_id',
        as:           'staff',
      },
    },
    { $unwind: { path: '$staff', preserveNullAndEmpty: true } },
    {
      $project: {
        _id: 0,
        staffId:       '$_id',
        staffName:     { $ifNull: ['$staff.name',  'Unknown'] },
        staffPhone:    { $ifNull: ['$staff.phone', '—'] },
        totalAssigned: 1,
        delivered:     1,
        cancelled:     1,
        totalRevenue:  1,
        completionRate: {
          $cond: [
            { $gt: ['$totalAssigned', 0] },
            { $round: [{ $multiply: [{ $divide: ['$delivered', '$totalAssigned'] }, 100] }, 0] },
            0,
          ],
        },
      },
    },
    { $sort: { totalAssigned: -1 } },
  ]);

  return result;
};

/**
 * Enhanced CSV export — includes product, order type, and delivery type columns
 */
export const getEnhancedExportData = async (startDate, endDate) => {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    createdAt: { $gte: start, $lte: end },
    status:    { $ne: ORDER_STATUS.CANCELLED },
  })
    .sort({ createdAt: 1 })
    .select('createdAt totalAmount status deliveryType items')
    .lean();

  // Flatten to one row per order item
  const rows = [];
  for (const order of orders) {
    for (const item of order.items) {
      rows.push({
        date:         order.createdAt.toISOString().split('T')[0],
        orderId:      order._id.toString().slice(-8).toUpperCase(),
        product:      item.productName,
        quantity:     item.quantity,
        grindType:    item.grindType,
        orderType:    item.orderType === 'buyAndService' ? 'Buy & Service' : 'Service Only',
        deliveryType: order.deliveryType || 'Delivery',
        itemRevenue:  item.itemTotal,
        orderTotal:   order.totalAmount,
        status:       order.status,
      });
    }
  }

  return rows;
};
