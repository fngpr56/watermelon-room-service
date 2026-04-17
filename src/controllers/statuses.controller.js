import { z } from "zod";

import {
  listRequestStatuses,
  createRequestStatus,
  updateRequestStatus,
  deleteRequestStatus,
} from "../services/statuses.service.js";
import { ApiError } from "../utils/apiError.js";

const statusSchema = z.object({
  code: z.string().trim().min(1).max(30),
  label: z.string().trim().min(1).max(50),
  color: z.string().trim().max(30).nullable().optional(),
});

function toStatusCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

function normalizePayload(body) {
  const label = String(body?.label || body?.name || "").trim();
  const code = toStatusCode(body?.code || label);

  return {
    code,
    label,
    color: body?.color ? String(body.color).trim() : null,
  };
}

function parseStatusId(value) {
  const statusId = Number(value);

  if (!Number.isInteger(statusId) || statusId <= 0) {
    throw new ApiError(400, "Invalid status id");
  }

  return statusId;
}

function mapDbError(error) {
  if (error?.code === "ER_DUP_ENTRY") {
    return new ApiError(409, "A request status with that code already exists");
  }

  return error;
}

export async function getStatuses(req, res, next) {
  try {
    const items = await listRequestStatuses();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createStatus(req, res, next) {
  try {
    const payload = statusSchema.parse(normalizePayload(req.body));
    const item = await createRequestStatus(payload);
    res.status(201).json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid status payload") : mapDbError(error));
  }
}

export async function updateStatus(req, res, next) {
  try {
    const statusId = parseStatusId(req.params.statusId);
    const payload = statusSchema.parse(normalizePayload(req.body));
    const item = await updateRequestStatus(statusId, payload);
    res.json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid status payload") : mapDbError(error));
  }
}

export async function removeStatus(req, res, next) {
  try {
    const statusId = parseStatusId(req.params.statusId);
    await deleteRequestStatus(statusId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
