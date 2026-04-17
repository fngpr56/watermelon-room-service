import { Router } from "express";

import {
  createRequestRecord,
  getRequests,
  removeRequestRecord,
  updateRequestRecord,
} from "../controllers/requests.controller.js";
import { requireApiRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiRole("guest"));

router.get("/", getRequests);
router.post("/", createRequestRecord);
router.put("/:requestId", updateRequestRecord);
router.delete("/:requestId", removeRequestRecord);

export default router;