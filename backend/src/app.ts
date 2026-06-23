import "dotenv/config";
import { validateEnv } from "./utils/env";
validateEnv();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { globalLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { pool } from "./db";

import authRoutes      from "./routes/auth.routes";
import usersRoutes     from "./routes/users.routes";
import tokensRoutes    from "./routes/tokens.routes";
import transfersRoutes from "./routes/transfers.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));

// ─── Parsing ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(requestLogger);
app.use(globalLimiter);

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/users",     usersRoutes);
app.use("/api/tokens",    tokensRoutes);
app.use("/api/transfers", transfersRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    env: config.nodeEnv,
    mpc: config.mpcPrivateKey ? "configured" : "not set",
    distributor: config.distributorAddress || "not set",
  });
});

export default app;
