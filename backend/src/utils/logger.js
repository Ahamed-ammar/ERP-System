/**
 * Structured logger utility
 *
 * Emits JSON log lines in production for easy parsing by log aggregators.
 * Falls back to readable format in development.
 *
 * Usage:
 *   import logger from '../utils/logger.js';
 *   logger.info('Order created', { orderId, customerId });
 *   logger.error('DB error', { error: err.message });
 *
 * NEVER log: passwords, JWT tokens, API secrets, full user PII.
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = isDevelopment ? LEVELS.debug : LEVELS.info;

const formatDev = (level, message, meta) => {
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${ts}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}`;
};

const formatProd = (level, message, meta) => {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  });
};

const log = (level, message, meta = {}) => {
  if (LEVELS[level] < MIN_LEVEL) return;

  const line = isDevelopment
    ? formatDev(level, message, meta)
    : formatProd(level, message, meta);

  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
};

const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info:  (message, meta) => log('info',  message, meta),
  warn:  (message, meta) => log('warn',  message, meta),
  error: (message, meta) => log('error', message, meta),
};

export default logger;
