import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function formatStatus(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

async function getStatusById(conn, id) {
  const rows = await conn.query(
    `SELECT id, name, color
     FROM request_statuses
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

export async function listRequestStatuses() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT id, name, color FROM request_statuses ORDER BY id ASC`);
    return rows.map(formatStatus);
  } finally {
    if (conn) conn.release();
  }
}

export async function createRequestStatus(data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO request_statuses (name, color) VALUES (?, ?)`,
      [data.name, data.color || null]
    );

    const created = await getStatusById(conn, Number(result.insertId));
    return formatStatus(created);
  } finally {
    if (conn) conn.release();
  }
}

export async function updateRequestStatus(statusId, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getStatusById(conn, statusId);

    if (!existing) {
      throw new ApiError(404, "Status not found");
    }

    await conn.query(`UPDATE request_statuses SET name = ?, color = ? WHERE id = ?`, [data.name, data.color || null, statusId]);

    const updated = await getStatusById(conn, statusId);
    return formatStatus(updated);
  } finally {
    if (conn) conn.release();
  }
}

export async function deleteRequestStatus(statusId) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getStatusById(conn, statusId);

    if (!existing) {
      throw new ApiError(404, "Status not found");
    }

    const result = await conn.query(`DELETE FROM request_statuses WHERE id = ?`, [statusId]);

    if (!result.affectedRows) {
      throw new ApiError(404, "Status not found");
    }
  } finally {
    if (conn) conn.release();
  }
}

export default {
  listRequestStatuses,
  createRequestStatus,
  updateRequestStatus,
  deleteRequestStatus,
};
