import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import logger from './src/utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to database and start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    logger.info('Server started', {
      env: process.env.NODE_ENV,
      port: PORT,
    });
  });

  // Graceful shutdown: stop accepting new connections and finish in-flight requests
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds if requests haven't drained
    setTimeout(() => {
      logger.warn('Forcing shutdown after 10s drain timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

}).catch((error) => {
  logger.error('Failed to connect to database', { error: error.message });
  process.exit(1);
});
