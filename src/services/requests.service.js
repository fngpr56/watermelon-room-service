import { randomUUID } from "crypto";

import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function formatDateTimeForSql(value = new Date()) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function isTerminalStatus(code) {
  return ["delivered", "rejected", "cancelled"].includes(String(code || "").toLowerCase());
}

function formatRequest(row) {
  return {
    id: row.id,
    room: {
      id: row.roomId,
      roomNumber: row.roomNumber,
      owner: row.roomOwner,
    },
    staffId: row.staffId,
    fullRequest: row.fullRequest,
    category: row.category,
    status: {
      id: row.statusId,
      code: row.statusCode,
      label: row.statusLabel,
      color: row.statusColor,
    },
    notes: row.notes,
    etaMinutes: row.etaMinutes,
    requestDate: row.requestDate,
    completeDate: row.completeDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getStatusById(conn, statusId) {
  const rows = await conn.query(
    `SELECT id, code, label, color
     FROM request_statuses
     WHERE id = ?
     LIMIT 1`,
    [statusId]
  );

  return rows[0] || null;
}

async function getRequestById(conn, requestId, roomId) {
  const rows = await conn.query(
    `SELECT r.id,
            r.room_id AS roomId,
            rm.room_number AS roomNumber,
            rm.owner AS roomOwner,
            r.staff_id AS staffId,
            r.full_request AS fullRequest,
            r.category,
            r.status_id AS statusId,
            rs.code AS statusCode,
            rs.label AS statusLabel,
            rs.color AS statusColor,
            r.notes,
            r.eta_minutes AS etaMinutes,
            DATE_FORMAT(r.request_date, '%Y-%m-%dT%H:%i:%s') AS requestDate,
            DATE_FORMAT(r.complete_date, '%Y-%m-%dT%H:%i:%s') AS completeDate,
            DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt,
            DATE_FORMAT(r.updated_at, '%Y-%m-%dT%H:%i:%s') AS updatedAt
     FROM requests r
     JOIN rooms rm ON rm.id = r.room_id
     JOIN request_statuses rs ON rs.id = r.status_id
     WHERE r.id = ? AND r.room_id = ?
     LIMIT 1`,
    [requestId, roomId]
  );

  return rows[0] || null;
}

export async function listRoomRequests(roomId) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT r.id,
              r.room_id AS roomId,
              rm.room_number AS roomNumber,
              rm.owner AS roomOwner,
              r.staff_id AS staffId,
              r.full_request AS fullRequest,
              r.category,
              r.status_id AS statusId,
              rs.code AS statusCode,
              rs.label AS statusLabel,
              rs.color AS statusColor,
              r.notes,
              r.eta_minutes AS etaMinutes,
              DATE_FORMAT(r.request_date, '%Y-%m-%dT%H:%i:%s') AS requestDate,
              DATE_FORMAT(r.complete_date, '%Y-%m-%dT%H:%i:%s') AS completeDate,
              DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt,
              DATE_FORMAT(r.updated_at, '%Y-%m-%dT%H:%i:%s') AS updatedAt
       FROM requests r
       JOIN rooms rm ON rm.id = r.room_id
       JOIN request_statuses rs ON rs.id = r.status_id
       WHERE r.room_id = ?
       ORDER BY r.request_date DESC, r.created_at DESC`,
      [roomId]
    );

    return rows.map(formatRequest);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function createRoomRequest(roomId, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const status = await getStatusById(conn, data.statusId);

    if (!status) {
      throw new ApiError(400, "Invalid request status");
    }

    const requestId = randomUUID();
    const completeDate = isTerminalStatus(status.code) ? formatDateTimeForSql() : null;

    await conn.query(
      `INSERT INTO requests (
        id,
        room_id,
        staff_id,
        full_request,
        category,
        status_id,
        notes,
        eta_minutes,
        complete_date
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        roomId,
        data.fullRequest,
        data.category,
        data.statusId,
        data.notes,
        data.etaMinutes,
        completeDate,
      ]
    );

    const created = await getRequestById(conn, requestId, roomId);
    return formatRequest(created);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function updateRoomRequest(requestId, roomId, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getRequestById(conn, requestId, roomId);

    if (!existing) {
      throw new ApiError(404, "Request not found");
    }

    const status = await getStatusById(conn, data.statusId);

    if (!status) {
      throw new ApiError(400, "Invalid request status");
    }

    const completeDate = isTerminalStatus(status.code)
      ? existing.completeDate?.replace("T", " ") || formatDateTimeForSql()
      : null;

    await conn.query(
      `UPDATE requests
       SET full_request = ?,
           category = ?,
           status_id = ?,
           notes = ?,
           eta_minutes = ?,
           complete_date = ?
       WHERE id = ? AND room_id = ?`,
      [data.fullRequest, data.category, data.statusId, data.notes, data.etaMinutes, completeDate, requestId, roomId]
    );

    const updated = await getRequestById(conn, requestId, roomId);
    return formatRequest(updated);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function deleteRoomRequest(requestId, roomId) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getRequestById(conn, requestId, roomId);

    if (!existing) {
      throw new ApiError(404, "Request not found");
    }

    const result = await conn.query("DELETE FROM requests WHERE id = ? AND room_id = ?", [requestId, roomId]);

    if (!result.affectedRows) {
      throw new ApiError(404, "Request not found");
    }
  } finally {
    if (conn) {
      conn.release();
    }
  }
}