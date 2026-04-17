/**
 * HTTP handlers for room CRUD used by the authenticated staff dashboard.
 */
import { z } from "zod";

import { ApiError } from "../utils/apiError.js";
import { emitReceptionistOverviewUpdated } from "../sockets/index.js";
import { createRoom, deleteRoom, listRooms, updateRoom } from "../services/rooms.service.js";

const baseRoomSchema = z.object({
  roomNumber: z.number().int().positive(),
  owner: z.string().trim().max(70).nullable(),
  dateIn: z.string().trim().nullable(),
  dateOut: z.string().trim().nullable(),
});

const createRoomSchema = baseRoomSchema.extend({
  password: z.string().min(6).max(72),
});

const updateRoomSchema = baseRoomSchema.extend({
  password: z.string().min(6).max(72).optional(),
});

function parseRoomId(value) {
  const roomId = Number(value);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw new ApiError(400, "Invalid room id");
  }

  return roomId;
}

function normalizePayload(body) {
  return {
    roomNumber: Number(body?.roomNumber),
    owner: body?.owner ? String(body.owner).trim() : null,
    dateIn: body?.dateIn ? String(body.dateIn).trim() : null,
    dateOut: body?.dateOut ? String(body.dateOut).trim() : null,
    password: body?.password,
  };
}

function mapDbError(error) {
  if (error?.code === "ER_DUP_ENTRY") {
    return new ApiError(409, "A room with that room number already exists");
  }

  return error;
}

export async function getRooms(req, res, next) {
  try {
    const items = await listRooms();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createRoomRecord(req, res, next) {
  try {
    const payload = createRoomSchema.parse(normalizePayload(req.body));
    const item = await createRoom(payload);
    emitReceptionistOverviewUpdated({ changeType: "room-created", roomId: item.id });
    res.status(201).json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid room payload") : mapDbError(error));
  }
}

export async function updateRoomRecord(req, res, next) {
  try {
    const roomId = parseRoomId(req.params.roomId);
    const payload = updateRoomSchema.parse(normalizePayload(req.body));
    const item = await updateRoom(roomId, payload);
    emitReceptionistOverviewUpdated({ changeType: "room-updated", roomId: item.id });
    res.json({ item });
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid room payload") : mapDbError(error));
  }
}

export async function removeRoom(req, res, next) {
  try {
    const roomId = parseRoomId(req.params.roomId);
    await deleteRoom(roomId);
    emitReceptionistOverviewUpdated({ changeType: "room-deleted", roomId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}