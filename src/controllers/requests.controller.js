import { z } from "zod";

import { ApiError } from "../utils/apiError.js";
import { createRoomRequest, deleteRoomRequest, listRoomRequests, updateRoomRequest } from "../services/requests.service.js";

const requestSchema = z.object({
  fullRequest: z.string().trim().min(1).max(2000),
  category: z.string().trim().max(50).nullable(),
  statusId: z.number().int().positive(),
  notes: z.string().trim().max(2000).nullable(),
  etaMinutes: z.number().int().min(0).nullable(),
});

function normalizePayload(body) {
  const rawEta = body?.etaMinutes;

  return {
    fullRequest: String(body?.fullRequest || "").trim(),
    category: body?.category ? String(body.category).trim() : null,
    statusId: Number(body?.statusId || 1),
    notes: body?.notes ? String(body.notes).trim() : null,
    etaMinutes:
      rawEta === null || rawEta === undefined || String(rawEta).trim() === "" ? null : Number(rawEta),
  };
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
    const payload = requestSchema.parse(normalizePayload(req.body));
    const item = await createRoomRequest(req.session.roomId, payload);
    res.status(201).json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid request payload") : error);
  }
}

export async function updateRequestRecord(req, res, next) {
  try {
    const payload = requestSchema.parse(normalizePayload(req.body));
    const item = await updateRoomRequest(String(req.params.requestId || ""), req.session.roomId, payload);
    res.json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid request payload") : error);
  }
}

export async function removeRequestRecord(req, res, next) {
  try {
    await deleteRoomRequest(String(req.params.requestId || ""), req.session.roomId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}