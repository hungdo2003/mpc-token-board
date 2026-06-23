import React, { useEffect, useState, useCallback } from "react";
import { transfersApi, tokensApi } from "../services/api";

interface Transaction {
  id: string;
  tx_hash: string;
  sender: string;
  recipient: string;
  amount: string;
  status: string;
  token_symbol: string;
  token_name: string;
  created_at: string;
  error_msg: string | null;
}
interface Token { id: string; symbol: string; }

function StatusBadge({ status }: { status: string }) {
  if (status === "success") return <span className="badge-success">Success</span>;
  if (status === "failed") return <span className="badge-failed">Failed</span>;
  return <span className="badge-pending">Pending</span>;
}

export function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "", recipient: "", tokenId: "" });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const limit = 20;

  useEffect(() => {
    tokensApi.list(true).then(({ data }) => setTokens(data.tokens));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await transfersApi.list({
        page,
        limit,
        status: filters.status || undefined,
        recipient: filters.recipient || undefined,
        tokenId: filters.tokenId || undefined,
      });
      setTransactions(data.transactions);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Transaction History</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="label">Recipient</label>
            <input className="input font-mono text-xs" placeholder="0x..." value={filters.recipient} onChange={(e) => { setFilters({ ...filters, recipient: e.target.value }); setPage(1); }} />
          </div>
          <div>
            <label className="label">Token</label>
            <select className="input" value={filters.tokenId} onChange={(e) => { setFilters({ ...filters, tokenId: e.target.value }); setPage(1); }}>
              <option value="">All</option>
              {tokens.map((t) => <option key={t.id} value={t.id}>{t.symbol}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="th">TxHash</th>
                <th className="th">Recipient</th>
                <th className="th">Amount</th>
                <th className="th">Token</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-12 text-gray-500">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-12 text-gray-500">No transactions found</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="table-row cursor-pointer" onClick={() => setSelected(tx)}>
                  <td className="td font-mono text-xs">
                    {tx.tx_hash ? `${tx.tx_hash.slice(0, 10)}...` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="td font-mono text-xs">{tx.recipient.slice(0, 10)}...{tx.recipient.slice(-6)}</td>
                  <td className="td">{Number(tx.amount).toLocaleString()}</td>
                  <td className="td">{tx.token_symbol}</td>
                  <td className="td"><StatusBadge status={tx.status} /></td>
                  <td className="td text-xs text-gray-500">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span className="text-sm text-gray-400 self-center">Page {page} / {totalPages}</span>
          <button className="btn-secondary text-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold">Transaction Detail</h3>
              <button className="text-gray-500 hover:text-gray-300" onClick={() => setSelected(null)}>✕</button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={selected.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Token</dt><dd>{selected.token_name} ({selected.token_symbol})</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd>{Number(selected.amount).toLocaleString()}</dd></div>
              <div><dt className="text-gray-500 mb-1">Sender</dt><dd className="font-mono text-xs break-all">{selected.sender}</dd></div>
              <div><dt className="text-gray-500 mb-1">Recipient</dt><dd className="font-mono text-xs break-all">{selected.recipient}</dd></div>
              {selected.tx_hash && <div><dt className="text-gray-500 mb-1">TxHash</dt><dd className="font-mono text-xs break-all">{selected.tx_hash}</dd></div>}
              {selected.error_msg && <div><dt className="text-gray-500 mb-1">Error</dt><dd className="text-red-400 text-xs">{selected.error_msg}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd>{new Date(selected.created_at).toLocaleString()}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
