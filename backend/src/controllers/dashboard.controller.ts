import { Request, Response } from "express";
import { query, queryOne } from "../db";
import { mcpService } from "../services/mcp.service";

export async function getStats(req: Request, res: Response): Promise<void> {
  const [
    totalRow,
    successRow,
    failedRow,
    usersRow,
    tokensRow,
    recentTx,
    dailyRow,
  ] = await Promise.all([
    queryOne<any>(`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM transactions`),
    queryOne<any>(`SELECT COUNT(*) AS count FROM transactions WHERE status = 'success'`),
    queryOne<any>(`SELECT COUNT(*) AS count FROM transactions WHERE status = 'failed'`),
    queryOne<any>(`SELECT COUNT(*) AS count FROM users WHERE status = 'active'`),
    queryOne<any>(`SELECT COUNT(*) AS count FROM tokens WHERE status = 'active'`),
    query(
      `SELECT t.*, tk.symbol AS token_symbol FROM transactions t LEFT JOIN tokens tk ON t.token_id = tk.id ORDER BY t.created_at DESC LIMIT 5`
    ),
    query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count, SUM(amount) AS total
       FROM transactions
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    ),
  ]);

  const total = Number(totalRow?.count || 0);
  const success = Number(successRow?.count || 0);
  const failed = Number(failedRow?.count || 0);

  res.json({
    stats: {
      totalTransfers: total,
      totalTokensDistributed: totalRow?.total || "0",
      successCount: success,
      failedCount: failed,
      successRate: total > 0 ? ((success / total) * 100).toFixed(1) : "0",
      activeUsers: Number(usersRow?.count || 0),
      activeTokens: Number(tokensRow?.count || 0),
    },
    recentTransactions: recentTx,
    dailyActivity: dailyRow,
  });
}

export async function getMcpStatus(_req: Request, res: Response): Promise<void> {
  const status = await mcpService.getStatus();
  res.json({ mcp: status });
}

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const { action, userId } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];

  if (action) { conditions.push(`al.action ILIKE $${params.length + 1}`); params.push(`%${action}%`); }
  if (userId) { conditions.push(`al.user_id = $${params.length + 1}`); params.push(userId); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const logs = await query(
    `SELECT al.*, u.email AS user_email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${where} ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const [{ count }] = await query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params);

  res.json({ logs, total: Number(count), page, limit });
}
