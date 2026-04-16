import path from "path";

import { getSession } from "../middleware/auth.js";

const publicDir = path.resolve(process.cwd(), "public");

export function showLoginPage(req, res) {
  const session = getSession(req);

  if (session?.userType === "guest") {
    return res.redirect("/guest");
  }

  if (session?.userType === "staff") {
    return res.redirect("/staff");
  }

  res.sendFile(path.join(publicDir, "login.html"));
}

export function showGuestPage(req, res) {
  res.sendFile(path.join(publicDir, "guest.html"));
}

export function showStaffPage(req, res) {
  res.sendFile(path.join(publicDir, "staff.html"));
}