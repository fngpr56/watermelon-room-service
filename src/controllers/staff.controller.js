/**
 * HTTP handlers for staff user CRUD, validation, and password-aware updates.
 */
import { z } from "zod";

import { deleteStaffUser, listStaffUsers, createStaffUser, updateStaffUser } from "../services/staff.service.js";
import { ApiError } from "../utils/apiError.js";

const staffRoleValues = ["manager", "front_desk", "housekeeping", "room_service", "maintenance", "attendant"];

const baseStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(20),
  lastName: z.string().trim().min(1).max(20),
  birthday: z.string().date().nullable(),
  phoneNumber: z.string().trim().max(15).nullable(),
  mailAddress: z.string().trim().email().max(100),
  role: z.enum(staffRoleValues),
  dateStart: z.string().date(),
  completedRequest: z.number().int().min(0),
});

const createStaffSchema = baseStaffSchema.extend({
  password: z.string().min(6).max(72),
});

const updateStaffSchema = baseStaffSchema.extend({
  password: z.string().min(6).max(72).optional(),
});

function parseStaffId(value) {
  const staffId = Number(value);

  if (!Number.isInteger(staffId) || staffId <= 0) {
    throw new ApiError(400, "Invalid staff id");
  }

  return staffId;
}

function normalizePayload(body) {
  return {
    ...body,
    birthday: body?.birthday || null,
    phoneNumber: body?.phoneNumber || null,
    role: String(body?.role || "").trim(),
    completedRequest: Number(body?.completedRequest),
  };
}

function mapDbError(error) {
  if (error?.code === "ER_DUP_ENTRY") {
    return new ApiError(409, "A staff user with that email already exists");
  }

  return error;
}

export async function getStaffUsers(req, res, next) {
  try {
    const items = await listStaffUsers();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createStaff(req, res, next) {
  try {
    const payload = createStaffSchema.parse(normalizePayload(req.body));
    const item = await createStaffUser(payload);
    res.status(201).json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid staff payload") : mapDbError(error));
  }
}

export async function updateStaff(req, res, next) {
  try {
    const staffId = parseStaffId(req.params.staffId);
    const payload = updateStaffSchema.parse(normalizePayload(req.body));
    const item = await updateStaffUser(staffId, payload);
    res.json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid staff payload") : mapDbError(error));
  }
}

export async function removeStaff(req, res, next) {
  try {
    const staffId = parseStaffId(req.params.staffId);
    await deleteStaffUser(staffId, req.session.staffId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}