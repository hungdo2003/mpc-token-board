import crypto from "crypto";
import { query, queryOne } from "../db";

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

function hash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const RefreshTokenRepository = {
  async create(userId: string, rawToken: string, expiresAt: Date): Promise<void> {
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hash(rawToken), expiresAt]
    );
  },

  async findValid(rawToken: string): Promise<RefreshToken | null> {
    return queryOne<RefreshToken>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked = FALSE
         AND expires_at > NOW()`,
      [hash(rawToken)]
    );
  },

  async revoke(rawToken: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
      [hash(rawToken)]
    );
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  },

  async cleanup(): Promise<void> {
    await query(`DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE`);
  },
};
