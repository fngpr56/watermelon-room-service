/**
 * HTTP handlers for stocktaking entry list, create, update, and delete operations.
 */
import * as stocktakingService from "../services/stocktaking.service.js";

export async function listStocktaking(req, res, next) {
  try {
    const items = await stocktakingService.listEntries();
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function createStocktaking(req, res, next) {
  try {
    const item = await stocktakingService.createEntry(req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

export async function updateStocktaking(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await stocktakingService.updateEntry(id, req.body);
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function deleteStocktaking(req, res, next) {
  try {
    const id = Number(req.params.id);
    await stocktakingService.deleteEntry(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}