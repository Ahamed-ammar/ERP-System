import axiosInstance from './axiosConfig';

// Get admin dashboard metrics
export const getDashboardMetrics = async () => {
  const response = await axiosInstance.get('/admin/dashboard');
  return response.data;
};

// Get revenue analytics
export const getRevenueAnalytics = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/analytics/revenue', { params: filters });
  return response.data;
};

// Export basic CSV report
export const exportReport = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/reports/export', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

// Phase 3 — Enhanced analytics

export const getMonthlyComparison = async () => {
  const response = await axiosInstance.get('/admin/analytics/monthly-comparison');
  return response.data;
};

export const getGrindBreakdown = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/analytics/grind-breakdown', { params: filters });
  return response.data;
};

export const getOrderTypeBreakdown = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/analytics/order-type-breakdown', { params: filters });
  return response.data;
};

export const getStaffPerformance = async () => {
  const response = await axiosInstance.get('/admin/analytics/staff-performance');
  return response.data;
};

export const exportEnhancedReport = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/reports/export-enhanced', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
