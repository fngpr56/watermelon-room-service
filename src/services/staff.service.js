import bcrypt from "bcrypt";

import { getPool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function formatStaffUser(row) {
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
            firstName,
            lastName,
            DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
            phoneNumber,
            mailAddress,
            role,
            DATE_FORMAT(dateStart, '%Y-%m-%d') AS dateStart,
            completedRequest
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
    const rows = await conn.query(
      `SELECT id,
              firstName,
              lastName,
              DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
              phoneNumber,
              mailAddress,
              role,
              DATE_FORMAT(dateStart, '%Y-%m-%d') AS dateStart,
              completedRequest
       FROM staff
       ORDER BY lastName ASC, firstName ASC`
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
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await conn.query(
      `INSERT INTO staff (
        firstName,
        lastName,
        password_hash,
        birthday,
        phoneNumber,
        mailAddress,
        role,
        dateStart,
        completedRequest
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
      const passwordHash = await bcrypt.hash(data.password, 10);
      passwordClause = ", password_hash = ?";
      params.push(passwordHash);
    }

    params.push(staffId);

    await conn.query(
      `UPDATE staff
       SET firstName = ?,
           lastName = ?,
           birthday = ?,
           phoneNumber = ?,
           mailAddress = ?,
           role = ?,
           dateStart = ?,
           completedRequest = ?${passwordClause}
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

    await conn.query("DELETE FROM staff WHERE id = ?", [staffId]);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}