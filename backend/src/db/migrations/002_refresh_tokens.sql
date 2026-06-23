-- Migration 002: Refresh Tokens
-- Supports secure JWT refresh flow — access tokens short-lived (15m),
-- refresh tokens long-lived (7d) stored server-side for revocation.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256 of the raw token
  expires_at  TIMESTAMP    NOT NULL,
  revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

INSERT INTO schema_migrations (version) VALUES ('002_refresh_tokens')
ON CONFLICT (version) DO NOTHING;
