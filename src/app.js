import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import requestsRoutes from "./routes/requests.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import authRoutes from "./routes/auth.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import pageRoutes from "./routes/page.routes.js";
import { registerSwagger } from "./docs/swagger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

// Allow the browser client to send requests with cookies.
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Serve the plain HTML, CSS, and browser scripts from /public.
app.use(express.static(publicDir, { index: false }));

// Expose Swagger docs for the staff API.
registerSwagger(app);

// API routes first, then page routes, then fallback handlers.
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/", pageRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;