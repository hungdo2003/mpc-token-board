import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { globalLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import tokensRoutes from "./routes/tokens.routes";
import transfersRoutes from "./routes/transfers.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/tokens", tokensRoutes);
app.use("/api/transfers", transfersRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`[Server] Running on http://localhost:${config.port}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
  console.log(`[MPC] Operator address: ${process.env.MPC_PRIVATE_KEY ? "configured" : "NOT SET"}`);
});

export default app;
