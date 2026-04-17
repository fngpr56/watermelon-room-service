/**
 * Receptionist-only API routes for overview metrics and front-desk monitoring.
 */
import { Router } from "express";

import {
	createReceptionistStocktakingRecord,
	getReceptionistOverviewRecord,
} from "../controllers/receptionist.controller.js";
import { requireApiStaffRole } from "../middleware/auth.js";

const router = Router();

router.use(requireApiStaffRole("receptionist"));

router.get("/overview", getReceptionistOverviewRecord);
router.post("/stocktaking", createReceptionistStocktakingRecord);

export default router;