/**
 * Authentication logic for room-number and staff-email login flows.
 */
import bcrypt from "bcrypt";

import { getPool } from "../config/db.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROOM_NUMBER_PATTERN = /^\d+$/;

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim();
}

export function detectIdentifierType(identifier) {
  // Room logins use digits only. Staff logins use email.
  const normalized = normalizeIdentifier(identifier);

  if (ROOM_NUMBER_PATTERN.test(normalized)) {
    return "room";
  }

  if (EMAIL_PATTERN.test(normalized)) {
    return "staff";
  }

  return null;
}

export async function authenticateUser(identifier, password) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const normalizedPassword = String(password || "");
  const identifierType = detectIdentifierType(normalizedIdentifier);

  if (!identifierType) {
    return {
      ok: false,
      reason: "invalid_identifier",
    };
  }

  if (!normalizedPassword) {
    return {
      ok: false,
      reason: "invalid_credentials",
    };
  }

  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    if (identifierType === "room") {
      // Room login sends guests to the guest page.
      const rows = await conn.query(
        `SELECT id, room_number, owner, password_hash
         FROM rooms
         WHERE room_number = ?
         LIMIT 1`,
        [Number(normalizedIdentifier)]
      );
      const room = rows[0];

      if (!room || !(await bcrypt.compare(normalizedPassword, room.password_hash))) {
        return {
          ok: false,
          reason: "invalid_credentials",
        };
      }

      return {
        ok: true,
        redirectTo: "/guest",
        session: {
          userType: "guest",
          roomId: room.id,
          roomNumber: room.room_number,
          displayName: room.owner || `Room ${room.room_number}`,
        },
      };
    }

    // Staff login sends staff users to the dashboard.
    const rows = await conn.query(
      `SELECT id,
              first_name AS firstName,
              last_name AS lastName,
              mail_address AS mailAddress,
              role,
              password_hash
       FROM staff
       WHERE LOWER(mail_address) = LOWER(?)
       LIMIT 1`,
      [normalizedIdentifier]
    );
    const staff = rows[0];

    if (!staff || !(await bcrypt.compare(normalizedPassword, staff.password_hash))) {
      return {
        ok: false,
        reason: "invalid_credentials",
      };
    }

    return {
      ok: true,
      redirectTo: "/staff",
      session: {
        userType: "staff",
        staffId: staff.id,
        email: staff.mailAddress,
        role: staff.role,
        displayName: `${staff.firstName} ${staff.lastName}`,
      },
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}