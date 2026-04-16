import dotenv from "dotenv";

dotenv.config();

/**
 * Application environment configuration.
 * Reads required variables from process.env.
 */
export const env = {
  port: Number(process.env.PORT || 3000),
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_NAME || "svara_room_service",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};