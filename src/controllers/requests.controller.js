/**
 * HTTP handlers for guest request CRUD, catalog lookup, and inventory-aware request creation.
 */
import { z } from "zod";

import { ApiError } from "../utils/apiError.js";
import {
  emitInventoryUpdated,
  emitReceptionistOverviewUpdated,
  emitRunnerRequestUpdated,
} from "../sockets/index.js";
import {
  createRoomRequest,
  deleteRoomRequest,
  listRequestCatalog,
  listRoomRequests,
  updateRoomRequest,
} from "../services/requests.service.js";

const requestSchema = z.object({
  fullRequest: z.string().trim().min(1).max(2000),
  category: z.string().trim().max(50).nullable(),
  statusId: z.number().int().positive(),
  notes: z.string().trim().max(2000).nullable(),
  etaMinutes: z.number().int().min(0).nullable(),
});

const createRequestSchema = requestSchema.extend({
  inventoryItemId: z.number().int().positive().nullable().optional(),
  quantityRequested: z.number().int().positive().nullable().optional(),
});

function mapDbError(error) {
  if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146 || error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054) {
    return new ApiError(409, "Database schema is out of date. Run sql/migrate_inventory_assignments.sql.");
  }

  return error;
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  return Number(value);
}

function normalizePayload(body) {
  const rawEta = body?.etaMinutes;

  return {
    fullRequest: String(body?.fullRequest || "").trim(),
    category: body?.category ? String(body.category).trim() : null,
    statusId: Number(body?.statusId || 1),
    notes: body?.notes ? String(body.notes).trim() : null,
    etaMinutes:
      rawEta === null || rawEta === undefined || String(rawEta).trim() === "" ? null : Number(rawEta),
    inventoryItemId: normalizeOptionalNumber(body?.inventoryItemId),
    quantityRequested: normalizeOptionalNumber(body?.quantityRequested),
  };
}

export async function getRequestCatalog(req, res, next) {
  try {
    const items = await listRequestCatalog();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getRequests(req, res, next) {
  try {
    const items = await listRoomRequests(req.session.roomId);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createRequestRecord(req, res, next) {
  try {
    const payload = createRequestSchema.parse(normalizePayload(req.body));
    const item = await createRoomRequest(req.session.roomId, payload);

    emitReceptionistOverviewUpdated({
      changeType: "request-created",
      requestId: item.id,
      roomId: req.session.roomId,
    });

    if (item.inventoryMatch) {
      emitInventoryUpdated({
        inventoryItemId: item.inventoryMatch.id,
        roomId: req.session.roomId,
        requestId: item.id,
        assignmentId: item.inventoryAssignment?.id || null,
        changeType: "guest-request-created",
      });
      emitRunnerRequestUpdated({
        requestId: item.id,
        roomId: req.session.roomId,
        changeType: "guest-request-created",
      });
    }

    res.status(201).json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid request payload") : mapDbError(error));
  }
}

export async function updateRequestRecord(req, res, next) {
  try {
    const payload = requestSchema.parse(normalizePayload(req.body));
    const item = await updateRoomRequest(String(req.params.requestId || ""), req.session.roomId, payload);
    emitReceptionistOverviewUpdated({
      changeType: "request-updated",
      requestId: item.id,
      roomId: req.session.roomId,
    });
    res.json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid request payload") : error);
  }
}

export async function removeRequestRecord(req, res, next) {
  try {
    const requestId = String(req.params.requestId || "");
    await deleteRoomRequest(requestId, req.session.roomId);
    emitReceptionistOverviewUpdated({
      changeType: "request-deleted",
      requestId,
      roomId: req.session.roomId,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}