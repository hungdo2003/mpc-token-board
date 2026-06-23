import { query, queryOne } from "../db";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  wallet_address: string | null;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  wallet_address: string | null;
  role: string;
  status: string;
  created_at: Date;
}

export interface ListUsersOptions {
  page: number;
  limit: number;
  search?: string;
}

export const UserRepository = {
  async findById(id: string): Promise<User | null> {
    return queryOne<User>("SELECT * FROM users WHERE id = $1", [id]);
  },

  async findByEmail(email: string): Promise<User | null> {
    return queryOne<User>("SELECT * FROM users WHERE email = $1", [email]);
  },

  async findByWallet(walletAddress: string): Promise<User | null> {
    return queryOne<User>("SELECT * FROM users WHERE wallet_address = $1", [
      walletAddress.toLowerCase(),
    ]);
  },

  async findAll(opts: ListUsersOptions): Promise<{ users: UserPublic[]; total: number }> {
    const offset = (opts.page - 1) * opts.limit;
    const params: unknown[] = [];
    let where = "";

    if (opts.search) {
      params.push(`%${opts.search}%`);
      where = `WHERE email ILIKE $1 OR wallet_address ILIKE $1`;
    }

    const users = await query<UserPublic>(
      `SELECT id, email, role, wallet_address, status, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, offset]
    );

    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*) FROM users ${where}`,
      params
    );

    return { users, total: Number(count) };
  },

  async create(email: string, passwordHash: string): Promise<UserPublic> {
    const [user] = await query<UserPublic>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, role, wallet_address, status, created_at`,
      [email, passwordHash]
    );
    return user;
  },

  async updateWallet(id: string, walletAddress: string): Promise<UserPublic | null> {
    return queryOne<UserPublic>(
      `UPDATE users SET wallet_address = $1 WHERE id = $2
       RETURNING id, email, role, wallet_address, status, created_at`,
      [walletAddress.toLowerCase(), id]
    );
  },

  async updateStatus(id: string, status: string): Promise<UserPublic | null> {
    return queryOne<UserPublic>(
      `UPDATE users SET status = $1 WHERE id = $2
       RETURNING id, email, role, wallet_address, status, created_at`,
      [status, id]
    );
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, id]
    );
  },
};
