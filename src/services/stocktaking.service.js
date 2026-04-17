/**
 * Database operations for stocktaking audit entries.
 */
import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

export const stocktakingReasonValues = ["damaged", "theft", "miscounted", "supplier_error"];

function normalizeReason(value) {
  const reason = String(value || "").trim();
  return reason || null;
}

function formatEntry(row) {
  return {
    id: Number(row.id),
    inventoryItemId: Number(row.inventoryItemId),
    expectedCount: Number(row.expectedCount),
    physicalCount: Number(row.physicalCount),
    discrepancy: Number(row.discrepancy),
    reason: row.reason,
    createdAt: row.createdAt,
    inventoryItem: {
      id: Number(row.inventoryItemId),
      name: row.inventoryItemName,
      category: row.inventoryItemCategory,
      unit: row.inventoryItemUnit,
    },
  };
}

async function getEntryById(conn, id) {
  const rows = await conn.query(
    `SELECT e.id,
            e.inventory_item_id AS inventoryItemId,
            i.name AS inventoryItemName,
            i.category AS inventoryItemCategory,
            i.unit AS inventoryItemUnit,
            e.expected_count AS expectedCount,
            e.physical_count AS physicalCount,
            e.discrepancy,
            e.reason,
            DATE_FORMAT(e.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt
     FROM stocktaking_entries e
     JOIN inventory_items i ON i.id = e.inventory_item_id
     WHERE e.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function getInventoryItemById(conn, inventoryItemId) {
  const rows = await conn.query(
    `SELECT id,
            name,
            category,
            unit
     FROM inventory_items
     WHERE id = ?
     LIMIT 1`,
    [inventoryItemId]
  );

  return rows[0] || null;
}

function normalizeEntryPayload(data) {
  const inventoryItemId = Number(data.inventoryItemId);
  const expectedCount = Number(data.expectedCount);
  const physicalCount = Number(data.physicalCount);
  const reason = normalizeReason(data.reason);

  if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
    throw new ApiError(400, "Invalid inventory item id");
  }

  if (!Number.isInteger(expectedCount) || expectedCount < 0) {
    throw new ApiError(400, "Expected count must be a non-negative whole number");
  }

  if (!Number.isInteger(physicalCount) || physicalCount < 0) {
    throw new ApiError(400, "Physical count must be a non-negative whole number");
  }

  if (reason && !stocktakingReasonValues.includes(reason)) {
    throw new ApiError(400, "Invalid stocktaking reason");
  }

  const discrepancy = physicalCount - expectedCount;

  if (discrepancy !== 0 && !reason) {
    throw new ApiError(400, "Reason is required when the counts do not match");
  }

  return {
    inventoryItemId,
    expectedCount,
    physicalCount,
    discrepancy,
    reason: discrepancy === 0 ? null : reason,
  };
}

export async function listEntries() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT e.id,
              e.inventory_item_id AS inventoryItemId,
              i.name AS inventoryItemName,
              i.category AS inventoryItemCategory,
              i.unit AS inventoryItemUnit,
              e.expected_count AS expectedCount,
              e.physical_count AS physicalCount,
              e.discrepancy,
              e.reason,
              DATE_FORMAT(e.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt
       FROM stocktaking_entries e
       JOIN inventory_items i ON i.id = e.inventory_item_id
       ORDER BY e.created_at DESC`
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
    const payload = normalizeEntryPayload(data);
    const inventoryItem = await getInventoryItemById(conn, payload.inventoryItemId);

    if (!inventoryItem) {
      throw new ApiError(404, "Inventory item not found");
    }

    const result = await conn.query(
      `INSERT INTO stocktaking_entries (
        inventory_item_id,
        expected_count,
        physical_count,
        discrepancy,
        reason
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        payload.inventoryItemId,
        payload.expectedCount,
        payload.physicalCount,
        payload.discrepancy,
        payload.reason,
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

    const payload = normalizeEntryPayload(data);
    const inventoryItem = await getInventoryItemById(conn, payload.inventoryItemId);

    if (!inventoryItem) {
      throw new ApiError(404, "Inventory item not found");
    }

    await conn.query(
      `UPDATE stocktaking_entries
       SET inventory_item_id = ?,
           expected_count = ?,
           physical_count = ?,
           discrepancy = ?,
           reason = ?
       WHERE id = ?`,
      [
        payload.inventoryItemId,
        payload.expectedCount,
        payload.physicalCount,
        payload.discrepancy,
        payload.reason,
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