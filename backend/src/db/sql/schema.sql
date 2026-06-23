-- ============================================================
-- MPC Token Distribution System — Reference Schema
-- ============================================================
-- Run via: npm run db:migrate
-- Seed via: npm run db:seed
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Migration Tracking ───────────────────────────────────────────────────────
-- Tracks applied migrations to support incremental schema upgrades.
CREATE TABLE schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Stores both admin and regular user accounts.
-- wallet_address is set via FR-02 wallet connect flow.
CREATE TABLE users (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42)  DEFAULT NULL,       -- EIP-55 checksummed address
  role           VARCHAR(20)  NOT NULL DEFAULT 'user',   -- 'admin' | 'user'
  status         VARCHAR(20)  NOT NULL DEFAULT 'active', -- 'active' | 'disabled'
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique    UNIQUE (email),
  CONSTRAINT users_role_check      CHECK (role   IN ('admin', 'user')),
  CONSTRAINT users_status_check    CHECK (status IN ('active', 'disabled')),
  CONSTRAINT users_wallet_format   CHECK (
    wallet_address IS NULL OR wallet_address ~* '^0x[0-9a-fA-F]{40}$'
  )
);

-- ─── Tokens ──────────────────────────────────────────────────────────────────
-- Registry of supported ERC-20 tokens managed by admin (FR-04).
CREATE TABLE tokens (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  symbol           VARCHAR(20)  NOT NULL,
  contract_address VARCHAR(42)  NOT NULL,   -- lowercase ERC-20 contract on Sepolia
  decimals         INT          NOT NULL DEFAULT 18,
  status           VARCHAR(20)  NOT NULL DEFAULT 'active', -- 'active' | 'disabled'
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT tokens_contract_unique  UNIQUE (contract_address),
  CONSTRAINT tokens_status_check     CHECK (status   IN ('active', 'disabled')),
  CONSTRAINT tokens_decimals_check   CHECK (decimals >= 0 AND decimals <= 18),
  CONSTRAINT tokens_contract_format  CHECK (contract_address ~* '^0x[0-9a-fA-F]{40}$')
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
-- Records every token transfer attempt (FR-05, FR-06, FR-07).
-- tx_hash is NULL while status = 'pending' and populated on broadcast.
CREATE TABLE transactions (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash      VARCHAR(66)    DEFAULT NULL,        -- 0x + 64 hex chars
  sender       VARCHAR(42)    NOT NULL,            -- MPC operator address
  recipient    VARCHAR(42)    NOT NULL,            -- destination wallet
  token_id     UUID           NOT NULL REFERENCES tokens(id) ON DELETE RESTRICT,
  amount       NUMERIC(36,18) NOT NULL,            -- human-readable amount
  status       VARCHAR(20)    NOT NULL DEFAULT 'pending', -- 'pending'|'success'|'failed'
  error_msg    TEXT           DEFAULT NULL,        -- set on failure
  created_at   TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP      NOT NULL DEFAULT NOW(),

  CONSTRAINT transactions_status_check     CHECK (status IN ('pending', 'success', 'failed')),
  CONSTRAINT transactions_amount_positive  CHECK (amount > 0)
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
-- Immutable append-only log of all admin actions (FR-10).
-- user_id is nullable to support system-generated entries.
CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,   -- e.g. LOGIN, TRANSFER, BULK_TRANSFER
  description TEXT         DEFAULT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,  -- supports IPv4 and IPv6
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
  -- intentionally no updated_at — audit logs are immutable
);

-- ─── updated_at auto-update trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_tokens
  BEFORE UPDATE ON tokens
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- users
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_wallet     ON users(wallet_address);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_status     ON users(status);

-- tokens
CREATE INDEX idx_tokens_status    ON tokens(status);
CREATE INDEX idx_tokens_symbol    ON tokens(symbol);

-- transactions
CREATE INDEX idx_tx_status        ON transactions(status);
CREATE INDEX idx_tx_recipient     ON transactions(recipient);
CREATE INDEX idx_tx_sender        ON transactions(sender);
CREATE INDEX idx_tx_token_id      ON transactions(token_id);
CREATE INDEX idx_tx_created_at    ON transactions(created_at DESC);
CREATE INDEX idx_tx_tx_hash       ON transactions(tx_hash) WHERE tx_hash IS NOT NULL;

-- audit_logs
CREATE INDEX idx_audit_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_action     ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
