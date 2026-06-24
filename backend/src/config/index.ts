import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/mcp_token_board",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  distributorAddress: process.env.DISTRIBUTOR_ADDRESS || "",
  mcpPrivateKey: process.env.MCP_PRIVATE_KEY || "",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
};
