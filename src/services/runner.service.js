/**
 * Runner queue queries and state transitions for inventory-backed guest requests.
 */
import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

const runnerRequestSelect = `SELECT r.id,
                                    r.room_id AS roomId,
                                    rm.room_number AS roomNumber,
                                    rm.owner AS roomOwner,
                                    r.staff_id AS staffId,
                                    CASE
                                      WHEN s.id IS NULL THEN NULL
                                      ELSE CONCAT(s.first_name, ' ', s.last_name)
                                    END AS staffName,
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
                             LEFT JOIN staff s ON s.id = r.staff_id
                             WHERE EXISTS (
                               SELECT 1
                               FROM request_items ri
                               WHERE ri.request_id = r.id
                             )`;

function formatRunnerRequestItem(row) {
  const quantityRequested = Number(row.quantityRequested || 0);
  const quantityFulfilled = Number(row.quantityFulfilled || 0);

  return {
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    inventoryItem: {
      id: row.inventoryItemId,
      name: row.inventoryItemName,
      category: row.inventoryItemCategory,
      unit: row.inventoryItemUnit,
    },
    quantityRequested,
    quantityFulfilled,
    remainingQuantity: Math.max(quantityRequested - quantityFulfilled, 0),
  };
}

function formatRunnerRequest(row, items) {
  return {
    id: row.id,
    fullRequest: row.fullRequest,
    category: row.category,
    notes: row.notes,
    etaMinutes: row.etaMinutes,
    requestDate: row.requestDate,
    completeDate: row.completeDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    room: {
      id: row.roomId,
      roomNumber: row.roomNumber,
      owner: row.roomOwner,
      displayName: row.roomOwner ? `Room ${row.roomNumber} - ${row.roomOwner}` : `Room ${row.roomNumber}`,
    },
    staff: {
      id: row.staffId,
      displayName: row.staffName,
    },
    status: {
      id: row.statusId,
      code: row.statusCode,
      label: row.statusLabel,
      color: row.statusColor,
    },
    items,
  };
}

function formatDateTimeForSql(value = new Date()) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function buildReleaseReason(requestId, itemName) {
  return `Runner declined ${itemName} for request ${String(requestId).slice(0, 8)}`.slice(0, 100);
}

function buildFulfillmentReason(requestId, itemName) {
  return `Runner delivered ${itemName} for request ${String(requestId).slice(0, 8)}`.slice(0, 100);
}

function buildAssignmentNote(fullRequest) {
  return String(fullRequest || "").trim().slice(0, 255) || null;
}

async function getStatusByCode(conn, code) {
  const rows = await conn.query(
    `SELECT id, code, label, color
     FROM request_statuses
     WHERE code = ?
     LIMIT 1`,
    [code]
  );

  return rows[0] || null;
}

async function getRunnerRequestRowById(conn, requestId) {
  const rows = await conn.query(`${runnerRequestSelect} AND r.id = ? LIMIT 1`, [requestId]);
  return rows[0] || null;
}

async function listRunnerRequestRows(conn) {
  return conn.query(
    `${runnerRequestSelect}
      ORDER BY FIELD(rs.code, 'received', 'in_progress', 'partially_delivered', 'delivered', 'rejected', 'cancelled'),
               r.request_date DESC,
               r.created_at DESC`
  );
}

async function listRunnerItemsForRequestIds(conn, requestIds) {
  if (requestIds.length === 0) {
    return new Map();
  }

  const placeholders = requestIds.map(() => "?").join(", ");
  const rows = await conn.query(
    `SELECT ri.id,
            ri.request_id AS requestId,
            ri.inventory_item_id AS inventoryItemId,
            i.name AS inventoryItemName,
            i.category AS inventoryItemCategory,
            i.unit AS inventoryItemUnit,
            ri.quantity_requested AS quantityRequested,
            ri.quantity_fulfilled AS quantityFulfilled
     FROM request_items ri
     JOIN inventory_items i ON i.id = ri.inventory_item_id
     WHERE ri.request_id IN (${placeholders})
     ORDER BY ri.id ASC`,
    requestIds
  );

  const itemMap = new Map();

  for (const row of rows) {
    const requestItems = itemMap.get(row.requestId) || [];
    requestItems.push(formatRunnerRequestItem(row));
    itemMap.set(row.requestId, requestItems);
  }

  return itemMap;
}

async function getRunnerRequestDetails(conn, requestId) {
  const row = await getRunnerRequestRowById(conn, requestId);

  if (!row) {
    return null;
  }

  const itemMap = await listRunnerItemsForRequestIds(conn, [requestId]);
  return formatRunnerRequest(row, itemMap.get(requestId) || []);
}

function assertRunnerRequestExists(request) {
  if (!request) {
    throw new ApiError(404, "Runner request not found");
  }

  if (!Array.isArray(request.items) || request.items.length === 0) {
    throw new ApiError(409, "This request is not an inventory-backed runner request");
  }
}

function appendNote(existing, nextNote) {
  const current = String(existing || "").trim();
  const addition = String(nextNote || "").trim();

  if (!addition) {
    return current || null;
  }

  if (!current) {
    return addition.slice(0, 2000);
  }

  return `${current}\n${addition}`.slice(0, 2000);
}

async function releaseReservedItem(conn, requestId, item, staffId) {
  if (item.remainingQuantity <= 0) {
    return;
  }

  const releaseResult = await conn.query(
    `UPDATE inventory_items
     SET quantity_reserved = quantity_reserved - ?
     WHERE id = ?
       AND quantity_reserved >= ?`,
    [item.remainingQuantity, item.inventoryItem.id, item.remainingQuantity]
  );

  if (!releaseResult.affectedRows) {
    throw new ApiError(409, `Reserved inventory for ${item.inventoryItem.name} could not be released`);
  }

  await conn.query(
    `INSERT INTO inventory_transactions (
      inventory_item_id,
      request_id,
      staff_id,
      transaction_type,
      quantity,
      reason
    ) VALUES (?, ?, ?, 'release', ?, ?)`,
    [
      item.inventoryItem.id,
      requestId,
      staffId,
      item.remainingQuantity,
      buildReleaseReason(requestId, item.inventoryItem.name),
    ]
  );
}

async function fulfillReservedItem(conn, request, item, staffId) {
  if (item.remainingQuantity <= 0) {
    return;
  }

  const fulfillmentResult = await conn.query(
    `UPDATE inventory_items
     SET quantity_reserved = quantity_reserved - ?,
         quantity_in_stock = quantity_in_stock - ?
     WHERE id = ?
       AND quantity_reserved >= ?
       AND quantity_in_stock >= ?`,
    [item.remainingQuantity, item.remainingQuantity, item.inventoryItem.id, item.remainingQuantity, item.remainingQuantity]
  );

  if (!fulfillmentResult.affectedRows) {
    throw new ApiError(409, `Inventory for ${item.inventoryItem.name} changed before delivery could be completed`);
  }

  await conn.query(
    `UPDATE request_items
     SET quantity_fulfilled = quantity_requested
     WHERE id = ?`,
    [item.id]
  );

  await conn.query(
    `INSERT INTO inventory_transactions (
      inventory_item_id,
      request_id,
      staff_id,
      transaction_type,
      quantity,
      reason
    ) VALUES (?, ?, ?, 'fulfillment', ?, ?)`,
    [
      item.inventoryItem.id,
      request.id,
      staffId,
      item.remainingQuantity,
      buildFulfillmentReason(request.id, item.inventoryItem.name),
    ]
  );

  await conn.query(
    `INSERT INTO inventory_room_assignments (
      inventory_item_id,
      room_id,
      staff_id,
      quantity,
      status,
      notes
    ) VALUES (?, ?, ?, ?, 'completed', ?)`,
    [
      item.inventoryItem.id,
      request.room.id,
      staffId,
      item.remainingQuantity,
      buildAssignmentNote(request.fullRequest),
    ]
  );
}

export async function listRunnerRequests() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const rows = await listRunnerRequestRows(conn);
    const requestIds = rows.map((row) => row.id);
    const itemMap = await listRunnerItemsForRequestIds(conn, requestIds);
    return rows.map((row) => formatRunnerRequest(row, itemMap.get(row.id) || []));
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function acceptRunnerRequest(requestId, staffSession) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const request = await getRunnerRequestDetails(conn, requestId);
    assertRunnerRequestExists(request);

    if (request.status.code !== "received") {
      throw new ApiError(409, "Only newly received runner requests can be accepted");
    }

    const inProgressStatus = await getStatusByCode(conn, "in_progress");

    if (!inProgressStatus) {
      throw new ApiError(500, "Required request status configuration is missing: in_progress");
    }

    await conn.query(
      `UPDATE requests
       SET staff_id = ?,
           status_id = ?,
           complete_date = NULL
       WHERE id = ?`,
      [staffSession.staffId, inProgressStatus.id, requestId]
    );

    await conn.commit();
    return getRunnerRequestDetails(conn, requestId);
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

export async function declineRunnerRequest(requestId, staffSession) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const request = await getRunnerRequestDetails(conn, requestId);
    assertRunnerRequestExists(request);

    if (request.status.code !== "received") {
      throw new ApiError(409, "Only newly received runner requests can be declined");
    }

    const rejectedStatus = await getStatusByCode(conn, "rejected");

    if (!rejectedStatus) {
      throw new ApiError(500, "Required request status configuration is missing: rejected");
    }

    for (const item of request.items) {
      await releaseReservedItem(conn, requestId, item, staffSession.staffId);
    }

    await conn.query(
      `UPDATE requests
       SET staff_id = ?,
           status_id = ?,
           notes = ?,
           complete_date = ?
       WHERE id = ?`,
      [
        staffSession.staffId,
        rejectedStatus.id,
        appendNote(request.notes, "Declined by runner."),
        formatDateTimeForSql(),
        requestId,
      ]
    );

    await conn.commit();
    return getRunnerRequestDetails(conn, requestId);
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

export async function completeRunnerRequest(requestId, staffSession) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const request = await getRunnerRequestDetails(conn, requestId);
    assertRunnerRequestExists(request);

    if (Number(request.staff.id) !== Number(staffSession.staffId)) {
      throw new ApiError(403, "You can only complete requests assigned to your runner account");
    }

    if (!["in_progress", "partially_delivered"].includes(request.status.code)) {
      throw new ApiError(409, "Only accepted runner requests can be marked delivered");
    }

    const deliveredStatus = await getStatusByCode(conn, "delivered");

    if (!deliveredStatus) {
      throw new ApiError(500, "Required request status configuration is missing: delivered");
    }

    for (const item of request.items) {
      await fulfillReservedItem(conn, request, item, staffSession.staffId);
    }

    await conn.query(
      `UPDATE requests
       SET staff_id = ?,
           status_id = ?,
           complete_date = ?
       WHERE id = ?`,
      [staffSession.staffId, deliveredStatus.id, formatDateTimeForSql(), requestId]
    );

    await conn.commit();
    return getRunnerRequestDetails(conn, requestId);
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