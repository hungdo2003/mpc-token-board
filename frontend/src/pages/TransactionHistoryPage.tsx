import React, { useEffect, useState, useCallback, useRef } from "react";
import { transfersApi, tokensApi } from "../services/api";

interface Transaction {
  id: string;
  tx_hash: string | null;
  sender: string;
  recipient: string;
  amount: string;
  status: string;
  token_symbol: string;
  token_name: string;
  created_at: string;
  error_msg: string | null;
}
interface Token { id: string; symbol: string; name: string; }

const CHAIN_ID  = Number(process.env.REACT_APP_CHAIN_ID || 11155111);
const ETHERSCAN =
  CHAIN_ID === 11155111 ? "https://sepolia.etherscan.io"
  : CHAIN_ID === 1      ? "https://etherscan.io"
  : null;

const LIMIT = 20;

function StatusBadge({ status }: { status: string }) {
  if (status === "success") return <span className="badge-success">Success</span>;
  if (status === "failed")  return <span className="badge-failed">Failed</span>;
  return <span className="badge-pending">Pending</span>;
}

function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3)          pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        className="btn-secondary text-sm px-3"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-600">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              p === page
                ? "bg-violet-600 text-white"
                : "btn-secondary"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        className="btn-secondary text-sm px-3"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        ›
      </button>
    </div>
  );
}

export function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokens, setTokens]             = useState<Token[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Transaction | null>(null);

  const [filters, setFilters] = useState({ status: "", recipient: "", tokenId: "" });
  // Separate draft for the recipient text input (debounced)
  const [recipientDraft, setRecipientDraft] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tokensApi.list(true).then(({ data }) => setTokens(data.tokens));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await transfersApi.list({
        page,
        limit: LIMIT,
        status:    filters.status    || undefined,
        recipient: filters.recipient || undefined,
        tokenId:   filters.tokenId   || undefined,
      });
      setTransactions(data.transactions);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);
  const hasFilters = !!(filters.status || filters.recipient || filters.tokenId);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleRecipientChange = (value: string) => {
    setRecipientDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter("recipient", value);
    }, 400);
  };

  const clearFilters = () => {
    setFilters({ status: "", recipient: "", tokenId: "" });
    setRecipientDraft("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Transaction History</h2>
        <span className="text-sm text-gray-500">{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="label">Recipient address</label>
            <input
              className="input font-mono text-xs"
              placeholder="0x… (search)"
              value={recipientDraft}
              onChange={(e) => handleRecipientChange(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Token</label>
            <select
              className="input"
              value={filters.tokenId}
              onChange={(e) => setFilter("tokenId", e.target.value)}
            >
              <option value="">All tokens</option>
              {tokens.map((t) => (
                <option key={t.id} value={t.id}>{t.symbol} — {t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-700/50">
            <span className="text-xs text-gray-500">Active filters:</span>
            {filters.status && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                Status: {filters.status}
              </span>
            )}
            {filters.recipient && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-mono">
                {filters.recipient.slice(0, 10)}…
              </span>
            )}
            {filters.tokenId && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                {tokens.find((t) => t.id === filters.tokenId)?.symbol}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
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
                <tr>
                  <td colSpan={6} className="td text-center py-12">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td text-center py-12 text-gray-500">
                    {hasFilters ? "No transactions match your filters" : "No transactions yet"}
                  </td>
                </tr>
              ) : transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="table-row cursor-pointer"
                  onClick={() => setSelected(tx)}
                >
                  <td className="td font-mono text-xs">
                    {tx.tx_hash
                      ? `${tx.tx_hash.slice(0, 8)}…${tx.tx_hash.slice(-6)}`
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="td font-mono text-xs">
                    {tx.recipient.slice(0, 8)}…{tx.recipient.slice(-6)}
                  </td>
                  <td className="td tabular-nums">{Number(tx.amount).toLocaleString()}</td>
                  <td className="td font-medium text-violet-300">{tx.token_symbol}</td>
                  <td className="td"><StatusBadge status={tx.status} /></td>
                  <td className="td text-xs text-gray-500 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div className="card max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">Transaction Detail</h3>
              <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={selected.status} />
              <span className="text-sm text-gray-400">{selected.token_name} ({selected.token_symbol})</span>
              <span className="ml-auto font-semibold">{Number(selected.amount).toLocaleString()}</span>
            </div>

            <dl className="space-y-2.5 text-sm border-t border-gray-700/50 pt-3">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Sender</dt>
                <dd className="font-mono text-xs break-all bg-gray-800 px-2 py-1.5 rounded">{selected.sender}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Recipient</dt>
                <dd className="font-mono text-xs break-all bg-gray-800 px-2 py-1.5 rounded">{selected.recipient}</dd>
              </div>
              {selected.tx_hash && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Transaction Hash</dt>
                  <dd className="font-mono text-xs break-all bg-gray-800 px-2 py-1.5 rounded">{selected.tx_hash}</dd>
                  {ETHERSCAN && (
                    <a
                      href={`${ETHERSCAN}/tx/${selected.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 underline mt-1 inline-block"
                    >
                      View on Etherscan ↗
                    </a>
                  )}
                </div>
              )}
              {selected.error_msg && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Error</dt>
                  <dd className="text-red-400 text-xs bg-red-900/20 px-2 py-1.5 rounded">{selected.error_msg}</dd>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-300">{new Date(selected.created_at).toLocaleString()}</span>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
