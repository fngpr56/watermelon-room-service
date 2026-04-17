/**
 * Express route definitions for guest and staff conversation endpoints.
 */
import { Router } from "express";

import {
  createGuestMessage,
  createStaffMessage,
  getConversationList,
  getConversationThread,
  getCurrentGuestConversation,
} from "../controllers/conversations.controller.js";
import { requireApiRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireApiRole("staff"), getConversationList);
router.get("/current", requireApiRole("guest"), getCurrentGuestConversation);
router.post("/current/messages", requireApiRole("guest"), createGuestMessage);
router.get("/:conversationId", requireApiRole("staff"), getConversationThread);
router.post("/:conversationId/messages", requireApiRole("staff"), createStaffMessage);

export default router;