import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

// Customer Pages
import HomePage from './pages/customer/HomePage';
import LoginPage from './pages/customer/LoginPage';
import SignupPage from './pages/customer/SignupPage';
import OrderTypePage from './pages/customer/OrderTypePage';
import ProductSelectionPage from './pages/customer/ProductSelectionPage';
import ProductDetailsPage from './pages/customer/ProductDetailsPage';
import AddressPage from './pages/customer/AddressPage';
import ReviewPage from './pages/customer/ReviewPage';
import SuccessPage from './pages/customer/SuccessPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import ProfilePage from './pages/customer/ProfilePage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import OrderManagementPage from './pages/admin/OrderManagementPage';
import ProductManagementPage from './pages/admin/ProductManagementPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import ReportsPage from './pages/admin/ReportsPage';
import AiPhoneOrderPage from './pages/admin/AiPhoneOrderPage';

// Navigation Components
import BottomNav from './components/common/BottomNav';
import AdminNav from './components/admin/AdminNav';

function App() {
  return (
    <>
      <AdminNav />
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/product/:id" element={<ProductDetailsPage />} />
      <Route
        path="/order/type"
        element={
          <ProtectedRoute>
            <OrderTypePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/products"
        element={
          <ProtectedRoute>
            <ProductSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/address"
        element={
          <ProtectedRoute>
            <AddressPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/review"
        element={
          <ProtectedRoute>
            <ReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/success"
        element={
          <ProtectedRoute>
            <SuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrderHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <DashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <OrderManagementPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <AdminRoute>
            <ProductManagementPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <AdminRoute>
            <StaffManagementPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminRoute>
            <ReportsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ai-phone-orders"
        element={
          <AdminRoute>
            <AiPhoneOrderPage />
          </AdminRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <BottomNav />
    </>
  );
}

export default App;
