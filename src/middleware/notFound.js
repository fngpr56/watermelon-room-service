import { ApiError } from "../utils/apiError.js";

/**
 * Handles unknown routes.
 */
export function notFound(req, res, next) {
  // Unknown API routes should always return JSON.
  if (!req.originalUrl.startsWith("/api/") && req.accepts("html")) {
    return res.redirect("/login");
  }

  next(new ApiError(404, "Route not found"));
}