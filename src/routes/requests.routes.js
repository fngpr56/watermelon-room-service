import { Router } from "express";
import { createRequest, getRequests } from "../controllers/requests.controller.js";

const router = Router();

router.get("/", getRequests);
router.post("/", createRequest);

export default router;