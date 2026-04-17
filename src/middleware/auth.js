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