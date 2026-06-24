import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import { z } from "zod";
import { UserRepository } from "../repositories/user.repository";
import { AuditLogRepository } from "../repositories/auditLog.repository";
import { success, fail } from "../utils/response";

const WalletSchema = z.object({
  walletAddress: z
    .string()
    .refine((addr) => ethers.isAddress(addr), "Invalid Ethereum wallet address"),
});

function getIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"] as string | undefined;
  return fwd?.split(",")[0].trim() ?? req.socket.remoteAddress ?? null;
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page   = Math.max(1, Number(req.query.page) || 1);
    const limit  = Math.min(100, Number(req.query.limit) || 20);
    const search = req.query.search as string | undefined;

    const { rows, total } = await UserRepository.findAll({ page, limit, search });
    res.json({ users: rows, total, page, limit });
  } catch (err) { next(err); }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await UserRepository.findById(req.params.id);
    if (!user) { fail(res, "User not found", 404); return; }
    const { password_hash: _, ...pub } = user as any;
    success(res, { user: pub });
  } catch (err) { next(err); }
}

// ─── PATCH /api/users/me/wallet ───────────────────────────────────────────────
export async function updateWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parse = WalletSchema.safeParse(req.body);
  if (!parse.success) { fail(res, parse.error.errors[0].message); return; }

  const { walletAddress } = parse.data;
  const userId = req.user!.userId;

  try {
    const conflict = await UserRepository.findByWallet(walletAddress.toLowerCase());
    if (conflict && conflict.id !== userId) {
      fail(res, "Wallet address already linked to another account", 409);
      return;
    }

    const user = await UserRepository.setWallet(userId, walletAddress.toLowerCase());
    await AuditLogRepository.create({
      userId,
      action: "WALLET_CONNECTED",
      description: `Wallet linked: ${walletAddress}`,
      ipAddress: getIp(req),
    });
    success(res, { user });
  } catch (err) { next(err); }
}

// ─── DELETE /api/users/me/wallet ─────────────────────────────────────────────
export async function removeWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user!.userId;
  try {
    await UserRepository.setWallet(userId, null);
    await AuditLogRepository.create({
      userId,
      action: "WALLET_DISCONNECTED",
      description: "Wallet unlinked from account",
      ipAddress: getIp(req),
    });
    success(res, { message: "Wallet disconnected" });
  } catch (err) { next(err); }
}

// ─── PATCH /api/users/:id/status ─────────────────────────────────────────────
export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { status } = req.body;
  if (!["active", "disabled"].includes(status)) {
    fail(res, "Status must be 'active' or 'disabled'"); return;
  }
  try {
    const user = await UserRepository.updateStatus(req.params.id, status);
    if (!user) { fail(res, "User not found", 404); return; }

    await AuditLogRepository.create({
      userId: req.user!.userId,
      action: "USER_STATUS_CHANGED",
      description: `User ${req.params.id} status → ${status}`,
      ipAddress: getIp(req),
    });
    success(res, { user });
  } catch (err) { next(err); }
}
