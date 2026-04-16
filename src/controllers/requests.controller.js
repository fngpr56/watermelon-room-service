import { z } from "zod";
import { ApiError } from "../utils/apiError.js";

import {
  createRequest,
  deleteRequest,
  listRequests,
  updateRequest,
} from "../services/requests.service.js";

/**
 * SCHEMA
 */
const baseSchema = z.object({
  roomId: z.number().int().positive(),
  staffId: z.number().int().positive().nullable().optional(),
  fullRequest: z.string().trim().min(1),
  category: z.string().trim().max(50).nullable().optional(),
  statusId: z.number().int().positive(),
  notes: z.string().trim().nullable().optional(),
  requestDate: z.string().optional(),
  completeDate: z.string().nullable().optional(),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

/**
 * UUID CHECK
 */
function parseId(id) {
  const uuidRegex =
    /^[0-9a-f-]{36}$/i;

  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid request id");
  }

  return id;
}

/**
 * NORMALIZER
 */
function normalize(body) {
  return {
    roomId: Number(body?.roomId),
    staffId:
      body?.staffId !== undefined && body?.staffId !== null
        ? Number(body.staffId)
        : null,
    fullRequest: String(body?.fullRequest ?? "").trim(),
    category: body?.category ? String(body.category).trim() : null,
    statusId: Number(body?.statusId),
    notes: body?.notes ? String(body.notes).trim() : null,
    requestDate: body?.requestDate,
    completeDate: body?.completeDate,
  };
}

/**
 * HANDLERS
 */
export async function getRequests(req, res, next) {
  try {
    const items = await listRequests();
    res.json({ items });
  } catch (e) {
    next(e);
  }
}

export async function createRequestRecord(req, res, next) {
  try {
    const payload = createSchema.parse(normalize(req.body));
    const item = await createRequest(payload);
    res.status(201).json({ item });
  } catch (e) {
    next(e.name === "ZodError"
      ? new ApiError(400, "Invalid request payload")
      : e);
  }
}

export async function updateRequestRecord(req, res, next) {
  try {
    const id = parseId(req.params.requestId);
    const payload = updateSchema.parse(normalize(req.body));

    const item = await updateRequest(id, payload);
    res.json({ item });
  } catch (e) {
    next(e.name === "ZodError"
      ? new ApiError(400, "Invalid request payload")
      : e);
  }
}

export async function removeRequest(req, res, next) {
  try {
    const id = parseId(req.params.requestId);
    await deleteRequest(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}