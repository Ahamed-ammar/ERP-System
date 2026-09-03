import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Resolve the correct MongoDB URI based on NODE_ENV.
 * - production: uses MONGODB_URI_PRODUCTION
 * - development / anything else: uses MONGODB_URI
 */
const getMongoURI = () => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    const uri = process.env.MONGODB_URI_PRODUCTION;
    if (!uri) {
      logger.error('MONGODB_URI_PRODUCTION is not set. Set it in your Render environment variables.');
      process.exit(1);
    }
    return uri;
  }
  return process.env.MONGODB_URI;
};

/**
 * Connect to MongoDB database with retry logic
 */
const connectDB = async () => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(getMongoURI(), {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info('MongoDB connected', {
        host: conn.connection.host,
        env: process.env.NODE_ENV || 'development',
      });

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected — attempting to reconnect');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return conn;
    } catch (error) {
      retries++;
      logger.error('MongoDB connection attempt failed', {
        attempt: retries,
        maxRetries,
        error: error.message,
      });

      if (retries >= maxRetries) {
        logger.error('Max retries reached — could not connect to MongoDB');
        process.exit(1);
      }

      logger.info(`Retrying in ${retryDelay / 1000}s`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

/**
 * Gracefully close database connection
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message });
    throw error;
  }
};

export { connectDB, closeDB };
