import { query } from "../db";

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  description: string | null;
  ip_address: string | null;
  created_at: Date;
  user_email?: string;
}

export interface ListAuditLogsOptions {
  page: number;
  limit: number;
  action?: string;
  userId?: string;
}

export const AuditLogRepository = {
  async create(data: {
    userId: string | null;
    action: string;
    description: string;
    ipAddress?: string | null;
  }): Promise<void> {
    await query(
      `INSERT INTO audit_logs (user_id, action, description, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [data.userId, data.action, data.description, data.ipAddress ?? null]
    );
  },

  async findAll(opts: ListAuditLogsOptions): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts.action) { params.push(`%${opts.action}%`); conditions.push(`al.action ILIKE $${params.length}`); }
    if (opts.userId) { params.push(opts.userId);         conditions.push(`al.user_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const logs = await query<AuditLog>(
      `SELECT al.*, u.email AS user_email
       FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, (opts.page - 1) * opts.limit]
    );

    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs al ${where}`,
      params
    );

    return { logs, total: Number(count) };
  },
};
