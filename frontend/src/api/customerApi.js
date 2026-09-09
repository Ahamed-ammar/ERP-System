import axiosInstance from './axiosConfig';

// Get customer profile
export const getCustomerProfile = async () => {
  const response = await axiosInstance.get('/customer/profile');
  return response.data;
};

// Update customer profile
export const updateCustomerProfile = async (profileData) => {
  const response = await axiosInstance.put('/customer/profile', profileData);
  return response.data;
};

// Get customer order history — supports pagination (Phase 2C)
export const getCustomerOrders = async (page = 1, limit = 10) => {
  const response = await axiosInstance.get('/customer/orders', { params: { page, limit } });
  return response.data;
};

// Cancel pending order
export const cancelOrder = async (id) => {
  const response = await axiosInstance.put(`/customer/orders/${id}/cancel`);
  return response.data;
};
