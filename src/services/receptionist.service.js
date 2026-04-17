/**
 * Aggregated hotel operations data used by the receptionist overview page.
 */
import { getPool } from "../config/db.js";

const STOCKTAKING_REASON_LABELS = {
  damaged: "Damaged",
  theft: "Theft",
  miscounted: "Miscounted",
  supplier_error: "Supplier Error",
};

function toNumber(value) {
  return Number(value || 0);
}

function normalizeCategory(value) {
  const category = String(value || "").trim();
  return category || "uncategorized";
}

function formatCategoryLabel(value) {
  return normalizeCategory(value)
    .split(/[_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateKey(value) {
  return value.toISOString().slice(0, 10);
}

function formatShortDate(value) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthLabel(value = new Date()) {
  return value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildRequestVolume(rows, days = 7) {
  const requestCountByDay = new Map(rows.map((row) => [String(row.requestDay), toNumber(row.requestCount)]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const date = formatDateKey(day);

    items.push({
      date,
      label: formatShortDate(day),
      count: requestCountByDay.get(date) || 0,
    });
  }

  return items;
}

function buildStatusBreakdown(rows) {
  const total = rows.reduce((sum, row) => sum + toNumber(row.requestCount), 0);

  return rows.map((row) => {
    const count = toNumber(row.requestCount);

    return {
      code: row.code,
      label: row.label,
      color: row.color,
      count,
      share: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    };
  });
}

function buildCategoryBreakdown(rows) {
  const total = rows.reduce((sum, row) => sum + toNumber(row.requestCount), 0);

  return rows.map((row) => {
    const count = toNumber(row.requestCount);

    return {
      category: normalizeCategory(row.category),
      label: formatCategoryLabel(row.category),
      count,
      share: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    };
  });
}

function buildInventoryCatalog(rows) {
  return rows.map((row) => ({
    id: toNumber(row.id),
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantityInStock: toNumber(row.quantityInStock),
  }));
}

function buildCurrentMonthStocktakingSummary(row) {
  return {
    totalEntries: toNumber(row?.totalEntries),
    mismatchEntries: toNumber(row?.mismatchEntries),
    totalAbsoluteDifference: toNumber(row?.totalAbsoluteDifference),
    lastEntryAt: row?.lastEntryAt || null,
  };
}

function buildCurrentMonthStocktakingReasonBreakdown(rows) {
  const total = rows.reduce((sum, row) => sum + toNumber(row.entryCount), 0);

  return rows.map((row) => {
    const count = toNumber(row.entryCount);
    const code = String(row.reason || "miscounted");

    return {
      code,
      label: STOCKTAKING_REASON_LABELS[code] || code,
      count,
      share: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    };
  });
}

function buildCurrentMonthStocktakingActivity(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const activityByDay = new Map(
    rows.map((row) => [String(row.entryDay), {
      count: toNumber(row.entryCount),
      totalAbsoluteDifference: toNumber(row.totalAbsoluteDifference),
    }])
  );

  const items = [];
  const cursor = new Date(monthStart);

  while (cursor.getTime() <= today.getTime()) {
    const key = formatDateKey(cursor);
    const activity = activityByDay.get(key) || { count: 0, totalAbsoluteDifference: 0 };

    items.push({
      date: key,
      label: String(cursor.getDate()),
      count: activity.count,
      totalAbsoluteDifference: activity.totalAbsoluteDifference,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return items;
}

function buildCurrentMonthStocktakingEntries(rows) {
  return rows.map((row) => ({
    id: toNumber(row.id),
    expectedCount: toNumber(row.expectedCount),
    physicalCount: toNumber(row.physicalCount),
    discrepancy: toNumber(row.discrepancy),
    reason: row.reason,
    reasonLabel: row.reason ? STOCKTAKING_REASON_LABELS[row.reason] || row.reason : null,
    createdAt: row.createdAt,
    inventoryItem: {
      id: toNumber(row.inventoryItemId),
      name: row.inventoryItemName,
      category: row.inventoryItemCategory,
      unit: row.inventoryItemUnit,
    },
  }));
}

function buildUpcomingDepartures(roomRows) {
  const now = new Date();

  return roomRows
    .map((row) => ({
      roomId: toNumber(row.roomId),
      roomNumber: toNumber(row.roomNumber),
      owner: row.owner,
      dateOut: row.dateOut || null,
    }))
    .filter((room) => {
      const dateOut = parseDateValue(room.dateOut);
      return dateOut && dateOut.getTime() >= now.getTime();
    })
    .sort((left, right) => parseDateValue(left.dateOut) - parseDateValue(right.dateOut))
    .slice(0, 6);
}

function buildAwaitingReplies(rows) {
  return rows.map((row) => ({
    conversationId: toNumber(row.conversationId),
    roomId: toNumber(row.roomId),
    roomNumber: toNumber(row.roomNumber),
    owner: row.owner,
    lastMessageAt: row.lastMessageAt,
    assignedStaffName: row.assignedStaffName,
    lastMessagePreview: row.lastMessagePreview,
  }));
}

function buildAttentionRooms(roomRows, openRequestRows, awaitingReplies) {
  const openRequestsByRoomId = new Map(
    openRequestRows.map((row) => [toNumber(row.roomId), {
      openRequestCount: toNumber(row.openRequestCount),
      lastOpenRequestAt: row.lastOpenRequestAt || null,
    }])
  );
  const awaitingRepliesByRoomId = new Map(awaitingReplies.map((row) => [toNumber(row.roomId), row]));

  return roomRows
    .map((row) => {
      const roomId = toNumber(row.roomId);
      const openRequestData = openRequestsByRoomId.get(roomId) || { openRequestCount: 0, lastOpenRequestAt: null };
      const awaitingReply = awaitingRepliesByRoomId.get(roomId) || null;

      return {
        roomId,
        roomNumber: toNumber(row.roomNumber),
        owner: row.owner,
        dateOut: row.dateOut || null,
        openRequestCount: openRequestData.openRequestCount,
        lastOpenRequestAt: openRequestData.lastOpenRequestAt,
        awaitingGuestResponse: Boolean(awaitingReply),
        lastGuestMessageAt: awaitingReply?.lastMessageAt || null,
        assignedStaffName: awaitingReply?.assignedStaffName || null,
        lastMessagePreview: awaitingReply?.lastMessagePreview || null,
      };
    })
    .filter((room) => room.openRequestCount > 0 || room.awaitingGuestResponse)
    .sort((left, right) => {
      if (Number(right.awaitingGuestResponse) !== Number(left.awaitingGuestResponse)) {
        return Number(right.awaitingGuestResponse) - Number(left.awaitingGuestResponse);
      }

      if (right.openRequestCount !== left.openRequestCount) {
        return right.openRequestCount - left.openRequestCount;
      }

      const leftActivityTime = parseDateValue(left.lastGuestMessageAt || left.lastOpenRequestAt)?.getTime() || 0;
      const rightActivityTime = parseDateValue(right.lastGuestMessageAt || right.lastOpenRequestAt)?.getTime() || 0;
      return rightActivityTime - leftActivityTime;
    })
    .slice(0, 6);
}

function buildRecentRequests(rows) {
  return rows.map((row) => ({
    id: row.id,
    roomId: toNumber(row.roomId),
    roomNumber: toNumber(row.roomNumber),
    owner: row.roomOwner,
    fullRequest: row.fullRequest,
    category: normalizeCategory(row.category),
    categoryLabel: formatCategoryLabel(row.category),
    etaMinutes: row.etaMinutes === null ? null : toNumber(row.etaMinutes),
    requestDate: row.requestDate,
    staffName: row.staffName,
    status: {
      code: row.statusCode,
      label: row.statusLabel,
      color: row.statusColor,
    },
  }));
}

export async function getReceptionistOverview() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    const summaryRows = await conn.query(
      `SELECT
         (SELECT COUNT(*)
          FROM rooms
          WHERE date_in IS NOT NULL
            AND date_in <= NOW()
            AND (date_out IS NULL OR date_out >= NOW())) AS occupiedRooms,
         (SELECT COUNT(*)
          FROM rooms
          WHERE date_in IS NOT NULL
            AND DATE(date_in) = CURDATE()) AS arrivalsToday,
         (SELECT COUNT(*)
          FROM rooms
          WHERE date_out IS NOT NULL
            AND DATE(date_out) = CURDATE()) AS departuresToday,
         (SELECT COUNT(*)
          FROM rooms
          WHERE date_out IS NOT NULL
            AND DATE(date_out) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS departuresTomorrow,
         (SELECT COUNT(*)
          FROM requests r
          JOIN request_statuses rs ON rs.id = r.status_id
          WHERE rs.code IN ('received', 'in_progress', 'partially_delivered')) AS openRequests,
         (SELECT COUNT(*)
          FROM room_conversations rc
          JOIN room_conversation_messages last_message ON last_message.id = (
            SELECT rcm.id
            FROM room_conversation_messages rcm
            WHERE rcm.conversation_id = rc.id
            ORDER BY rcm.id DESC
            LIMIT 1
          )
          WHERE last_message.sender_type = 'guest') AS awaitingGuestResponses,
         (SELECT COUNT(*)
          FROM inventory_items
          WHERE quantity_in_stock <= low_stock_threshold) AS lowStockItems`
    );

    const requestStatusRows = await conn.query(
      `SELECT rs.code,
              rs.label,
              rs.color,
              COUNT(r.id) AS requestCount
       FROM request_statuses rs
       LEFT JOIN requests r ON r.status_id = rs.id
       GROUP BY rs.id, rs.code, rs.label, rs.color
       ORDER BY rs.id ASC`
    );

    const requestVolumeRows = await conn.query(
      `SELECT DATE_FORMAT(r.request_date, '%Y-%m-%d') AS requestDay,
              COUNT(*) AS requestCount
       FROM requests r
       WHERE r.request_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(r.request_date)
       ORDER BY requestDay ASC`
    );

    const categoryRows = await conn.query(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), 'uncategorized') AS category,
              COUNT(*) AS requestCount
       FROM requests
       WHERE request_date >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
       GROUP BY COALESCE(NULLIF(TRIM(category), ''), 'uncategorized')
       ORDER BY requestCount DESC, category ASC
       LIMIT 6`
    );

     const inventoryRows = await conn.query(
      `SELECT id,
            name,
            category,
            unit,
            quantity_in_stock AS quantityInStock
       FROM inventory_items
       ORDER BY name ASC`
     );

    const roomRows = await conn.query(
      `SELECT id AS roomId,
              room_number AS roomNumber,
              owner,
              DATE_FORMAT(date_out, '%Y-%m-%dT%H:%i:%s') AS dateOut
       FROM rooms`
    );

    const openRequestRows = await conn.query(
      `SELECT r.room_id AS roomId,
              COUNT(*) AS openRequestCount,
              DATE_FORMAT(MAX(r.request_date), '%Y-%m-%dT%H:%i:%s') AS lastOpenRequestAt
       FROM requests r
       JOIN request_statuses rs ON rs.id = r.status_id
       WHERE rs.code IN ('received', 'in_progress', 'partially_delivered')
       GROUP BY r.room_id`
    );

    const awaitingReplyRows = await conn.query(
      `SELECT rc.id AS conversationId,
              rm.id AS roomId,
              rm.room_number AS roomNumber,
              rm.owner,
              DATE_FORMAT(rc.last_message_at, '%Y-%m-%dT%H:%i:%s') AS lastMessageAt,
              CASE
                WHEN assigned_staff.id IS NULL THEN NULL
                ELSE CONCAT(assigned_staff.first_name, ' ', assigned_staff.last_name)
              END AS assignedStaffName,
              LEFT(last_message.message, 140) AS lastMessagePreview
       FROM room_conversations rc
       JOIN rooms rm ON rm.id = rc.room_id
       JOIN room_conversation_messages last_message ON last_message.id = (
         SELECT rcm.id
         FROM room_conversation_messages rcm
         WHERE rcm.conversation_id = rc.id
         ORDER BY rcm.id DESC
         LIMIT 1
       )
       LEFT JOIN staff assigned_staff ON assigned_staff.id = rc.assigned_staff_id
       WHERE last_message.sender_type = 'guest'
       ORDER BY rc.last_message_at DESC
       LIMIT 6`
    );

    const recentRequestRows = await conn.query(
      `SELECT r.id,
              rm.id AS roomId,
              rm.room_number AS roomNumber,
              rm.owner AS roomOwner,
              r.full_request AS fullRequest,
              r.category,
              r.eta_minutes AS etaMinutes,
              DATE_FORMAT(r.request_date, '%Y-%m-%dT%H:%i:%s') AS requestDate,
              rs.code AS statusCode,
              rs.label AS statusLabel,
              rs.color AS statusColor,
              CASE
                WHEN staff.id IS NULL THEN NULL
                ELSE CONCAT(staff.first_name, ' ', staff.last_name)
              END AS staffName
       FROM requests r
       JOIN rooms rm ON rm.id = r.room_id
       JOIN request_statuses rs ON rs.id = r.status_id
       LEFT JOIN staff ON staff.id = r.staff_id
       ORDER BY r.request_date DESC, r.created_at DESC
       LIMIT 8`
    );

    const currentMonthStocktakingSummaryRows = await conn.query(
      `SELECT COUNT(*) AS totalEntries,
              SUM(CASE WHEN discrepancy <> 0 THEN 1 ELSE 0 END) AS mismatchEntries,
              COALESCE(SUM(ABS(discrepancy)), 0) AS totalAbsoluteDifference,
              DATE_FORMAT(MAX(created_at), '%Y-%m-%dT%H:%i:%s') AS lastEntryAt
       FROM stocktaking_entries
       WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND created_at < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)`
    );

    const currentMonthStocktakingReasonRows = await conn.query(
      `SELECT reason,
              COUNT(*) AS entryCount
       FROM stocktaking_entries
       WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND created_at < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)
         AND discrepancy <> 0
       GROUP BY reason
       ORDER BY entryCount DESC, reason ASC`
    );

    const currentMonthStocktakingActivityRows = await conn.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS entryDay,
              COUNT(*) AS entryCount,
              COALESCE(SUM(ABS(discrepancy)), 0) AS totalAbsoluteDifference
       FROM stocktaking_entries
       WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND created_at < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)
       GROUP BY DATE(created_at)
       ORDER BY entryDay ASC`
    );

    const currentMonthStocktakingEntryRows = await conn.query(
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
       WHERE e.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND e.created_at < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)
       ORDER BY e.created_at DESC
       LIMIT 24`
    );

    const summary = summaryRows[0] || {};
    const awaitingReplies = buildAwaitingReplies(awaitingReplyRows);
    const currentMonthStocktakingSummary = currentMonthStocktakingSummaryRows[0] || {};

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        occupiedRooms: toNumber(summary.occupiedRooms),
        arrivalsToday: toNumber(summary.arrivalsToday),
        departuresToday: toNumber(summary.departuresToday),
        departuresTomorrow: toNumber(summary.departuresTomorrow),
        openRequests: toNumber(summary.openRequests),
        awaitingGuestResponses: toNumber(summary.awaitingGuestResponses),
        lowStockItems: toNumber(summary.lowStockItems),
      },
      inventoryItems: buildInventoryCatalog(inventoryRows),
      requestStatusBreakdown: buildStatusBreakdown(requestStatusRows),
      requestVolume: buildRequestVolume(requestVolumeRows),
      categoryBreakdown: buildCategoryBreakdown(categoryRows),
      attentionRooms: buildAttentionRooms(roomRows, openRequestRows, awaitingReplies),
      awaitingReplies,
      upcomingDepartures: buildUpcomingDepartures(roomRows),
      recentRequests: buildRecentRequests(recentRequestRows),
      stocktaking: {
        currentMonthLabel: formatMonthLabel(),
        summary: buildCurrentMonthStocktakingSummary(currentMonthStocktakingSummary),
        reasonBreakdown: buildCurrentMonthStocktakingReasonBreakdown(currentMonthStocktakingReasonRows),
        dailyActivity: buildCurrentMonthStocktakingActivity(currentMonthStocktakingActivityRows),
        entries: buildCurrentMonthStocktakingEntries(currentMonthStocktakingEntryRows),
      },
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}