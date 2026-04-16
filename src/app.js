import express from "express";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import requestsRoutes from "./routes/requests.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
  })
);

app.use(express.json());
app.use(morgan("dev"));

app.use("/health", healthRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/inventory", inventoryRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;