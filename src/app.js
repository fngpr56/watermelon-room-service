import express from "express";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env.js";
import roomsRoutes from "./routes/rooms.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

const app = express();

BigInt.prototype.toJSON = function () {
  return Number(this);
};

app.use(
  cors({
    origin: env.clientOrigin,
  })
);

app.use(express.json());
app.use(morgan("dev"));

app.use('/api/rooms', roomsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFound);
app.use(errorHandler);

export default app;