import { pool } from "./index";

// ─── Migration SQL ────────────────────────────────────────────────────────────

const migration = `
-- ============================================================
-- MPC Token Distribution System — Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Migration tracking ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42)  DEFAULT NULL,
  role           VARCHAR(20)  NOT NULL DEFAULT 'user',
  status         VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique    UNIQUE (email),
  CONSTRAINT users_role_check      CHECK (role IN ('admin', 'user')),
  CONSTRAINT users_status_check    CHECK (status IN ('active', 'disabled')),
  CONSTRAINT users_email_format    CHECK (email ~* '^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$'),
  CONSTRAINT users_wallet_format   CHECK (
    wallet_address IS NULL OR wallet_address ~* '^0x[0-9a-fA-F]{40}$'
  )
);

-- ─── Tokens ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  symbol           VARCHAR(20)  NOT NULL,
  contract_address VARCHAR(42)  NOT NULL,
  decimals         INT          NOT NULL DEFAULT 18,
  status           VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT tokens_contract_unique  UNIQUE (contract_address),
  CONSTRAINT tokens_status_check     CHECK (status IN ('active', 'disabled')),
  CONSTRAINT tokens_decimals_check   CHECK (decimals >= 0 AND decimals <= 18),
  CONSTRAINT tokens_contract_format  CHECK (contract_address ~* '^0x[0-9a-fA-F]{40}$'),
  CONSTRAINT tokens_symbol_length    CHECK (LENGTH(symbol) BETWEEN 1 AND 20)
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash     VARCHAR(66)    DEFAULT NULL,
  sender      VARCHAR(42)    NOT NULL,
  recipient   VARCHAR(42)    NOT NULL,
  token_id    UUID           NOT NULL REFERENCES tokens(id) ON DELETE RESTRICT,
  amount      NUMERIC(36,18) NOT NULL,
  status      VARCHAR(20)    NOT NULL DEFAULT 'pending',
  error_msg   TEXT           DEFAULT NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP      NOT NULL DEFAULT NOW(),

  CONSTRAINT transactions_status_check    CHECK (status IN ('pending', 'success', 'failed')),
  CONSTRAINT transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT transactions_sender_format   CHECK (sender   ~* '^0x[0-9a-fA-F]{40}$'),
  CONSTRAINT transactions_recipient_format CHECK (recipient ~* '^0x[0-9a-fA-F]{40}$'),
  CONSTRAINT transactions_txhash_format   CHECK (
    tx_hash IS NULL OR tx_hash ~* '^0x[0-9a-fA-F]{64}$'
  )
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  description TEXT         DEFAULT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── updated_at trigger function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_users') THEN
    CREATE TRIGGER set_updated_at_users
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_tokens') THEN
    CREATE TRIGGER set_updated_at_tokens
      BEFORE UPDATE ON tokens
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_transactions') THEN
    CREATE TRIGGER set_updated_at_transactions
      BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet         ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_role           ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status         ON users(status);

CREATE INDEX IF NOT EXISTS idx_tokens_status        ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol        ON tokens(symbol);

CREATE INDEX IF NOT EXISTS idx_tx_status            ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_recipient         ON transactions(recipient);
CREATE INDEX IF NOT EXISTS idx_tx_sender            ON transactions(sender);
CREATE INDEX IF NOT EXISTS idx_tx_token_id          ON transactions(token_id);
CREATE INDEX IF NOT EXISTS idx_tx_created_at        ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_tx_hash           ON transactions(tx_hash) WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_user_id        ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action         ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at     ON audit_logs(created_at DESC);

-- Record migration version
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;
`;

// ─── Runner ───────────────────────────────────────────────────────────────────

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting database migration...");
    await client.query("BEGIN");
    await client.query(migration);
    await client.query("COMMIT");
    console.log("✓ Migration complete.");

    // Print table summary
    const { rows } = await client.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns c
              WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log("\nTables created:");
    rows.forEach((r) => console.log(`  • ${r.table_name} (${r.column_count} columns)`));
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
