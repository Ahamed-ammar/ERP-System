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

// Export CSV report
export const exportReport = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/reports/export', {
    params: filters,
    responseType: 'blob', // Important for file download
  });
  return response.data;
};
