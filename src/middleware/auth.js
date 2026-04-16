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
    const session = getSession(req);

    // Page routes send the user back to the login screen.
    if (!session || session.userType !== role) {
      return res.redirect("/login");
    }

    req.session = session;
    next();
  };
}

export function requireApiRole(role) {
  return function authorize(req, res, next) {
    const session = getSession(req);

    // API routes return JSON errors instead of redirects.
    if (!session) {
      return rejectApiRequest(res, 401, "Not authenticated");
    }

    if (session.userType !== role) {
      return rejectApiRequest(res, 403, "Forbidden");
    }

    req.session = session;
    next();
  };
}