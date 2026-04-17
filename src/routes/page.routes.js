/**
 * Page route definitions that gate guest and staff dashboards behind session checks.
 */
import { Router } from "express";

import {
  showGuestHelpPage,
  showGuestPage,
  showGuestTasksPage,
  showLoginPage,
  showStaffPage,
} from "../controllers/page.controller.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", (req, res) => {
  res.redirect("/login");
});
router.get("/login", showLoginPage);
router.get("/guest", requireRole("guest"), showGuestPage);
router.get("/guest/tasks", requireRole("guest"), showGuestTasksPage);
router.get("/guest/help", requireRole("guest"), showGuestHelpPage);
router.get("/staff", requireRole("staff"), showStaffPage);

export default router;