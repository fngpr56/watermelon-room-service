/**
 * Schema helper for auth-related tables and compatibility checks when validating database shape.
 */
import bcrypt from "bcrypt";

import { getPool } from "../config/db.js";

async function getColumns(conn, tableName) {
  const rows = await conn.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );

  return new Set(rows.map((row) => row.column_name));
}

async function ensureRoomsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_number INT NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      owner VARCHAR(70) DEFAULT NULL,
      date_in DATETIME DEFAULT NULL,
      date_out DATETIME DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_rooms_room_number (room_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  let columns = await getColumns(conn, "rooms");

  if (columns.has("dateIn") && !columns.has("date_in")) {
    await conn.query("ALTER TABLE rooms CHANGE COLUMN dateIn date_in DATETIME NULL");
  }

  if (columns.has("dateOut") && !columns.has("date_out")) {
    await conn.query("ALTER TABLE rooms CHANGE COLUMN dateOut date_out DATETIME NULL");
  }

  columns = await getColumns(conn, "rooms");

  if (!columns.has("created_at")) {
    await conn.query("ALTER TABLE rooms ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  }

  if (!columns.has("updated_at")) {
    await conn.query("ALTER TABLE rooms ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  }

  if (columns.has("pass") && !columns.has("password_hash")) {
    await conn.query("ALTER TABLE rooms ADD COLUMN password_hash VARCHAR(255) NULL AFTER room_number");
  }

  if (columns.has("pass")) {
    const rows = await conn.query("SELECT id, pass FROM rooms WHERE pass IS NOT NULL AND pass != ''");

    for (const row of rows) {
      const passwordHash = await bcrypt.hash(row.pass, 10);
      await conn.query("UPDATE rooms SET password_hash = ? WHERE id = ?", [passwordHash, row.id]);
    }

    await conn.query("ALTER TABLE rooms DROP COLUMN pass");
  }

}

async function ensureStaffTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(20) NOT NULL,
      last_name VARCHAR(20) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      birthday DATE DEFAULT NULL,
      phone_number VARCHAR(15) DEFAULT NULL,
      mail_address VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      date_start DATE NOT NULL,
      completed_request_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_staff_mail_address (mail_address)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  let columns = await getColumns(conn, "staff");

  if (columns.has("firstName") && !columns.has("first_name")) {
    await conn.query("ALTER TABLE staff CHANGE COLUMN firstName first_name VARCHAR(20) NOT NULL");
  }

  if (columns.has("lastName") && !columns.has("last_name")) {
    await conn.query("ALTER TABLE staff CHANGE COLUMN lastName last_name VARCHAR(20) NOT NULL");
  }

  if (columns.has("phoneNumber") && !columns.has("phone_number")) {
    await conn.query("ALTER TABLE staff CHANGE COLUMN phoneNumber phone_number VARCHAR(15) NULL");
  }

  if (columns.has("mailAddress") && !columns.has("mail_address")) {
    await conn.query("ALTER TABLE staff CHANGE COLUMN mailAddress mail_address VARCHAR(100) NOT NULL");
  }

  if (columns.has("dateStart") && !columns.has("date_start")) {
    await conn.query("ALTER TABLE staff CHANGE COLUMN dateStart date_start DATE NOT NULL");
  }

  if (columns.has("completedRequest") && !columns.has("completed_request_count")) {
    await conn.query("ALTER TABLE staff CHANGE COLUMN completedRequest completed_request_count INT NOT NULL DEFAULT 0");
  }

  columns = await getColumns(conn, "staff");

  if (!columns.has("created_at")) {
    await conn.query("ALTER TABLE staff ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  }

  if (!columns.has("updated_at")) {
    await conn.query("ALTER TABLE staff ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  }

  if (columns.has("pass") && !columns.has("password_hash")) {
    await conn.query("ALTER TABLE staff ADD COLUMN password_hash VARCHAR(255) NULL AFTER last_name");
  }

  if (columns.has("pass")) {
    const rows = await conn.query("SELECT id, pass FROM staff WHERE pass IS NOT NULL AND pass != ''");

    for (const row of rows) {
      const passwordHash = await bcrypt.hash(row.pass, 10);
      await conn.query("UPDATE staff SET password_hash = ? WHERE id = ?", [passwordHash, row.id]);
    }

    await conn.query("ALTER TABLE staff DROP COLUMN pass");
  }

}

export async function initializeAuthSchema() {
  // Automatic database schema creation and seeding disabled.
  // Database setup must be performed manually by running `sql/schema.sql`.
  return;
}