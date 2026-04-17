/**
 * Shared MariaDB pool configuration and database connectivity helpers.
 */
import * as mariadb from "mariadb";
import { env } from "./env.js";

// Reuse one shared pool across the whole app.
const pool = mariadb.createPool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  connectionLimit: 5,
});

export function getPool() {
  return pool;
}

/**
 * Checks database connectivity by running a simple query.
 */
export async function testDbConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query("SELECT 1");
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// default export for simple usage
export default pool;