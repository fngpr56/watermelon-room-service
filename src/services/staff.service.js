import bcrypt from "bcrypt";

import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function formatStaffUser(row) {
  // Keep the API response shape consistent with the frontend form fields.
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    birthday: row.birthday,
    phoneNumber: row.phoneNumber,
    mailAddress: row.mailAddress,
    role: row.role,
    dateStart: row.dateStart,
    completedRequest: row.completedRequest,
  };
}

async function getStaffUserById(conn, staffId) {
  const rows = await conn.query(
    `SELECT id,
            first_name AS firstName,
            last_name AS lastName,
            DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
            phone_number AS phoneNumber,
            mail_address AS mailAddress,
            role,
            DATE_FORMAT(date_start, '%Y-%m-%d') AS dateStart,
            completed_request_count AS completedRequest
     FROM staff
     WHERE id = ?
     LIMIT 1`,
    [staffId]
  );

  return rows[0] || null;
}

export async function listStaffUsers() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    // Format SQL dates before they leave the backend so the UI can use them directly.
    const rows = await conn.query(
      `SELECT id,
            first_name AS firstName,
            last_name AS lastName,
              DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
            phone_number AS phoneNumber,
            mail_address AS mailAddress,
              role,
            DATE_FORMAT(date_start, '%Y-%m-%d') AS dateStart,
            completed_request_count AS completedRequest
       FROM staff
       ORDER BY last_name ASC, first_name ASC`
    );

    return rows.map(formatStaffUser);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function createStaffUser(data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    // Staff passwords are always stored as bcrypt hashes.
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await conn.query(
      `INSERT INTO staff (
        first_name,
        last_name,
        password_hash,
        birthday,
        phone_number,
        mail_address,
        role,
        date_start,
        completed_request_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.firstName,
        data.lastName,
        passwordHash,
        data.birthday,
        data.phoneNumber,
        data.mailAddress,
        data.role,
        data.dateStart,
        data.completedRequest,
      ]
    );

    const created = await getStaffUserById(conn, Number(result.insertId));
    return formatStaffUser(created);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function updateStaffUser(staffId, data) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getStaffUserById(conn, staffId);

    if (!existing) {
      throw new ApiError(404, "Staff user not found");
    }

    let passwordClause = "";
    const params = [
      data.firstName,
      data.lastName,
      data.birthday,
      data.phoneNumber,
      data.mailAddress,
      data.role,
      data.dateStart,
      data.completedRequest,
    ];

    if (data.password) {
      // Only replace the saved password when a new one is provided.
      const passwordHash = await bcrypt.hash(data.password, 10);
      passwordClause = ", password_hash = ?";
      params.push(passwordHash);
    }

    params.push(staffId);

    await conn.query(
      `UPDATE staff
         SET first_name = ?,
           last_name = ?,
           birthday = ?,
           phone_number = ?,
           mail_address = ?,
           role = ?,
           date_start = ?,
           completed_request_count = ?${passwordClause}
       WHERE id = ?`,
      params
    );

    const updated = await getStaffUserById(conn, staffId);
    return formatStaffUser(updated);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function deleteStaffUser(staffId, currentStaffId) {
  // Prevent the active staff user from deleting their own account.
  if (Number(staffId) === Number(currentStaffId)) {
    throw new ApiError(400, "You cannot delete your own active staff account");
  }

  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    const existing = await getStaffUserById(conn, staffId);

    if (!existing) {
      throw new ApiError(404, "Staff user not found");
    }

    const result = await conn.query("DELETE FROM staff WHERE id = ?", [staffId]);

    if (!result.affectedRows) {
      throw new ApiError(404, "Staff user not found");
    }
  } finally {
    if (conn) {
      conn.release();
    }
  }
}