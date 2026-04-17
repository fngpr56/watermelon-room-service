import express from "express";
import cors from "cors";
import morgan from "morgan";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import pageRoutes from "./routes/page.routes.js";
import roomsRoutes from "./routes/rooms.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import statusesRoutes from "./routes/statuses.routes.js";
import requestsRoutes from "./routes/requests.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";
import stocktakingRoutes from "./routes/stocktaking.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

const app = express();
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const requestLogStream = {
  write(message) {
    logger.http(message.trim());
  },
};

// MariaDB returns some counts as BigInt, so convert them before sending JSON.
BigInt.prototype.toJSON = function () {
  return Number(this);
};

morgan.token("requestId", (req) => req.requestId || "-");

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

// Give each request a small id so logs and error responses can be matched.
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use(express.json());
app.use(morgan(":requestId :method :url :status :response-time ms", { stream: requestLogStream }));

// Serve the plain browser files from /public.
app.use(express.static(publicDir, { index: false }));

app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

// API routes come before page routes so the browser dashboard can call them.
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/statuses", statusesRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/stocktaking", stocktakingRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "API Docs" }));
app.use("/", pageRoutes);

// Fallback handlers stay last.
app.use(notFound);
app.use(errorHandler);

export default app;