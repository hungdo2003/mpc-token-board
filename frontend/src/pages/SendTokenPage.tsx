import React, { useEffect, useState } from "react";
import { transfersApi, tokensApi, usersApi } from "../services/api";

interface Token { id: string; name: string; symbol: string; }

type Tab = "address" | "userId";

export function SendTokenPage() {
  const [tab, setTab] = useState<Tab>("address");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenId, setTokenId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txHash: string; status: string } | null>(null);
  const [error, setError] = useState("");

  // User search state
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);

  useEffect(() => {
    tokensApi.list().then(({ data }) => setTokens(data.tokens));
  }, []);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    const { data } = await usersApi.list({ search: q, limit: 5 });
    setUserResults(data.users);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = tab === "address"
        ? await transfersApi.sendByAddress(tokenId, recipient, amount)
        : await transfersApi.sendByUserId(tokenId, userId, amount);
      setResult(data);
      setAmount("");
      setRecipient("");
      setUserId("");
      setUserSearch("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-xl font-bold">Send Tokens</h2>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-gray-800 rounded-lg w-fit">
        {(["address", "userId"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); setResult(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-violet-600 text-white" : "text-gray-400 hover:text-gray-100"}`}
          >
            {t === "address" ? "By Wallet Address" : "By User ID"}
          </button>
        ))}
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token selector */}
          <div>
            <label className="label">Token</label>
            <select className="input" value={tokenId} onChange={(e) => setTokenId(e.target.value)} required>
              <option value="">Select token...</option>
              {tokens.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
              ))}
            </select>
          </div>

          {tab === "address" ? (
            <div>
              <label className="label">Recipient Wallet Address</label>
              <input className="input font-mono text-sm" placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
            </div>
          ) : (
            <div>
              <label className="label">Search User</label>
              <input
                className="input"
                placeholder="Search by email..."
                value={userSearch}
                onChange={(e) => searchUsers(e.target.value)}
              />
              {userResults.length > 0 && (
                <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                  {userResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setUserId(u.id); setUserSearch(u.email); setUserResults([]); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                    >
                      <p>{u.email}</p>
                      {u.wallet_address && <p className="text-xs text-gray-500 font-mono">{u.wallet_address.slice(0, 16)}...</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Amount</label>
            <input type="number" className="input" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="any" required />
          </div>

          {error && <p className="text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}

          {result && (
            <div className="bg-green-900/30 border border-green-800 px-4 py-3 rounded-lg text-sm">
              <p className="text-green-300 font-medium">Transfer Successful!</p>
              <p className="text-gray-400 mt-1 font-mono text-xs break-all">TxHash: {result.txHash}</p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading || !tokenId}>
            {loading ? "Processing via MPC..." : "Send Tokens"}
          </button>
        </form>
      </div>
    </div>
  );
}
