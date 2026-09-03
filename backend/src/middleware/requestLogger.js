/**
 * Request logging middleware
 *
 * Attaches a unique request ID to every request and logs:
 *   - Incoming request (method, path)
 *   - Outgoing response (status, duration)
 *
 * The request ID is also sent back as the `X-Request-Id` response header
 * so frontend developers can correlate client errors with server logs.
 *
 * NEVER logs: Authorization headers, passwords, tokens, or request bodies
 * that may contain sensitive data.
 */

import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  // Attach a unique ID to the request
  const requestId = randomUUID();
  req.requestId = requestId;

  // Expose on response header for client correlation
  res.setHeader('X-Request-Id', requestId);

  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[level]('HTTP', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    });
  });

  next();
};
