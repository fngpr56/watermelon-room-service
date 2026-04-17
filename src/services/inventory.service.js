/**
 * Inventory business logic for stock levels, room assignments, and audit transactions.
 */
import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function formatItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantityInStock: Number(row.quantityInStock),
    quantityReserved: Number(row.quantityReserved),
    lowStockThreshold: Number(row.lowStockThreshold),
  };
}

function formatAssignment(row) {
  return {
    id: row.id,
    quantity: Number(row.quantity),
    status: row.status,
    notes: row.notes,
    assignedAt: row.assignedAt,
    room: {
      id: row.roomId,
      roomNumber: row.roomNumber,
      owner: row.roomOwner,
      displayName: row.roomOwner ? `Room ${row.roomNumber} - ${row.roomOwner}` : `Room ${row.roomNumber}`,
    },
    inventoryItem: {
      id: row.inventoryItemId,
      name: row.inventoryItemName,
      category: row.inventoryItemCategory,
      unit: row.inventoryItemUnit,
    },
    staff: {
      id: row.staffId,
      displayName: row.staffName,
    },
  };
}

function buildAssignmentReason(room, notes) {
  const baseReason = room?.roomNumber ? `Assigned to room ${room.roomNumber}` : "Assigned to room";
  const extra = notes ? `: ${notes}` : "";
  return `${baseReason}${extra}`.slice(0, 100);
}

function buildAssignmentUpdateReason(assignmentId, room, notes) {
  const baseReason = room?.roomNumber
    ? `Updated assignment ${assignmentId} for room ${room.roomNumber}`
    : `Updated assignment ${assignmentId}`;
  const extra = notes ? `: ${notes}` : "";
  return `${baseReason}${extra}`.slice(0, 100);
}

function buildAssignmentDeleteReason(assignmentId, room) {
  const baseReason = room?.roomNumber
    ? `Deleted assignment ${assignmentId} for room ${room.roomNumber}`
    : `Deleted assignment ${assignmentId}`;
  return baseReason.slice(0, 100);
}

function assertStockLevels(quantityInStock, quantityReserved) {
  if (Number(quantityReserved) > Number(quantityInStock)) {
    throw new ApiError(400, "Reserved quantity cannot exceed stock quantity");
  }
}

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

async function getRoomById(conn, roomId) {
  const rows = await conn.query(
    `SELECT id,
            room_number AS roomNumber,
            owner AS roomOwner
     FROM rooms
     WHERE id = ?
     LIMIT 1`,
    [roomId]
  );

  return rows[0] || null;
}

async function getInventoryAssignmentById(conn, assignmentId) {
  const rows = await conn.query(
    `SELECT a.id,
            a.inventory_item_id AS inventoryItemId,
            i.name AS inventoryItemName,
            i.category AS inventoryItemCategory,
            i.unit AS inventoryItemUnit,
            a.room_id AS roomId,
            r.room_number AS roomNumber,
            r.owner AS roomOwner,
            a.staff_id AS staffId,
            CASE
              WHEN s.id IS NULL THEN 'Unknown staff'
              ELSE CONCAT(s.first_name, ' ', s.last_name)
            END AS staffName,
            a.quantity,
            a.status AS status,
            a.notes,
            DATE_FORMAT(a.assigned_at, '%Y-%m-%dT%H:%i:%s') AS assignedAt
     FROM inventory_room_assignments a
     JOIN inventory_items i ON i.id = a.inventory_item_id
     JOIN rooms r ON r.id = a.room_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.id = ?
     LIMIT 1`,
    [assignmentId]
  );

  return rows[0] || null;
}

async function increaseStock(conn, itemId, quantity) {
  if (Number(quantity) <= 0) {
    return;
  }

  await conn.query(
    `UPDATE inventory_items
     SET quantity_in_stock = quantity_in_stock + ?
     WHERE id = ?`,
    [quantity, itemId]
  );
}

async function decreaseStock(conn, itemId, quantity) {
  if (Number(quantity) <= 0) {
    return;
  }

  const result = await conn.query(
    `UPDATE inventory_items
     SET quantity_in_stock = quantity_in_stock - ?
     WHERE id = ?
       AND quantity_in_stock >= ?`,
    [quantity, itemId, quantity]
  );

  if (!result.affectedRows) {
    throw new ApiError(409, "Not enough inventory in stock");
  }
}

async function createInventoryAdjustmentTransaction(conn, itemId, staffId, quantity, reason) {
  if (!Number(quantity)) {
    return;
  }

  await conn.query(
    `INSERT INTO inventory_transactions (
      inventory_item_id,
      request_id,
      staff_id,
      transaction_type,
      quantity,
      reason
    ) VALUES (?, NULL, ?, 'manual_adjustment', ?, ?)`,
    [itemId, staffId, quantity, reason]
  );
}

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

export async function listInventoryAssignments() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT a.id,
              a.inventory_item_id AS inventoryItemId,
              i.name AS inventoryItemName,
              i.category AS inventoryItemCategory,
              i.unit AS inventoryItemUnit,
              a.room_id AS roomId,
              r.room_number AS roomNumber,
              r.owner AS roomOwner,
              a.staff_id AS staffId,
              CASE
                WHEN s.id IS NULL THEN 'Unknown staff'
                ELSE CONCAT(s.first_name, ' ', s.last_name)
              END AS staffName,
              a.quantity,
              a.status AS status,
              a.notes,
              DATE_FORMAT(a.assigned_at, '%Y-%m-%dT%H:%i:%s') AS assignedAt
       FROM inventory_room_assignments a
       JOIN inventory_items i ON i.id = a.inventory_item_id
       JOIN rooms r ON r.id = a.room_id
       LEFT JOIN staff s ON s.id = a.staff_id
       ORDER BY a.assigned_at DESC, a.id DESC`
    );

    return rows.map(formatAssignment);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function createInventoryItem(data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    assertStockLevels(data.quantityInStock ?? 0, data.quantityReserved ?? 0);

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

export async function updateInventoryItem(id, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const existing = await getItemById(conn, id);

    if (!existing) {
      throw new ApiError(404, "Inventory item not found");
    }

    const nextQuantityInStock = data.quantityInStock ?? existing.quantityInStock;
    const nextQuantityReserved = data.quantityReserved ?? existing.quantityReserved;
    assertStockLevels(nextQuantityInStock, nextQuantityReserved);

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
        nextQuantityInStock,
        nextQuantityReserved,
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

export async function assignInventoryToRoom(data, staffSession) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const item = await getItemById(conn, data.inventoryItemId);

    if (!item) {
      throw new ApiError(404, "Inventory item not found");
    }

    if (Number(item.quantityInStock) < Number(data.quantity)) {
      throw new ApiError(409, "Not enough inventory in stock");
    }

    const room = await getRoomById(conn, data.roomId);

    if (!room) {
      throw new ApiError(404, "Room not found");
    }

    const stockUpdate = await conn.query(
      `UPDATE inventory_items
       SET quantity_in_stock = quantity_in_stock - ?
       WHERE id = ?
         AND quantity_in_stock >= ?`,
      [data.quantity, data.inventoryItemId, data.quantity]
    );

    if (!stockUpdate.affectedRows) {
      throw new ApiError(409, "Not enough inventory in stock");
    }

    const assignmentResult = await conn.query(
      `INSERT INTO inventory_room_assignments (
        inventory_item_id,
        room_id,
        staff_id,
        quantity,
        status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.inventoryItemId,
        data.roomId,
        staffSession.staffId,
        data.quantity,
        data.status,
        data.notes || null,
      ]
    );

    await conn.query(
      `INSERT INTO inventory_transactions (
        inventory_item_id,
        request_id,
        staff_id,
        transaction_type,
        quantity,
        reason
      ) VALUES (?, NULL, ?, 'room_assignment', ?, ?)`,
      [data.inventoryItemId, staffSession.staffId, data.quantity, buildAssignmentReason(room, data.notes)]
    );

    await conn.commit();

    const created = await getInventoryAssignmentById(conn, Number(assignmentResult.insertId));
    return formatAssignment(created);
  } catch (error) {
    if (conn) {
      await conn.rollback();
    }

    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function updateInventoryAssignment(assignmentId, data, staffSession) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const existing = await getInventoryAssignmentById(conn, assignmentId);

    if (!existing) {
      throw new ApiError(404, "Inventory assignment not found");
    }

    const room = await getRoomById(conn, data.roomId);

    if (!room) {
      throw new ApiError(404, "Room not found");
    }

    const nextItem = await getItemById(conn, data.inventoryItemId);

    if (!nextItem) {
      throw new ApiError(404, "Inventory item not found");
    }

    const sameItem = Number(existing.inventoryItemId) === Number(data.inventoryItemId);

    if (sameItem) {
      const quantityDelta = Number(data.quantity) - Number(existing.quantity);

      if (quantityDelta > 0) {
        await decreaseStock(conn, data.inventoryItemId, quantityDelta);
        await createInventoryAdjustmentTransaction(
          conn,
          data.inventoryItemId,
          staffSession.staffId,
          quantityDelta,
          buildAssignmentUpdateReason(assignmentId, room, data.notes)
        );
      } else if (quantityDelta < 0) {
        await increaseStock(conn, data.inventoryItemId, Math.abs(quantityDelta));
        await createInventoryAdjustmentTransaction(
          conn,
          data.inventoryItemId,
          staffSession.staffId,
          quantityDelta,
          buildAssignmentUpdateReason(assignmentId, room, data.notes)
        );
      }
    } else {
      await increaseStock(conn, existing.inventoryItemId, existing.quantity);
      await createInventoryAdjustmentTransaction(
        conn,
        existing.inventoryItemId,
        staffSession.staffId,
        -Number(existing.quantity),
        `Returned stock while updating assignment ${assignmentId}`.slice(0, 100)
      );

      await decreaseStock(conn, data.inventoryItemId, data.quantity);
      await createInventoryAdjustmentTransaction(
        conn,
        data.inventoryItemId,
        staffSession.staffId,
        Number(data.quantity),
        buildAssignmentUpdateReason(assignmentId, room, data.notes)
      );
    }

    await conn.query(
      `UPDATE inventory_room_assignments
       SET inventory_item_id = ?,
           room_id = ?,
           staff_id = ?,
           quantity = ?,
           status = ?,
           notes = ?,
           assigned_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.inventoryItemId,
        data.roomId,
        staffSession.staffId,
        data.quantity,
        data.status,
        data.notes || null,
        assignmentId,
      ]
    );

    await conn.commit();

    const updated = await getInventoryAssignmentById(conn, assignmentId);
    return formatAssignment(updated);
  } catch (error) {
    if (conn) {
      await conn.rollback();
    }

    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function deleteInventoryAssignment(assignmentId, staffSession) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const existing = await getInventoryAssignmentById(conn, assignmentId);

    if (!existing) {
      throw new ApiError(404, "Inventory assignment not found");
    }

    await increaseStock(conn, existing.inventoryItemId, existing.quantity);
    await createInventoryAdjustmentTransaction(
      conn,
      existing.inventoryItemId,
      staffSession.staffId,
      -Number(existing.quantity),
      buildAssignmentDeleteReason(assignmentId, existing)
    );

    const result = await conn.query(
      `DELETE FROM inventory_room_assignments
       WHERE id = ?`,
      [assignmentId]
    );

    if (!result.affectedRows) {
      throw new ApiError(404, "Inventory assignment not found");
    }

    await conn.commit();

    return formatAssignment(existing);
  } catch (error) {
    if (conn) {
      await conn.rollback();
    }

    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}