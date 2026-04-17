
import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { randomUUID } from "crypto";

/**
 * FORMAT
 */
function formatRequest(row) {
  return {
    id: row.id,
    roomId: row.roomId,
    staffId: row.staffId,
    fullRequest: row.fullRequest,
    category: row.category,
    statusId: row.statusId,
    notes: row.notes,
    requestDate: row.requestDate,
    completeDate: row.completeDate,
  };
}

/**
 * GET BY ID
 */
async function getRequestById(conn, id) {
  const rows = await conn.query(
    `SELECT
        id,
        room_id AS roomId,
        staff_id AS staffId,
        full_request AS fullRequest,
        category,
        status_id AS statusId,
        notes,
        DATE_FORMAT(request_date, '%Y-%m-%dT%H:%i') AS requestDate,
        DATE_FORMAT(complete_date, '%Y-%m-%dT%H:%i') AS completeDate
     FROM requests
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}


/**
 * LIST
 */
export async function listRequests() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT
          id,
          room_id AS roomId,
          staff_id AS staffId,
          full_request AS fullRequest,
          category,
          status_id AS statusId,
          notes,
          DATE_FORMAT(request_date, '%Y-%m-%dT%H:%i') AS requestDate,
          DATE_FORMAT(complete_date, '%Y-%m-%dT%H:%i') AS completeDate
       FROM requests
       ORDER BY request_date DESC`
    );

    return rows.map(formatRequest);
  } finally {
    if (conn) conn.release();
  }
}

/**
 * CREATE
 */
export async function createRequest(data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const id = randomUUID();
    await conn.query(
      `INSERT INTO requests (
        id,
        room_id,
        staff_id,
        full_request,
        category,
        status_id,
        notes,
        request_date,
        complete_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.roomId,
        data.staffId,
        data.fullRequest,
        data.category,
        data.statusId,
        data.notes,
        data.requestDate || null,
        data.completeDate || null,
      ]
    );


    const created = await getRequestById(conn, id);

    return formatRequest(created);
  } finally {
    if (conn) conn.release();
  }
}

/**
 * UPDATE
 */
export async function updateRequest(id, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const existing = await getRequestById(conn, id);

    if (!existing) {
      throw new ApiError(404, "Request not found");
    }

    await conn.query(
      `UPDATE requests
         SET room_id = ?,
             staff_id = ?,
             full_request = ?,
             category = ?,
             status_id = ?,
             notes = ?,
             request_date = ?,
             complete_date = ?
       WHERE id = ?`,
      [
        data.roomId ?? existing.roomId,
        data.staffId ?? existing.staffId,
        data.fullRequest ?? existing.fullRequest,
        data.category ?? existing.category,
        data.statusId ?? existing.statusId,
        data.notes ?? existing.notes,
        data.requestDate ?? existing.requestDate,
        data.completeDate ?? existing.completeDate,
        id,
      ]
    );

    const updated = await getRequestById(conn, id);

    return formatRequest(updated);
  } finally {
    if (conn) conn.release();
  }
}

/**
 * DELETE
 */
export async function deleteRequest(id) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const existing = await getRequestById(conn, id);

    if (!existing) {
      throw new ApiError(404, "Request not found");
    }

    const result = await conn.query(
      "DELETE FROM requests WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      throw new ApiError(404, "Request not found");
    }
  } finally {
    if (conn) conn.release();
  }
}