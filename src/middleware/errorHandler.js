import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Global Express error handler.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const message = statusCode >= 500 ? "Unexpected server error" : err.message;

  const logEntry = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
  };

  if (env.nodeEnv !== "production" && err.stack) {
    logEntry.stack = err.stack;
  }

  logger.error("Request failed", logEntry);

  res.status(statusCode).json({
    error: message,
    statusCode,
    requestId: req.requestId,
  });
}