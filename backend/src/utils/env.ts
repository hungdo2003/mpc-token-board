/**
 * Validates required environment variables on startup.
 * Logs warnings for optional vars that affect functionality.
 */
export function validateEnv(): void {
  const required: string[] = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    console.error(`[ENV] Missing required environment variables: ${missing.join(", ")}`);
    console.error("[ENV] Copy backend/.env.example to backend/.env and fill in the values.");
    process.exit(1);
  }

  const optional: Array<{ key: string; impact: string }> = [
    { key: "RPC_URL",            impact: "Blockchain transfers will fail" },
    { key: "MCP_PRIVATE_KEY",    impact: "Token transfers via MCP will fail" },
    { key: "DISTRIBUTOR_ADDRESS", impact: "TokenDistributor contract not set" },
  ];

  for (const { key, impact } of optional) {
    if (!process.env[key]) {
      console.warn(`[ENV] Warning: ${key} not set — ${impact}`);
    }
  }
}
