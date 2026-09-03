import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import deliveryStaffRoutes from './routes/deliveryStaffRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger from './utils/logger.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow any localhost port in development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }

    // Allow any Vercel preview/production deployment
    if (origin.match(/https:\/\/.*\.vercel\.app$/)) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Structured request logging (attach request ID + log HTTP traffic)
app.use(requestLogger);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// General rate limiting for all API routes
app.use('/api', generalLimiter);

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Flour & Spice Mill API is running', version: '1.0.0' });
});

// Health check — lightweight liveness probe (no DB check)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Readiness probe — checks DB connectivity
// Use this for deep health checks (Render startup checks, monitoring)
app.get('/health/ready', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (dbState === 1) {
    return res.json({ status: 'ok', db: 'connected' });
  }
  logger.warn('Readiness check failed — DB not connected', { dbState });
  return res.status(503).json({
    status: 'unavailable',
    db: dbState === 2 ? 'connecting' : 'disconnected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/delivery-staff', deliveryStaffRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
