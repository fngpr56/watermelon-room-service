/**
 * Housekeeping-only inventory and room assignment route definitions.
 */
import { Router } from "express";

import {
  createInventoryAssignmentRecord,
  createInventoryRecord,
  getInventory,
  getInventoryAssignments,
  removeInventoryAssignmentRecord,
  removeInventory,
  updateInventoryAssignmentRecord,
  updateInventoryRecord,
} from "../controllers/inventory.controller.js";

import { requireApiStaffRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiStaffRole("housekeeping"));

router.get("/", getInventory);
router.get("/assignments", getInventoryAssignments);
router.post("/", createInventoryRecord);
router.post("/assignments", createInventoryAssignmentRecord);
router.put("/assignments/:assignmentId", updateInventoryAssignmentRecord);
router.delete("/assignments/:assignmentId", removeInventoryAssignmentRecord);
router.put("/:inventoryId", updateInventoryRecord);
router.delete("/:inventoryId", removeInventory);

export default router;