import axiosInstance from './axiosConfig';

// Get all active products (public)
export const getProducts = async () => {
  const response = await axiosInstance.get('/products');
  return response.data.data.products || [];
};

// Get all products including inactive (admin only)
export const getAllProducts = async () => {
  const response = await axiosInstance.get('/products/admin/all');
  return response.data;
};

// Get product by ID (public)
export const getProductById = async (id) => {
  const response = await axiosInstance.get(`/products/${id}`);
  return response.data.data.product || null;
};

// Create product (admin only)
export const createProduct = async (productData) => {
  const config = {};
  
  // If productData is FormData, set appropriate headers
  if (productData instanceof FormData) {
    config.headers = {
      'Content-Type': 'multipart/form-data',
    };
  }
  
  const response = await axiosInstance.post('/products', productData, config);
  return response.data;
};

// Update product (admin only)
export const updateProduct = async (id, productData) => {
  const config = {};
  
  // If productData is FormData, set appropriate headers
  if (productData instanceof FormData) {
    config.headers = {
      'Content-Type': 'multipart/form-data',
    };
  }
  
  const response = await axiosInstance.put(`/products/${id}`, productData, config);
  return response.data;
};

// Enable/disable product (admin only)
export const toggleProductStatus = async (id) => {
  const response = await axiosInstance.patch(`/products/${id}/toggle`);
  return response.data;
};

// Update product stock level (admin only) — Phase 1
export const updateProductStock = async (id, stockKg, lowStockThresholdKg) => {
  const body = { stockKg };
  if (lowStockThresholdKg !== undefined) body.lowStockThresholdKg = lowStockThresholdKg;
  const response = await axiosInstance.patch(`/products/${id}/stock`, body);
  return response.data;
};

// Get products below their low-stock threshold (admin only) — Phase 1
export const getLowStockProducts = async () => {
  const response = await axiosInstance.get('/products/admin/low-stock');
  return response.data;
};

