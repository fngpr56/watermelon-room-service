import { env } from "../config/env.js";
import { readSessionFromRequest } from "../utils/session.js";

export function getSession(req) {
  return readSessionFromRequest(req, env.sessionSecret);
}

export function requireRole(role) {
  return function authorize(req, res, next) {
    const session = getSession(req);

    if (!session || session.userType !== role) {
      return res.redirect("/login");
    }

    req.session = session;
    next();
  };
}