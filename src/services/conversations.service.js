/**
 * Conversation persistence and permission rules for guest/staff messaging.
 */
import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

const conversationSummarySelect = `SELECT c.id,
                                          c.room_id AS roomId,
                                          r.room_number AS roomNumber,
                                          r.owner AS roomOwner,
                                          c.assigned_staff_id AS assignedStaffId,
                                          CASE
                                            WHEN s.id IS NULL THEN NULL
                                            ELSE CONCAT(s.first_name, ' ', s.last_name)
                                          END AS assignedStaffName,
                                          DATE_FORMAT(c.last_message_at, '%Y-%m-%dT%H:%i:%s') AS lastMessageAt,
                                          (
                                            SELECT m.message
                                            FROM room_conversation_messages m
                                            WHERE m.conversation_id = c.id
                                            ORDER BY m.id DESC
                                            LIMIT 1
                                          ) AS lastMessagePreview,
                                          (
                                            SELECT COUNT(*)
                                            FROM room_conversation_messages m
                                            WHERE m.conversation_id = c.id
                                          ) AS messageCount
                                   FROM room_conversations c
                                   JOIN rooms r ON r.id = c.room_id
                                   LEFT JOIN staff s ON s.id = c.assigned_staff_id`;

function formatDateTimeForSql(value = new Date()) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function formatConversation(row) {
  return {
    id: row.id,
    roomId: row.roomId,
    roomNumber: row.roomNumber,
    roomOwner: row.roomOwner,
    roomDisplayName: row.roomOwner || `Room ${row.roomNumber}`,
    assignedStaffId: row.assignedStaffId,
    assignedStaffName: row.assignedStaffName,
    lastMessageAt: row.lastMessageAt,
    lastMessagePreview: row.lastMessagePreview,
    messageCount: Number(row.messageCount || 0),
  };
}

function formatMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderType: row.senderType,
    message: row.message,
    roomId: row.roomId,
    staffId: row.staffId,
    senderName: row.senderName,
    createdAt: row.createdAt,
  };
}

async function getConversationById(conn, conversationId) {
  const rows = await conn.query(`${conversationSummarySelect} WHERE c.id = ? LIMIT 1`, [conversationId]);
  return rows[0] || null;
}

async function getConversationByRoomId(conn, roomId) {
  const rows = await conn.query(`${conversationSummarySelect} WHERE c.room_id = ? LIMIT 1`, [roomId]);
  return rows[0] || null;
}

async function listConversationMessages(conn, conversationId) {
  const rows = await conn.query(
    `SELECT m.id,
            m.conversation_id AS conversationId,
            m.sender_type AS senderType,
            m.message,
            m.room_id AS roomId,
            m.staff_id AS staffId,
            CASE
              WHEN m.sender_type = 'guest' THEN COALESCE(r.owner, CONCAT('Room ', r.room_number))
              WHEN s.id IS NULL THEN 'Front Desk'
              ELSE CONCAT(s.first_name, ' ', s.last_name)
            END AS senderName,
            DATE_FORMAT(m.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt
     FROM room_conversation_messages m
     JOIN rooms r ON r.id = m.room_id
     LEFT JOIN staff s ON s.id = m.staff_id
     WHERE m.conversation_id = ?
     ORDER BY m.id ASC`,
    [conversationId]
  );

  return rows.map(formatMessage);
}

async function ensureConversation(conn, roomId) {
  let conversation = await getConversationByRoomId(conn, roomId);

  if (conversation) {
    return conversation;
  }

  try {
    const timestamp = formatDateTimeForSql();
    const result = await conn.query(
      `INSERT INTO room_conversations (room_id, assigned_staff_id, last_message_at)
       VALUES (?, NULL, ?)`,
      [roomId, timestamp]
    );

    conversation = await getConversationById(conn, Number(result.insertId));
    return conversation;
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return getConversationByRoomId(conn, roomId);
    }

    throw error;
  }
}

export async function listStaffConversations() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`${conversationSummarySelect} ORDER BY c.last_message_at DESC, c.id DESC`);
    return rows.map(formatConversation);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function getGuestConversation(roomId) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const conversation = await getConversationByRoomId(conn, roomId);

    if (!conversation) {
      return {
        conversation: null,
        messages: [],
      };
    }

    return {
      conversation: formatConversation(conversation),
      messages: await listConversationMessages(conn, conversation.id),
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function getStaffConversation(conversationId) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const conversation = await getConversationById(conn, conversationId);

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    return {
      conversation: formatConversation(conversation),
      messages: await listConversationMessages(conn, conversationId),
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function createGuestConversationMessage(roomId, message) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const conversation = await ensureConversation(conn, roomId);
    const timestamp = formatDateTimeForSql();

    await conn.query(
      `INSERT INTO room_conversation_messages (conversation_id, room_id, staff_id, sender_type, message)
       VALUES (?, ?, NULL, 'guest', ?)`,
      [conversation.id, roomId, message]
    );

    await conn.query(`UPDATE room_conversations SET last_message_at = ? WHERE id = ?`, [timestamp, conversation.id]);

    return {
      conversation: formatConversation(await getConversationById(conn, conversation.id)),
      messages: await listConversationMessages(conn, conversation.id),
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function createStaffConversationMessage(conversationId, staffSession, message) {
  if (staffSession.role !== "front_desk") {
    throw new ApiError(403, "Only front desk staff can answer guest conversations");
  }

  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const conversation = await getConversationById(conn, conversationId);

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const timestamp = formatDateTimeForSql();

    await conn.query(
      `INSERT INTO room_conversation_messages (conversation_id, room_id, staff_id, sender_type, message)
       VALUES (?, ?, ?, 'staff', ?)`,
      [conversationId, conversation.roomId, staffSession.staffId, message]
    );

    await conn.query(
      `UPDATE room_conversations
       SET assigned_staff_id = ?,
           last_message_at = ?
       WHERE id = ?`,
      [staffSession.staffId, timestamp, conversationId]
    );

    return {
      conversation: formatConversation(await getConversationById(conn, conversationId)),
      messages: await listConversationMessages(conn, conversationId),
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}