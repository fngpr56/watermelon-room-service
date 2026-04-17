/**
 * Runner-only API routes for inventory-backed guest request intake and delivery handling.
 */
import { Router } from "express";

import {
  acceptRunnerQueueRequest,
  completeRunnerQueueRequest,
  declineRunnerQueueRequest,
  getRunnerQueue,
} from "../controllers/runner.controller.js";
import { requireApiStaffRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiStaffRole("runner"));

router.get("/requests", getRunnerQueue);
router.post("/requests/:requestId/accept", acceptRunnerQueueRequest);
router.post("/requests/:requestId/decline", declineRunnerQueueRequest);
router.post("/requests/:requestId/complete", completeRunnerQueueRequest);

export default router;