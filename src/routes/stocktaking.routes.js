/**
 * Route definitions for stocktaking entry CRUD operations.
 */
import { Router } from "express";
import * as controller from "../controllers/stocktaking.controller.js";

const router = Router();

router.get("/", controller.listStocktaking);
router.post("/", controller.createStocktaking);
router.put("/:id", controller.updateStocktaking);
router.delete("/:id", controller.deleteStocktaking);

export default router;