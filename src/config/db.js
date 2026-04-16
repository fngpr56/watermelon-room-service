import * as mariadb from "mariadb";
import { env } from "./env.js";

const pool = mariadb.createPool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  connectionLimit: 5,
});

/**
 * Returns the MariaDB connection pool.
 * @returns {import("mariadb").Pool}
 */
export function getPool() {
  return pool;
}

/**
 * Checks database connectivity by running a simple query.
 * @returns {Promise<void>}
 * @throws {Error} If the database cannot be reached.
 */
export async function testDbConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query("SELECT 1");
  } finally {
    if (conn) conn.release();
  }
}