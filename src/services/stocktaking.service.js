/**
 * Database operations for stocktaking audit entries.
 */
import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function formatEntry(row) {
  return {
    id: row.id,
    inventoryItemId: row.inventoryItem_id,
    expectedCount: row.expected_count,
    physicalCount: row.physical_count,
    discrepancy: row.discrepancy,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

async function getEntryById(conn, id) {
  const rows = await conn.query(
    `SELECT *
     FROM stocktaking_entries
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

export async function listEntries() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT *
       FROM stocktaking_entries
       ORDER BY created_at DESC`
    );

    return rows.map(formatEntry);
  } finally {
    if (conn) conn.release();
  }
}

export async function createEntry(data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const discrepancy = data.physicalCount - data.expectedCount;

    const result = await conn.query(
      `INSERT INTO stocktaking_entries (
        inventory_item_id,
        expected_count,
        physical_count,
        discrepancy,
        reason
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        data.inventoryItemId,
        data.expectedCount,
        data.physicalCount,
        discrepancy,
        data.reason || null,
      ]
    );

    const created = await getEntryById(conn, result.insertId);
    return formatEntry(created);
  } finally {
    if (conn) conn.release();
  }
}

export async function updateEntry(id, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const existing = await getEntryById(conn, id);
    if (!existing) {
      throw new ApiError(404, "Stocktaking entry not found");
    }

    const discrepancy = data.physicalCount - data.expectedCount;

    await conn.query(
      `UPDATE stocktaking_entries
       SET inventory_item_id = ?,
           expected_count = ?,
           physical_count = ?,
           discrepancy = ?,
           reason = ?
       WHERE id = ?`,
      [
        data.inventoryItemId,
        data.expectedCount,
        data.physicalCount,
        discrepancy,
        data.reason || null,
        id,
      ]
    );

    const updated = await getEntryById(conn, id);
    return formatEntry(updated);
  } finally {
    if (conn) conn.release();
  }
}

export async function deleteEntry(id) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const existing = await getEntryById(conn, id);
    if (!existing) {
      throw new ApiError(404, "Stocktaking entry not found");
    }

    await conn.query(
      `DELETE FROM stocktaking_entries WHERE id = ?`,
      [id]
    );
  } finally {
    if (conn) conn.release();
  }
}