/**
 * Guest request business logic, including catalog matching and automatic inventory reservation.
 */
import { randomUUID } from "crypto";

import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "can",
  "extra",
  "for",
  "get",
  "i",
  "me",
  "my",
  "need",
  "of",
  "please",
  "room",
  "send",
  "some",
  "the",
  "to",
  "up",
  "with",
  "would",
  "you",
]);

const NUMBER_WORDS = new Map([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["couple", 2],
  ["pair", 2],
]);

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

function formatCatalogItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantityInStock: Number(row.quantityInStock),
    quantityReserved: Number(row.quantityReserved),
    availableQuantity: Number(row.availableQuantity),
  };
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function singularizeToken(token) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (/(ches|shes|sses|xes|zes)$/.test(token) && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenizeSearchText(value) {
  return normalizeSearchText(value)
    .split(" ")
    .map(singularizeToken)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function parseQuantityFromText(value) {
  const digitMatch = String(value || "").match(/\b(\d{1,3})\b/);

  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const tokens = normalizeSearchText(value).split(" ");

  for (const token of tokens) {
    if (NUMBER_WORDS.has(token)) {
      return NUMBER_WORDS.get(token);
    }
  }

  if (/\b(a|an)\b/i.test(String(value || ""))) {
    return 1;
  }

  return null;
}

function scoreCatalogItem(item, requestTokens, normalizedRequest) {
  const nameTokens = tokenizeSearchText(item.name);
  const categoryTokens = tokenizeSearchText(item.category);
  const unitTokens = tokenizeSearchText(item.unit);
  const normalizedName = normalizeSearchText(item.name);

  let score = 0;

  if (normalizedName && normalizedRequest.includes(normalizedName)) {
    score += 12;
  }

  for (const token of requestTokens) {
    if (nameTokens.includes(token)) {
      score += 5;
      continue;
    }

    if (categoryTokens.includes(token)) {
      score += 2;
      continue;
    }

    if (unitTokens.includes(token)) {
      score += 1;
    }
  }

  if (nameTokens.length > 0 && nameTokens.every((token) => requestTokens.includes(token))) {
    score += 4;
  }

  return score;
}

function findCatalogItemMatch(items, fullRequest) {
  const normalizedRequest = normalizeSearchText(fullRequest);
  const requestTokens = tokenizeSearchText(fullRequest);

  if (!normalizedRequest || requestTokens.length === 0) {
    return null;
  }

  let bestItem = null;
  let bestScore = 0;

  for (const item of items) {
    const score = scoreCatalogItem(item, requestTokens, normalizedRequest);

    if (score > bestScore) {
      bestItem = item;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestItem : null;
}

function resolveRequestedQuantity(data, fullRequest) {
  const explicitQuantity = Number(data.quantityRequested);

  if (Number.isInteger(explicitQuantity) && explicitQuantity > 0) {
    return explicitQuantity;
  }

  const parsedQuantity = parseQuantityFromText(fullRequest);

  if (Number.isInteger(parsedQuantity) && parsedQuantity > 0) {
    return parsedQuantity;
  }

  return 1;
}

function buildReservationReason(item, fullRequest) {
  const itemLabel = item?.name ? ` for ${item.name}` : "";
  const requestPreview = normalizeSearchText(fullRequest).slice(0, 48);
  const requestLabel = requestPreview ? `: ${requestPreview}` : "";
  return `Reserved${itemLabel}${requestLabel}`.slice(0, 100);
}

function buildAssignmentNote(fullRequest) {
  return String(fullRequest || "").trim().slice(0, 255) || null;
}

function buildAvailabilityError(item) {
  const availableQuantity = Math.max(0, Number(item.availableQuantity) || 0);
  const unitLabel = availableQuantity === 1 ? item.unit : `${item.unit}s`;
  return `Only ${availableQuantity} ${unitLabel} of ${item.name} available right now`;
}

async function listCatalogRows(conn) {
  const rows = await conn.query(
    `SELECT id,
            name,
            category,
            unit,
            quantity_in_stock AS quantityInStock,
            quantity_reserved AS quantityReserved,
            GREATEST(quantity_in_stock - quantity_reserved, 0) AS availableQuantity
     FROM inventory_items
     ORDER BY name ASC`
  );

  return rows.map(formatCatalogItem);
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

async function getRandomHousekeepingStaff(conn) {
  const rows = await conn.query(
    `SELECT id,
            first_name AS firstName,
            last_name AS lastName
     FROM staff
     WHERE role = 'housekeeping'
     ORDER BY RAND()
     LIMIT 1`
  );

  return rows[0] || null;
}

async function createInventoryReservationForRequest(conn, requestId, item, quantity, fullRequest, assignedStaffId) {
  if (Number(item.availableQuantity) < Number(quantity)) {
    throw new ApiError(409, buildAvailabilityError(item));
  }

  const stockUpdate = await conn.query(
    `UPDATE inventory_items
     SET quantity_reserved = quantity_reserved + ?
     WHERE id = ?
       AND (quantity_in_stock - quantity_reserved) >= ?`,
    [quantity, item.id, quantity]
  );

  if (!stockUpdate.affectedRows) {
    throw new ApiError(409, buildAvailabilityError(item));
  }

  await conn.query(
    `INSERT INTO request_items (
      request_id,
      inventory_item_id,
      quantity_requested,
      quantity_fulfilled
    ) VALUES (?, ?, ?, 0)`,
    [requestId, item.id, quantity]
  );

  await conn.query(
    `INSERT INTO inventory_transactions (
      inventory_item_id,
      request_id,
      staff_id,
      transaction_type,
      quantity,
      reason
    ) VALUES (?, ?, ?, 'reservation', ?, ?)`,
    [item.id, requestId, assignedStaffId, quantity, buildReservationReason(item, fullRequest)]
  );

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantityRequested: quantity,
  };
}

async function createInventoryAssignmentForRequest(conn, roomId, item, quantity, assignedStaffId, fullRequest) {
  const result = await conn.query(
    `INSERT INTO inventory_room_assignments (
      inventory_item_id,
      room_id,
      staff_id,
      quantity,
      status,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [item.id, roomId, assignedStaffId, quantity, 'started', buildAssignmentNote(fullRequest)]
  );

  return {
    id: Number(result.insertId),
    inventoryItemId: item.id,
    roomId,
    staffId: assignedStaffId,
    quantity,
    status: 'started',
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

export async function listRequestCatalog() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    return await listCatalogRows(conn);
  } finally {
    if (conn) {
      conn.release();
    }
  }
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
    await conn.beginTransaction();

    const status = await getStatusById(conn, data.statusId);

    if (!status) {
      throw new ApiError(400, "Invalid request status");
    }

    const catalogItems = await listCatalogRows(conn);
    const selectedItem = data.inventoryItemId
      ? catalogItems.find((item) => Number(item.id) === Number(data.inventoryItemId)) || null
      : null;

    if (data.inventoryItemId && !selectedItem) {
      throw new ApiError(400, "Invalid inventory item");
    }

    const matchedItem = selectedItem || findCatalogItemMatch(catalogItems, data.fullRequest);
    const quantityRequested = matchedItem ? resolveRequestedQuantity(data, data.fullRequest) : null;
    const assignedRoom = matchedItem ? await getRoomById(conn, roomId) : null;
    const assignedHousekeeping = matchedItem ? await getRandomHousekeepingStaff(conn) : null;

    if (matchedItem && !assignedRoom) {
      throw new ApiError(404, "Room not found");
    }

    if (matchedItem && !assignedHousekeeping) {
      throw new ApiError(409, "No housekeeping staff available for automatic inventory assignment");
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        roomId,
        assignedHousekeeping?.id || null,
        data.fullRequest,
        data.category || matchedItem?.category || null,
        data.statusId,
        data.notes,
        data.etaMinutes,
        completeDate,
      ]
    );

    const inventoryMatch = matchedItem && !isTerminalStatus(status.code)
      ? await createInventoryReservationForRequest(
          conn,
          requestId,
          matchedItem,
          quantityRequested,
          data.fullRequest,
          assignedHousekeeping.id
        )
      : null;

    const inventoryAssignment = matchedItem && !isTerminalStatus(status.code)
      ? await createInventoryAssignmentForRequest(
          conn,
          roomId,
          matchedItem,
          quantityRequested,
          assignedHousekeeping.id,
          data.fullRequest
        )
      : null;

    await conn.commit();

    const created = await getRequestById(conn, requestId, roomId);

    return {
      ...formatRequest(created),
      inventoryMatch,
      inventoryAssignment,
    };
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