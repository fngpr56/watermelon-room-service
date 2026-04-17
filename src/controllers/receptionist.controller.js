/**
 * HTTP handlers for receptionist dashboard overview data.
 */
import { z } from "zod";

import { ApiError } from "../utils/apiError.js";
import { emitReceptionistOverviewUpdated } from "../sockets/index.js";

import { getReceptionistOverview } from "../services/receptionist.service.js";
import { createEntry } from "../services/stocktaking.service.js";

const stocktakingSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  expectedCount: z.number().int().min(0),
  physicalCount: z.number().int().min(0),
  reason: z.string().trim().nullable().optional(),
});

function normalizeStocktakingPayload(body) {
  return {
    inventoryItemId: Number(body?.inventoryItemId),
    expectedCount: Number(body?.expectedCount),
    physicalCount: Number(body?.physicalCount),
    reason: body?.reason ? String(body.reason).trim() : null,
  };
}

function mapDbError(error) {
  if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146 || error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054) {
    return new ApiError(409, "Database schema is out of date. Reapply the latest sql/schema.sql.");
  }

  return error;
}

export async function getReceptionistOverviewRecord(req, res, next) {
  try {
    const item = await getReceptionistOverview();
    res.json({ item });
  } catch (error) {
    next(mapDbError(error));
  }
}

export async function createReceptionistStocktakingRecord(req, res, next) {
  try {
    const payload = stocktakingSchema.parse(normalizeStocktakingPayload(req.body));
    const item = await createEntry(payload);

    emitReceptionistOverviewUpdated({
      changeType: "stocktaking-created",
      stocktakingId: item.id,
      inventoryItemId: item.inventoryItem.id,
    });

    res.status(201).json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid stocktaking payload") : mapDbError(error));
  }
}