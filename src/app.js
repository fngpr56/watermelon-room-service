import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import pageRoutes from "./routes/page.routes.js";
import roomsRoutes from "./routes/rooms.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

const app = express();
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

BigInt.prototype.toJSON = function () {
  return Number(this);
};

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(publicDir, { index: false }));

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/", pageRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFound);
app.use(errorHandler);

export default app;