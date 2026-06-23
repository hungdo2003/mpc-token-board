import { pool } from "./index";
import bcrypt from "bcryptjs";

// ─── Seed data ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || "admin@mpcboard.io";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";

// Sepolia testnet token addresses (real verified contracts)
const SEED_TOKENS = [
  {
    name:             "USD Coin",
    symbol:           "USDC",
    contract_address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238", // Sepolia USDC
    decimals:         6,
  },
  {
    name:             "Tether USD",
    symbol:           "USDT",
    contract_address: "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0", // Sepolia USDT
    decimals:         6,
  },
  {
    name:             "Wrapped Ether",
    symbol:           "WETH",
    contract_address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14", // Sepolia WETH
    decimals:         18,
  },
  {
    name:             "Chainlink Token",
    symbol:           "LINK",
    contract_address: "0x779877a7b0d9e8603169ddbd7836e478b4624789", // Sepolia LINK
    decimals:         18,
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Starting database seed...\n");
    await client.query("BEGIN");

    // ── Admin user ──────────────────────────────────────────────────────────
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log(`✓ Admin user already exists: ${ADMIN_EMAIL}`);
    } else {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, role, status)
         VALUES ($1, $2, 'admin', 'active') RETURNING id`,
        [ADMIN_EMAIL, hash]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, description)
         VALUES ($1, 'SEED', 'Admin user created by database seed')`,
        [rows[0].id]
      );

      console.log(`✓ Admin user created:`);
      console.log(`    Email:    ${ADMIN_EMAIL}`);
      console.log(`    Password: ${ADMIN_PASSWORD}`);
      console.log(`    Role:     admin`);
    }

    // ── Tokens ──────────────────────────────────────────────────────────────
    console.log("\n✓ Seeding tokens:");
    for (const token of SEED_TOKENS) {
      const exists = await client.query(
        "SELECT id FROM tokens WHERE contract_address = $1",
        [token.contract_address]
      );

      if (exists.rows.length > 0) {
        console.log(`  • ${token.symbol} already exists — skipped`);
        continue;
      }

      await client.query(
        `INSERT INTO tokens (name, symbol, contract_address, decimals)
         VALUES ($1, $2, $3, $4)`,
        [token.name, token.symbol, token.contract_address, token.decimals]
      );
      console.log(`  • ${token.symbol} (${token.contract_address})`);
    }

    await client.query("COMMIT");
    console.log("\nSeed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
