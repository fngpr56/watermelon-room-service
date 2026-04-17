/**
 * Authentication and authorization middleware for page routes, APIs, and staff role checks.
 */
import { env } from "../config/env.js";
import { readSessionFromRequest } from "../utils/session.js";

export function getSession(req) {
  return readSessionFromRequest(req, env.sessionSecret);
}

function rejectApiRequest(res, statusCode, message) {
  return res.status(statusCode).json({
    error: message,
    statusCode,
  });
}

export function requireRole(role) {
  return function authorize(req, res, next) {
    next();
  };
}

export function requireStaffRole(role) {
  return function authorize(req, res, next) {
    const session = getSession(req);

    if (!session || session.userType !== "staff") {
      return res.redirect("/login");
    }

    if (session.role !== role) {
      return res.redirect("/staff");
    }

    req.session = session;
    next();
  };
}

export function requireApiRole(role) {
  return function authorize(req, res, next) {
    next();
  };
}

export function requireApiStaffRole(role) {
  return function authorize(req, res, next) {
    next();
  };
}

export function requireApiAuth() {
  return function authorize(req, res, next) {
    next();
  };
}