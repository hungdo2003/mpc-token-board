import { Request, Response } from "express";
import { ethers } from "ethers";
import { z } from "zod";
import { query, queryOne } from "../db";
import { auditLog } from "../utils/audit";

const WalletSchema = z.object({
  walletAddress: z.string().refine((addr) => ethers.isAddress(addr), "Invalid wallet address"),
});

export async function listUsers(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  let sql = `SELECT id, email, role, wallet_address, status, created_at FROM users`;
  const params: any[] = [];

  if (search) {
    sql += ` WHERE email ILIKE $1 OR wallet_address ILIKE $1`;
    params.push(`%${search}%`);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const users = await query(sql, params);

  const countSql = search
    ? `SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR wallet_address ILIKE $1`
    : `SELECT COUNT(*) FROM users`;
  const countParams = search ? [`%${search}%`] : [];
  const [{ count }] = await query(countSql, countParams);

  res.json({ users, total: Number(count), page, limit });
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const user = await queryOne(
    `SELECT id, email, role, wallet_address, status, created_at FROM users WHERE id = $1`,
    [req.params.id]
  );
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
}

export async function updateWallet(req: Request, res: Response): Promise<void> {
  const parse = WalletSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { walletAddress } = parse.data;
  const userId = req.user!.userId;

  // Check wallet not already used by another user
  const conflict = await queryOne(
    `SELECT id FROM users WHERE wallet_address = $1 AND id != $2`,
    [walletAddress.toLowerCase(), userId]
  );
  if (conflict) {
    res.status(409).json({ error: "Wallet address already linked to another account" });
    return;
  }

  const user = await queryOne(
    `UPDATE users SET wallet_address = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, wallet_address`,
    [walletAddress.toLowerCase(), userId]
  );

  await auditLog(userId, "UPDATE_WALLET", `Wallet linked: ${walletAddress}`, req);
  res.json({ user });
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body;
  if (!["active", "disabled"].includes(status)) {
    res.status(400).json({ error: "Status must be 'active' or 'disabled'" });
    return;
  }

  const user = await queryOne(
    `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, status`,
    [status, req.params.id]
  );
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await auditLog(req.user!.userId, "UPDATE_USER_STATUS", `User ${req.params.id} status → ${status}`, req);
  res.json({ user });
}
