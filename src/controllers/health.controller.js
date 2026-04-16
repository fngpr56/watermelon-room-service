import { getPool } from "../config/db.js";

/**
 * Returns basic API health status.
 */
export async function getHealth(req, res) {
  const pool = getPool();
  const rows = await pool.query("SELECT 1 AS ok");

  res.json({
    ok: true,
    db: rows[0].ok === 1,
    service: "watermelon-room-service-api",
  });
}