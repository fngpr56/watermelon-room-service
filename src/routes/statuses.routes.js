import { Router } from "express";

import { getStatuses, createStatus, updateStatus, removeStatus } from "../controllers/statuses.controller.js";
import { requireApiAuth, requireApiRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireApiAuth(), getStatuses);

// Only staff may manage request statuses.
router.post("/", requireApiRole("staff"), createStatus);
router.put("/:statusId", requireApiRole("staff"), updateStatus);
router.delete("/:statusId", requireApiRole("staff"), removeStatus);

export default router;
