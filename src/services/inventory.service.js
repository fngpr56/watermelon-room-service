import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

/**
 * FORMAT RESPONSE
 */
function formatItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantityInStock: row.quantityInStock,
    quantityReserved: row.quantityReserved,
    lowStockThreshold: row.lowStockThreshold,
  };
}

/**
 * GET BY ID
 */
async function getItemById(conn, id) {
  const rows = await conn.query(
    `SELECT
        id,
        name,
        category,
        unit,
        quantity_in_stock AS quantityInStock,
        quantity_reserved AS quantityReserved,
        low_stock_threshold AS lowStockThreshold
     FROM inventory_items
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

/**
 * LIST
 */
export async function listInventoryItems() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT
          id,
          name,
          category,
          unit,
          quantity_in_stock AS quantityInStock,
          quantity_reserved AS quantityReserved,
          low_stock_threshold AS lowStockThreshold
       FROM inventory_items
       ORDER BY name ASC`
    );

    return rows.map(formatItem);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

/**
 * CREATE
 */
export async function createInventoryItem(data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      `INSERT INTO inventory_items (
        name,
        category,
        unit,
        quantity_in_stock,
        quantity_reserved,
        low_stock_threshold
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.category,
        data.unit,
        data.quantityInStock ?? 0,
        data.quantityReserved ?? 0,
        data.lowStockThreshold ?? 0,
      ]
    );

    const created = await getItemById(conn, result.insertId);

    return formatItem(created);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

/**
 * UPDATE
 */
export async function updateInventoryItem(id, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const existing = await getItemById(conn, id);

    if (!existing) {
      throw new ApiError(404, "Inventory item not found");
    }

    await conn.query(
      `UPDATE inventory_items
         SET name = ?,
             category = ?,
             unit = ?,
             quantity_in_stock = ?,
             quantity_reserved = ?,
             low_stock_threshold = ?
       WHERE id = ?`,
      [
        data.name ?? existing.name,
        data.category ?? existing.category,
        data.unit ?? existing.unit,
        data.quantityInStock ?? existing.quantityInStock,
        data.quantityReserved ?? existing.quantityReserved,
        data.lowStockThreshold ?? existing.lowStockThreshold,
        id,
      ]
    );

    const updated = await getItemById(conn, id);

    return formatItem(updated);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

/**
 * DELETE
 */
export async function deleteInventoryItem(id) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const existing = await getItemById(conn, id);

    if (!existing) {
      throw new ApiError(404, "Inventory item not found");
    }

    const result = await conn.query(
      "DELETE FROM inventory_items WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      throw new ApiError(404, "Inventory item not found");
    }
  } finally {
    if (conn) {
      conn.release();
    }
  }
}