import { Request, Response } from "express";
import { ethers } from "ethers";
import { z } from "zod";
import { query, queryOne } from "../db";
import { auditLog } from "../utils/audit";

const TokenSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1).max(20),
  contractAddress: z
    .string()
    .refine((addr) => ethers.isAddress(addr), "Invalid contract address"),
  decimals: z.number().int().min(0).max(18).default(18),
});

export async function listTokens(req: Request, res: Response): Promise<void> {
  const showAll = req.query.all === "true";
  const sql = showAll
    ? `SELECT * FROM tokens ORDER BY created_at DESC`
    : `SELECT * FROM tokens WHERE status = 'active' ORDER BY created_at DESC`;
  const tokens = await query(sql);
  res.json({ tokens });
}

export async function getToken(req: Request, res: Response): Promise<void> {
  const token = await queryOne(`SELECT * FROM tokens WHERE id = $1`, [req.params.id]);
  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }
  res.json({ token });
}

export async function addToken(req: Request, res: Response): Promise<void> {
  const parse = TokenSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { name, symbol, contractAddress, decimals } = parse.data;

  const existing = await queryOne(`SELECT id FROM tokens WHERE contract_address = $1`, [
    contractAddress.toLowerCase(),
  ]);
  if (existing) {
    res.status(409).json({ error: "Token with this address already exists" });
    return;
  }

  const [token] = await query(
    `INSERT INTO tokens (name, symbol, contract_address, decimals) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, symbol, contractAddress.toLowerCase(), decimals]
  );

  await auditLog(req.user!.userId, "ADD_TOKEN", `Added token: ${symbol} (${contractAddress})`, req);
  res.status(201).json({ token });
}

export async function updateToken(req: Request, res: Response): Promise<void> {
  const { name, symbol, decimals } = req.body;

  const token = await queryOne(
    `UPDATE tokens SET name = COALESCE($1, name), symbol = COALESCE($2, symbol), decimals = COALESCE($3, decimals), updated_at = NOW() WHERE id = $4 RETURNING *`,
    [name || null, symbol || null, decimals ?? null, req.params.id]
  );
  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  await auditLog(req.user!.userId, "UPDATE_TOKEN", `Updated token ${req.params.id}`, req);
  res.json({ token });
}

export async function disableToken(req: Request, res: Response): Promise<void> {
  const token = await queryOne(
    `UPDATE tokens SET status = 'disabled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  await auditLog(req.user!.userId, "DISABLE_TOKEN", `Disabled token ${req.params.id}`, req);
  res.json({ token });
}
