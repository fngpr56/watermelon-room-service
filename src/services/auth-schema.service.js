import bcrypt from "bcrypt";

import { getPool } from "../config/db.js";

const ROOM_SEEDS = [
  {
    room_number: 101,
    password_hash: "$2b$10$iNhgFqFotfRcO2e3.Oz8k.YH3NUfUP6KxfcFAzYwuc1ysj.hdR8Gy",
    owner: "Jamie Guest",
    dateIn: "2026-04-16 15:00:00",
    dateOut: "2026-04-19 11:00:00",
  },
  {
    room_number: 202,
    password_hash: "$2b$10$i0KITNW2ZF/cvSv41khdN.FtWkzGp1qAUo.NjQEA75qDRIcfU.BC2",
    owner: "Morgan Traveler",
    dateIn: "2026-04-17 14:00:00",
    dateOut: "2026-04-21 10:00:00",
  },
];

const STAFF_SEEDS = [
  {
    firstName: "Alice",
    lastName: "Porter",
    password_hash: "$2b$10$1X4H.kmP4drsyK0UYSefzOowSJwN0Ly6Qb2CSohoEG8XuK4FirWkC",
    birthday: "1992-08-14",
    phoneNumber: "+421900000111",
    mailAddress: "alice.porter@hotel.test",
    role: "manager",
    dateStart: "2023-06-01",
    completedRequest: 154,
  },
  {
    firstName: "Bob",
    lastName: "Service",
    password_hash: "$2b$10$na.zKJxPAU4t2XmD7hMM3uQb70j6aEE/jXacSjc/0mSQYMxFfa356",
    birthday: "1997-03-09",
    phoneNumber: "+421900000222",
    mailAddress: "bob.service@hotel.test",
    role: "attendant",
    dateStart: "2024-02-12",
    completedRequest: 47,
  },
];

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
      dateIn DATETIME DEFAULT NULL,
      dateOut DATETIME DEFAULT NULL,
      UNIQUE KEY uq_rooms_room_number (room_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  const columns = await getColumns(conn, "rooms");

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

  for (const room of ROOM_SEEDS) {
    await conn.query(
      `INSERT INTO rooms (room_number, password_hash, owner, dateIn, dateOut)
       SELECT ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = ?)`,
      [room.room_number, room.password_hash, room.owner, room.dateIn, room.dateOut, room.room_number]
    );
  }
}

async function ensureStaffTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id INT AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(20) NOT NULL,
      lastName VARCHAR(20) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      birthday DATE DEFAULT NULL,
      phoneNumber VARCHAR(15) DEFAULT NULL,
      mailAddress VARCHAR(30) NOT NULL,
      role VARCHAR(20) NOT NULL,
      dateStart DATE NOT NULL,
      completedRequest INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_staff_mail_address (mailAddress)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  const columns = await getColumns(conn, "staff");

  if (columns.has("pass") && !columns.has("password_hash")) {
    await conn.query("ALTER TABLE staff ADD COLUMN password_hash VARCHAR(255) NULL AFTER lastName");
  }

  if (columns.has("pass")) {
    const rows = await conn.query("SELECT id, pass FROM staff WHERE pass IS NOT NULL AND pass != ''");

    for (const row of rows) {
      const passwordHash = await bcrypt.hash(row.pass, 10);
      await conn.query("UPDATE staff SET password_hash = ? WHERE id = ?", [passwordHash, row.id]);
    }

    await conn.query("ALTER TABLE staff DROP COLUMN pass");
  }

  for (const staff of STAFF_SEEDS) {
    await conn.query(
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
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM staff WHERE mailAddress = ?)`,
      [
        staff.firstName,
        staff.lastName,
        staff.password_hash,
        staff.birthday,
        staff.phoneNumber,
        staff.mailAddress,
        staff.role,
        staff.dateStart,
        staff.completedRequest,
        staff.mailAddress,
      ]
    );
  }
}

export async function initializeAuthSchema() {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await ensureRoomsTable(conn);
    await ensureStaffTable(conn);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}