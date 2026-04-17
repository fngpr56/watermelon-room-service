/**
 * Staff-only route definitions for managing staff user records.
 */
import { Router } from "express";

import { createStaff, getStaffUsers, removeStaff, updateStaff } from "../controllers/staff.controller.js";
import { requireApiRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiRole("staff"));

router.get("/", getStaffUsers);
router.post("/", createStaff);
router.put("/:staffId", updateStaff);
router.delete("/:staffId", removeStaff);

export default router;