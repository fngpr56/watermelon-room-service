/**
 * Guest-only request route definitions, including the inventory request catalog.
 */
import { Router } from "express";

import {
  createRequestRecord,
  getRequestCatalog,
  getRequests,
  removeRequestRecord,
  updateRequestRecord,
} from "../controllers/requests.controller.js";
import { requireApiRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiRole("guest"));

router.get("/catalog", getRequestCatalog);
router.get("/", getRequests);
router.post("/", createRequestRecord);
router.put("/:requestId", updateRequestRecord);
router.delete("/:requestId", removeRequestRecord);

export default router;