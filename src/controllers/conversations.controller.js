/**
 * HTTP handlers for guest/staff conversation lists, threads, and message creation.
 */
import { z } from "zod";

import { ApiError } from "../utils/apiError.js";
import {
  createGuestConversationMessage,
  createStaffConversationMessage,
  getGuestConversation,
  getStaffConversation,
  listStaffConversations,
} from "../services/conversations.service.js";
import { emitConversationUpdated } from "../sockets/index.js";

const messageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

function parseConversationId(value) {
  const conversationId = Number(value);

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    throw new ApiError(400, "Invalid conversation id");
  }

  return conversationId;
}

function normalizePayload(body) {
  return {
    message: String(body?.message || "").trim(),
  };
}

export async function getConversationList(req, res, next) {
  try {
    const items = await listStaffConversations();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentGuestConversation(req, res, next) {
  try {
    const payload = await getGuestConversation(req.session.roomId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getConversationThread(req, res, next) {
  try {
    const conversationId = parseConversationId(req.params.conversationId);
    const payload = await getStaffConversation(conversationId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function createGuestMessage(req, res, next) {
  try {
    const payload = messageSchema.parse(normalizePayload(req.body));
    const item = await createGuestConversationMessage(req.session.roomId, payload.message);
    emitConversationUpdated(item);
    res.status(201).json(item);
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid message payload") : error);
  }
}

export async function createStaffMessage(req, res, next) {
  try {
    const conversationId = parseConversationId(req.params.conversationId);
    const payload = messageSchema.parse(normalizePayload(req.body));
    const item = await createStaffConversationMessage(conversationId, req.session, payload.message);
    emitConversationUpdated(item);
    res.status(201).json(item);
  } catch (error) {
    next(error.name === "ZodError" ? new ApiError(400, "Invalid message payload") : error);
  }
}