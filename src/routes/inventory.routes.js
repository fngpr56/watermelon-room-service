import { Router } from "express";

import {
  createInventoryRecord,
  getInventory,
  removeInventory,
  updateInventoryRecord,
} from "../controllers/inventory.controller.js";

import { requireApiRole } from "../middleware/auth.js";

const router = Router();

/**
 * only staff
 */
router.use(requireApiRole("staff"));

router.get("/", getInventory);
router.post("/", createInventoryRecord);
router.put("/:inventoryId", updateInventoryRecord);
router.delete("/:inventoryId", removeInventory);

export default router;