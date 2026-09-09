import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(adminLimiter);

// Existing routes
router.get('/dashboard',            authenticate, requireAdmin, adminController.getDashboard);
router.get('/analytics/revenue',    authenticate, requireAdmin, adminController.getRevenueAnalytics);
router.get('/reports/export',       authenticate, requireAdmin, adminController.exportReport);

// Phase 3 — Enhanced analytics routes
router.get('/analytics/monthly-comparison',    authenticate, requireAdmin, adminController.getMonthlyComparison);
router.get('/analytics/grind-breakdown',       authenticate, requireAdmin, adminController.getGrindBreakdown);
router.get('/analytics/order-type-breakdown',  authenticate, requireAdmin, adminController.getOrderTypeBreakdown);
router.get('/analytics/staff-performance',     authenticate, requireAdmin, adminController.getStaffPerformance);
router.get('/reports/export-enhanced',         authenticate, requireAdmin, adminController.exportEnhancedReport);

export default router;
