/**
 * Socket.IO authentication and broadcast helpers for conversations and housekeeping updates.
 */
import { env } from "../config/env.js";
import { readSessionFromToken } from "../utils/session.js";

const STAFF_CONVERSATIONS_ROOM = "staff:conversations";
const HOUSEKEEPING_INVENTORY_ROOM = "staff:housekeeping:inventory";
const RUNNER_REQUESTS_ROOM = "staff:runner:requests";
let ioInstance = null;

function getGuestConversationsRoom(roomId) {
  return `guest:room:${roomId}:conversations`;
}

function getSocketSession(socket) {
  const sessionToken = String(socket.handshake.auth?.sessionToken || "").trim();
  return readSessionFromToken(sessionToken, env.sessionSecret);
}

/**
 * Sets up Socket.IO handlers.
 * @param {import("socket.io").Server} io
 */
export function registerSocketHandlers(io) {
  ioInstance = io;

  io.use((socket, next) => {
    const session = getSocketSession(socket);

    if (!session) {
      return next(new Error("Not authenticated"));
    }

    socket.data.session = session;
    next();
  });

  io.on("connection", (socket) => {
    const session = socket.data.session;

    if (session?.userType === "guest" && session.roomId) {
      socket.join(getGuestConversationsRoom(session.roomId));
    }

    if (session?.userType === "staff") {
      socket.join(STAFF_CONVERSATIONS_ROOM);

      if (session.role === "housekeeping") {
        socket.join(HOUSEKEEPING_INVENTORY_ROOM);
      }

      if (session.role === "runner") {
        socket.join(RUNNER_REQUESTS_ROOM);
      }
    }
  });
}

export function emitConversationUpdated(payload) {
  if (!ioInstance || !payload?.conversation) {
    return;
  }

  const roomId = Number(payload.conversation.roomId);

  ioInstance.to(STAFF_CONVERSATIONS_ROOM).emit("conversation:updated", payload);

  if (roomId > 0) {
    ioInstance.to(getGuestConversationsRoom(roomId)).emit("conversation:updated", payload);
  }
}

export function emitInventoryUpdated(payload = {}) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(HOUSEKEEPING_INVENTORY_ROOM).emit("inventory:updated", {
    updatedAt: new Date().toISOString(),
    ...payload,
  });
}

export function emitRunnerRequestUpdated(payload = {}) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(RUNNER_REQUESTS_ROOM).emit("runner:request-updated", {
    updatedAt: new Date().toISOString(),
    ...payload,
  });
}