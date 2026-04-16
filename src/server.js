import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { env } from "./config/env.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { logger } from "./utils/logger.js";
import { testDbConnection } from "./config/db.js";
import { initializeAuthSchema } from "./services/auth-schema.service.js";

async function bootstrap() {
  await testDbConnection();
  await initializeAuthSchema();

  if (env.sessionSecret === "change-me-in-production") {
    logger.warn("SESSION_SECRET is using the development fallback value");
  }

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
    },
  });

  registerSocketHandlers(io);

  server.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});