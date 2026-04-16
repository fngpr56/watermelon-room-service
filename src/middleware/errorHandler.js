import { logger } from "../utils/logger.js";

/**
 * Global Express error handler.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 ? "Unexpected server error" : err.message;

  logger.error({
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
  });

  res.status(statusCode).json({
    error: message,
    statusCode,
  });
}