import { Request, Response } from "express";
import { ethers } from "ethers";
import { z } from "zod";
import { parse as parseCsv } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { query, queryOne } from "../db";
import { mpcService } from "../services/mpc.service";
import { auditLog } from "../utils/audit";

const TransferByAddressSchema = z.object({
  tokenId: z.string().uuid(),
  recipient: z.string().refine((a) => ethers.isAddress(a), "Invalid wallet address"),
  amount: z.string().min(1),
});

const TransferByUserIdSchema = z.object({
  tokenId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.string().min(1),
});

// ─── Helper ──────────────────────────────────────────────────────────────────

async function executeTransfer(
  tokenId: string,
  recipient: string,
  amount: string,
  requestedBy: string,
  req: Request
): Promise<{ txHash: string | null; txId: string; status: string }> {
  const token = await queryOne<any>(`SELECT * FROM tokens WHERE id = $1 AND status = 'active'`, [tokenId]);
  if (!token) throw new Error("Token not found or disabled");

  const amountWei = ethers.parseUnits(amount, token.decimals);
  const sender = mpcService.getOperatorAddress();
  const requestId = uuidv4();

  // Create pending transaction record
  const [tx] = await query<any>(
    `INSERT INTO transactions (tx_hash, sender, recipient, token_id, amount, status) VALUES (NULL, $1, $2, $3, $4, 'pending') RETURNING id`,
    [sender, recipient.toLowerCase(), tokenId, amount]
  );
  const txId = tx.id;

  try {
    const txHash = await mpcService.distributeToken(
      token.contract_address,
      recipient,
      amountWei,
      requestId
    );

    await query(
      `UPDATE transactions SET tx_hash = $1, status = 'success', updated_at = NOW() WHERE id = $2`,
      [txHash, txId]
    );

    await auditLog(requestedBy, "TRANSFER", `Sent ${amount} ${token.symbol} to ${recipient} | TxHash: ${txHash}`, req);
    return { txHash, txId, status: "success" };
  } catch (err: any) {
    await query(
      `UPDATE transactions SET status = 'failed', error_msg = $1, updated_at = NOW() WHERE id = $2`,
      [err.message, txId]
    );
    throw err;
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function sendByAddress(req: Request, res: Response): Promise<void> {
  const parse = TransferByAddressSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { tokenId, recipient, amount } = parse.data;

  try {
    const result = await executeTransfer(tokenId, recipient, amount, req.user!.userId, req);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function sendByUserId(req: Request, res: Response): Promise<void> {
  const parse = TransferByUserIdSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { tokenId, userId, amount } = parse.data;

  const user = await queryOne<any>(`SELECT id, wallet_address FROM users WHERE id = $1`, [userId]);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (!user.wallet_address) {
    res.status(400).json({ error: "User does not have a linked wallet address" });
    return;
  }

  try {
    const result = await executeTransfer(tokenId, user.wallet_address, amount, req.user!.userId, req);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function sendBulk(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "CSV file is required" });
    return;
  }

  const tokenId = req.body.tokenId;
  if (!tokenId) {
    res.status(400).json({ error: "tokenId is required" });
    return;
  }

  const token = await queryOne<any>(`SELECT * FROM tokens WHERE id = $1 AND status = 'active'`, [tokenId]);
  if (!token) {
    res.status(404).json({ error: "Token not found or disabled" });
    return;
  }

  // Parse CSV
  let records: { userId?: string; walletAddress?: string; amount: string }[];
  try {
    records = parseCsv(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    res.status(400).json({ error: "Invalid CSV format" });
    return;
  }

  if (records.length === 0) {
    res.status(400).json({ error: "CSV is empty" });
    return;
  }

  if (records.length > 1000) {
    res.status(400).json({ error: "Batch size exceeds 1000 recipients" });
    return;
  }

  // Validate and resolve wallet addresses
  const resolved: { recipient: string; amount: string; amountWei: bigint }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // header = row 1

    // Resolve recipient
    let recipient: string | null = null;
    if (row.walletAddress && ethers.isAddress(row.walletAddress)) {
      recipient = row.walletAddress;
    } else if (row.userId) {
      const user = await queryOne<any>(`SELECT wallet_address FROM users WHERE id = $1`, [row.userId]);
      if (!user?.wallet_address) {
        errors.push(`Row ${rowNum}: User ${row.userId} not found or has no wallet`);
        continue;
      }
      recipient = user.wallet_address;
    } else {
      errors.push(`Row ${rowNum}: Must provide userId or walletAddress`);
      continue;
    }

    if (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) {
      errors.push(`Row ${rowNum}: Invalid amount "${row.amount}"`);
      continue;
    }

    try {
      const amountWei = ethers.parseUnits(row.amount, token.decimals);
      resolved.push({ recipient: recipient!, amount: row.amount, amountWei });
    } catch {
      errors.push(`Row ${rowNum}: Amount parse error "${row.amount}"`);
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: "Validation errors in CSV", details: errors });
    return;
  }

  const sender = mpcService.getOperatorAddress();
  const requestId = uuidv4();

  // Insert pending transactions
  const txIds: string[] = [];
  for (const r of resolved) {
    const [row] = await query<any>(
      `INSERT INTO transactions (sender, recipient, token_id, amount, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [sender, r.recipient, tokenId, r.amount]
    );
    txIds.push(row.id);
  }

  // Execute batch on-chain
  try {
    const txHash = await mpcService.distributeBatch(
      token.contract_address,
      resolved.map((r) => r.recipient),
      resolved.map((r) => r.amountWei),
      requestId
    );

    // Update all transactions
    await query(
      `UPDATE transactions SET tx_hash = $1, status = 'success', updated_at = NOW() WHERE id = ANY($2::uuid[])`,
      [txHash, txIds]
    );

    await auditLog(
      req.user!.userId,
      "BULK_TRANSFER",
      `Batch of ${resolved.length} transfers | TxHash: ${txHash}`,
      req
    );

    res.json({ txHash, count: resolved.length, status: "success" });
  } catch (err: any) {
    await query(
      `UPDATE transactions SET status = 'failed', error_msg = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
      [err.message, txIds]
    );
    res.status(500).json({ error: err.message });
  }
}

export async function listTransactions(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const { status, recipient, tokenId } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) { conditions.push(`t.status = $${params.length + 1}`); params.push(status); }
  if (recipient) { conditions.push(`t.recipient ILIKE $${params.length + 1}`); params.push(`%${recipient}%`); }
  if (tokenId) { conditions.push(`t.token_id = $${params.length + 1}`); params.push(tokenId); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT t.*, tk.symbol AS token_symbol, tk.name AS token_name
    FROM transactions t
    LEFT JOIN tokens tk ON t.token_id = tk.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  params.push(limit, offset);

  const [transactions, countRow] = await Promise.all([
    query(sql, params),
    query(`SELECT COUNT(*) FROM transactions t ${where}`, params.slice(0, -2)),
  ]);

  res.json({ transactions, total: Number(countRow[0].count), page, limit });
}

export async function getTransaction(req: Request, res: Response): Promise<void> {
  const tx = await queryOne(
    `SELECT t.*, tk.symbol AS token_symbol FROM transactions t LEFT JOIN tokens tk ON t.token_id = tk.id WHERE t.id = $1`,
    [req.params.id]
  );
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json({ transaction: tx });
}
