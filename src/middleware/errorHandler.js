/**
 * Final Express error handler that logs failures and returns consistent JSON responses.
 */
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

function resolveStatusCode(err) {
  if (Number.isInteger(err?.statusCode)) {
    return err.statusCode;
  }

  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 600) {
    return err.status;
  }

  return 500;
}

function resolveClientMessage(err, statusCode) {
  if (err?.type === "entity.parse.failed") {
    return "Malformed JSON body";
  }

  if (err?.type === "entity.too.large") {
    return "Request payload too large";
  }

  if (statusCode >= 500) {
    return "Unexpected server error";
  }

  return err?.message || "Request failed";
}

function buildSessionSummary(session) {
  if (!session) {
    return null;
  }

  return {
    userType: session.userType,
    roomId: session.roomId ?? null,
    staffId: session.staffId ?? null,
    role: session.role ?? null,
  };
}

function buildErrorLogEntry(err, req, statusCode) {
  const logEntry = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorName: err?.name || "Error",
    errorCode: err?.code || null,
    errorType: err?.type || null,
    message: err?.message || "Unexpected server error",
    ip: req.ip,
    session: buildSessionSummary(req.session),
  };

  if (env.nodeEnv !== "production" && err?.stack) {
    logEntry.stack = err.stack;
  }

  return logEntry;
}

/**
 * Global Express error handler.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = resolveStatusCode(err);
  const message = resolveClientMessage(err, statusCode);
  const logEntry = buildErrorLogEntry(err, req, statusCode);
  const logMethod = statusCode >= 500 ? logger.error : logger.warn;

  logMethod("Request failed", logEntry);

  res.status(statusCode).json({
    error: message,
    statusCode,
    requestId: req.requestId,
  });
}