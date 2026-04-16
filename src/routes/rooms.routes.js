import { Router } from "express";

import { createRoomRecord, getRooms, removeRoom, updateRoomRecord } from "../controllers/rooms.controller.js";
import { requireApiRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiRole("staff"));

router.get("/", getRooms);
router.post("/", createRoomRecord);
router.put("/:roomId", updateRoomRecord);
router.delete("/:roomId", removeRoom);

export default router;