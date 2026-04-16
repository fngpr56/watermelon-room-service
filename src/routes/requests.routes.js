import { Router } from "express";

import {
  createRequestRecord,
  getRequests,
  removeRequest,
  updateRequestRecord,
} from "../controllers/requests.controller.js";

import { requireApiRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiRole("staff"));

router.get("/", getRequests);
router.post("/", createRequestRecord);
router.put("/:requestId", updateRequestRecord);
router.delete("/:requestId", removeRequest);

export default router;