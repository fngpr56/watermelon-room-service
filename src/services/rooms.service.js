import bcrypt from "bcrypt";

import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function formatRoom(row) {
  // Keep the API shape simple for the dashboard form.
  return {
    id: row.id,
    roomNumber: row.roomNumber,
    owner: row.owner,
    dateIn: row.dateIn,
    dateOut: row.dateOut,
  };
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length === 16) {
    // Browser datetime-local values do not include seconds.
    return `${normalized.replace("T", " ")}:00`;
  }

  return normalized.replace("T", " ");
}

async function getRoomById(conn, roomId) {
  const rows = await conn.query(
    `SELECT id,
            room_number AS roomNumber,
            owner,
            DATE_FORMAT(date_in, '%Y-%m-%dT%H:%i') AS dateIn,
            DATE_FORMAT(date_out, '%Y-%m-%dT%H:%i') AS dateOut
     FROM rooms
     WHERE id = ?
     LIMIT 1`,
    [roomId]
  );

  return rows[0] || null;
}

export async function listRooms() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id,
              room_number AS roomNumber,
              owner,
              DATE_FORMAT(date_in, '%Y-%m-%dT%H:%i') AS dateIn,
              DATE_FORMAT(date_out, '%Y-%m-%dT%H:%i') AS dateOut
       FROM rooms
       ORDER BY room_number ASC`
    );

    return rows.map(formatRoom);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function createRoom(data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    // Store room passwords as bcrypt hashes, never plain text.
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await conn.query(
      `INSERT INTO rooms (
        room_number,
        password_hash,
        owner,
        date_in,
        date_out
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        data.roomNumber,
        passwordHash,
        data.owner,
        normalizeDateTime(data.dateIn),
        normalizeDateTime(data.dateOut),
      ]
    );

    const created = await getRoomById(conn, Number(result.insertId));
    return formatRoom(created);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function updateRoom(roomId, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getRoomById(conn, roomId);

    if (!existing) {
      throw new ApiError(404, "Room not found");
    }

    let passwordClause = "";
    const params = [
      data.roomNumber,
      data.owner,
      normalizeDateTime(data.dateIn),
      normalizeDateTime(data.dateOut),
    ];

    if (data.password) {
      // Only change the saved password when a new one is provided.
      const passwordHash = await bcrypt.hash(data.password, 10);
      passwordClause = ", password_hash = ?";
      params.push(passwordHash);
    }

    params.push(roomId);

    await conn.query(
      `UPDATE rooms
         SET room_number = ?,
           owner = ?,
           date_in = ?,
           date_out = ?${passwordClause}
       WHERE id = ?`,
      params
    );

    const updated = await getRoomById(conn, roomId);
    return formatRoom(updated);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function deleteRoom(roomId) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getRoomById(conn, roomId);

    if (!existing) {
      throw new ApiError(404, "Room not found");
    }

    const result = await conn.query("DELETE FROM rooms WHERE id = ?", [roomId]);

    if (!result.affectedRows) {
      throw new ApiError(404, "Room not found");
    }
  } finally {
    if (conn) {
      conn.release();
    }
  }
}