import { query, queryOne } from "../db";

export interface Token {
  id: string;
  name: string;
  symbol: string;
  contract_address: string;
  decimals: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export const TokenRepository = {
  async findAll(includeDisabled = false): Promise<Token[]> {
    const where = includeDisabled ? "" : "WHERE status = 'active'";
    return query<Token>(`SELECT * FROM tokens ${where} ORDER BY created_at DESC`);
  },

  async findById(id: string): Promise<Token | null> {
    return queryOne<Token>("SELECT * FROM tokens WHERE id = $1", [id]);
  },

  async findByAddress(contractAddress: string): Promise<Token | null> {
    return queryOne<Token>("SELECT * FROM tokens WHERE contract_address = $1", [
      contractAddress.toLowerCase(),
    ]);
  },

  async create(data: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
  }): Promise<Token> {
    const [token] = await query<Token>(
      `INSERT INTO tokens (name, symbol, contract_address, decimals)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.symbol, data.contractAddress.toLowerCase(), data.decimals]
    );
    return token;
  },

  async update(
    id: string,
    data: Partial<{ name: string; symbol: string; decimals: number }>
  ): Promise<Token | null> {
    return queryOne<Token>(
      `UPDATE tokens
       SET name     = COALESCE($1, name),
           symbol   = COALESCE($2, symbol),
           decimals = COALESCE($3, decimals)
       WHERE id = $4 RETURNING *`,
      [data.name ?? null, data.symbol ?? null, data.decimals ?? null, id]
    );
  },

  async disable(id: string): Promise<Token | null> {
    return queryOne<Token>(
      "UPDATE tokens SET status = 'disabled' WHERE id = $1 RETURNING *",
      [id]
    );
  },
};
