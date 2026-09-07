import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { customerLogin, adminLogin } from '../../api/authApi';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = 'Username or email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Check if this is an admin login attempt (username is 'admin')
      const isAdminLogin = formData.usernameOrEmail.toLowerCase() === 'admin';
      
      if (isAdminLogin) {
        // Use admin login endpoint
        const data = await adminLogin(formData.usernameOrEmail, formData.password);
        
        // Store JWT token and admin data
        login(data.data.token, { ...data.data.admin, role: 'admin' });
        
        toast.success('Admin login successful!');
        navigate('/admin/dashboard');
      } else {
        // Use customer login endpoint
        const data = await customerLogin(formData.usernameOrEmail, formData.password);
        
        // Store JWT token and user data
        login(data.data.token, data.data.customer);
        
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username or Email */}
          <div>
            <label htmlFor="usernameOrEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Username or Email
            </label>
            <input
              type="text"
              id="usernameOrEmail"
              name="usernameOrEmail"
              autoComplete="username"
              value={formData.usernameOrEmail}
              onChange={handleChange}
              placeholder="Enter username or email"
              className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                errors.usernameOrEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{ fontSize: '16px' }}
              disabled={loading}
              autoFocus
            />
            {errors.usernameOrEmail && (
              <p className="mt-2 text-sm text-red-600">{errors.usernameOrEmail}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{ fontSize: '16px' }}
              disabled={loading}
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !formData.usernameOrEmail || !formData.password}
            className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-amber-600 hover:text-amber-700 font-medium">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
