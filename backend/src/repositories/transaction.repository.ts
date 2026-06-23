import { query, queryOne } from "../db";

export interface Transaction {
  id: string;
  tx_hash: string | null;
  sender: string;
  recipient: string;
  token_id: string;
  amount: string;
  status: string;
  error_msg: string | null;
  created_at: Date;
  updated_at: Date;
  // joined
  token_symbol?: string;
  token_name?: string;
}

export interface ListTransactionsOptions {
  page: number;
  limit: number;
  status?: string;
  recipient?: string;
  tokenId?: string;
}

export const TransactionRepository = {
  async create(data: {
    sender: string;
    recipient: string;
    tokenId: string;
    amount: string;
  }): Promise<Transaction> {
    const [tx] = await query<Transaction>(
      `INSERT INTO transactions (sender, recipient, token_id, amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.sender, data.recipient, data.tokenId, data.amount]
    );
    return tx;
  },

  async updateSuccess(id: string, txHash: string): Promise<void> {
    await query(
      `UPDATE transactions SET tx_hash = $1, status = 'success' WHERE id = $2`,
      [txHash, id]
    );
  },

  async updateFailed(id: string, errorMsg: string): Promise<void> {
    await query(
      `UPDATE transactions SET status = 'failed', error_msg = $1 WHERE id = $2`,
      [errorMsg, id]
    );
  },

  async updateManySuccess(ids: string[], txHash: string): Promise<void> {
    await query(
      `UPDATE transactions SET tx_hash = $1, status = 'success' WHERE id = ANY($2::uuid[])`,
      [txHash, ids]
    );
  },

  async updateManyFailed(ids: string[], errorMsg: string): Promise<void> {
    await query(
      `UPDATE transactions SET status = 'failed', error_msg = $1 WHERE id = ANY($2::uuid[])`,
      [errorMsg, ids]
    );
  },

  async findById(id: string): Promise<Transaction | null> {
    return queryOne<Transaction>(
      `SELECT t.*, tk.symbol AS token_symbol, tk.name AS token_name
       FROM transactions t LEFT JOIN tokens tk ON t.token_id = tk.id
       WHERE t.id = $1`,
      [id]
    );
  },

  async findAll(opts: ListTransactionsOptions): Promise<{ transactions: Transaction[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts.status)    { params.push(opts.status);          conditions.push(`t.status = $${params.length}`); }
    if (opts.recipient) { params.push(`%${opts.recipient}%`); conditions.push(`t.recipient ILIKE $${params.length}`); }
    if (opts.tokenId)   { params.push(opts.tokenId);          conditions.push(`t.token_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const transactions = await query<Transaction>(
      `SELECT t.*, tk.symbol AS token_symbol, tk.name AS token_name
       FROM transactions t LEFT JOIN tokens tk ON t.token_id = tk.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, (opts.page - 1) * opts.limit]
    );

    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*) FROM transactions t ${where}`,
      params
    );

    return { transactions, total: Number(count) };
  },

  async getDashboardStats() {
    const [stats] = await query<any>(`
      SELECT
        COUNT(*)                                            AS total_transfers,
        COALESCE(SUM(amount), 0)                            AS total_distributed,
        COUNT(*) FILTER (WHERE status = 'success')          AS success_count,
        COUNT(*) FILTER (WHERE status = 'failed')           AS failed_count,
        COUNT(*) FILTER (WHERE status = 'pending')          AS pending_count
      FROM transactions
    `);
    return stats;
  },

  async getDailyActivity() {
    return query<any>(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count, SUM(amount) AS total
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
  },
};
