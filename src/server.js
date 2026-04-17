/**
 * Server bootstrap that verifies dependencies, attaches Socket.IO, and starts HTTP listening.
 */
import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { env } from "./config/env.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { logger } from "./utils/logger.js";
import { testDbConnection } from "./config/db.js";

async function bootstrap() {
  // Make sure the database is ready before the server accepts requests.
  await testDbConnection();

  if (env.sessionSecret === "change-me-in-production") {
    logger.warn("SESSION_SECRET is using the development fallback value");
  }

  const server = http.createServer(app);

  // Log startup problems like port conflicts in one place.
  server.on("error", (error) => {
    logger.error("HTTP server error", {
      port: env.port,
      error,
    });
    process.exit(1);
  });

  // Socket.IO shares the same HTTP server as Express.
  const io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
    },
  });

  registerSocketHandlers(io);

  server.listen(env.port, () => {
    logger.info("Server running", {
      url: `http://localhost:${env.port}`,
      nodeEnv: env.nodeEnv,
    });
  });
}

// Stop startup if any required setup step fails.
bootstrap().catch((error) => {
  logger.error("Failed to start server", {
    port: env.port,
    error,
  });
  process.exit(1);
});