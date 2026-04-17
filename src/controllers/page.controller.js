/**
 * Page responders that serve the login, guest, help, task, and staff HTML entry points.
 */
import path from "path";

import { getSession } from "../middleware/auth.js";
import { getSessionTokenFromRequest, SESSION_QUERY_PARAM } from "../utils/session.js";

const publicDir = path.resolve(process.cwd(), "public");

function withSessionPath(pathname, sessionToken) {
  if (!sessionToken) {
    return pathname;
  }

  const url = new URL(pathname, "http://localhost");
  url.searchParams.set(SESSION_QUERY_PARAM, sessionToken);
  return `${url.pathname}${url.search}`;
}

export function showLoginPage(req, res) {
  const session = getSession(req);
  const sessionToken = getSessionTokenFromRequest(req);

  if (session?.userType === "guest" && sessionToken) {
    return res.redirect(withSessionPath("/guest", sessionToken));
  }

  if (session?.userType === "staff" && sessionToken) {
    return res.redirect(withSessionPath("/staff", sessionToken));
  }

  res.sendFile(path.join(publicDir, "login.html"));
}

export function showGuestPage(req, res) {
  res.sendFile(path.join(publicDir, "guest.html"));
}

export function showGuestTasksPage(req, res) {
  res.sendFile(path.join(publicDir, "guest-tasks.html"));
}

export function showGuestHelpPage(req, res) {
  res.sendFile(path.join(publicDir, "guest-help.html"));
}

export function showStaffPage(req, res) {
  res.sendFile(path.join(publicDir, "staff.html"));
}

export function showReceptionistPage(req, res) {
  res.sendFile(path.join(publicDir, "receptionist.html"));
}

export function showRunnerPage(req, res) {
  res.sendFile(path.join(publicDir, "runner.html"));
}