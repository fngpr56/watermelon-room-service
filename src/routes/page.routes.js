import { Router } from "express";

import { showGuestPage, showLoginPage, showStaffPage } from "../controllers/page.controller.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", (req, res) => {
  res.redirect("/login");
});
router.get("/login", showLoginPage);
router.get("/guest", requireRole("guest"), showGuestPage);
router.get("/staff", requireRole("staff"), showStaffPage);

export default router;