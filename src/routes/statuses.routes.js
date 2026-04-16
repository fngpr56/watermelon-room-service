import { Router } from "express";

import { getStatuses, createStatus, updateStatus, removeStatus } from "../controllers/statuses.controller.js";
import { requireApiRole } from "../middleware/auth.js";

const router = Router();

// Only staff may manage request statuses
router.use(requireApiRole("staff"));

router.get("/", getStatuses);
router.post("/", createStatus);
router.put("/:statusId", updateStatus);
router.delete("/:statusId", removeStatus);

export default router;
