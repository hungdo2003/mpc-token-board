import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { transfersApi, tokensApi, usersApi } from "../services/api";

interface Token { id: string; name: string; symbol: string; decimals: number; }
interface TxResult { txHash: string | null; txId: string; status: string; }

type Tab = "address" | "userId";

const CHAIN_ID = Number(process.env.REACT_APP_CHAIN_ID || 11155111);
const ETHERSCAN =
  CHAIN_ID === 11155111 ? "https://sepolia.etherscan.io" :
  CHAIN_ID === 1        ? "https://etherscan.io" : null;

function isValidAddress(addr: string) {
  return addr.startsWith("0x") && ethers.isAddress(addr);
}

export function SendTokenPage() {
  const [tab, setTab]             = useState<Tab>("address");
  const [tokens, setTokens]       = useState<Token[]>([]);
  const [tokenId, setTokenId]     = useState("");
  const [recipient, setRecipient] = useState("");
  const [userId, setUserId]       = useState("");
  const [amount, setAmount]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<TxResult | null>(null);
  const [error, setError]         = useState("");

  // User search
  const [userSearch, setUserSearch]   = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);

  // Live address validation state
  const [addrTouched, setAddrTouched] = useState(false);

  const selectedToken = tokens.find((t) => t.id === tokenId) ?? null;

  useEffect(() => {
    tokensApi.list().then(({ data }) => setTokens(data.tokens));
  }, []);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    setUserId("");
    if (q.length < 2) { setUserResults([]); return; }
    try {
      const { data } = await usersApi.list({ search: q, limit: 5 });
      setUserResults(data.users);
    } catch { /* silently ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === "address" && !isValidAddress(recipient)) {
      setError("Enter a valid Ethereum wallet address (0x…)");
      return;
    }

    if (Number(amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } =
        tab === "address"
          ? await transfersApi.sendByAddress(tokenId, recipient, amount)
          : await transfersApi.sendByUserId(tokenId, userId, amount);

      setResult(data);
      toast.success("Transfer submitted!");
      setAmount("");
      setRecipient("");
      setUserId("");
      setUserSearch("");
      setAddrTouched(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Transfer failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
    setResult(null);
    setRecipient("");
    setUserId("");
    setUserSearch("");
    setUserResults([]);
    setAddrTouched(false);
  };

  const addrInvalid = addrTouched && recipient !== "" && !isValidAddress(recipient);
  const canSubmit   = tokenId && amount && (tab === "address" ? isValidAddress(recipient) : !!userId);

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-xl font-bold">Send Tokens</h2>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-gray-800 rounded-lg w-fit">
        {(["address", "userId"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-violet-600 text-white" : "text-gray-400 hover:text-gray-100"
            }`}
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
            <select
              className="input"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              required
            >
              <option value="">Select token…</option>
              {tokens.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
              ))}
            </select>
          </div>

          {/* Recipient field */}
          {tab === "address" ? (
            <div>
              <label className="label">Recipient Wallet Address</label>
              <input
                className={`input font-mono text-sm ${addrInvalid ? "border-red-600 focus:ring-red-500" : ""}`}
                placeholder="0x…"
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setAddrTouched(true); }}
                onBlur={() => setAddrTouched(true)}
                required
              />
              {addrInvalid && (
                <p className="text-xs text-red-400 mt-1">Not a valid Ethereum address</p>
              )}
              {!addrInvalid && recipient && isValidAddress(recipient) && (
                <p className="text-xs text-green-500 mt-1">✓ Valid Ethereum address</p>
              )}
            </div>
          ) : (
            <div className="relative">
              <label className="label">Search User</label>
              <input
                className="input"
                placeholder="Search by email…"
                value={userSearch}
                onChange={(e) => searchUsers(e.target.value)}
                autoComplete="off"
              />
              {userId && (
                <p className="text-xs text-green-500 mt-1">✓ User selected</p>
              )}
              {userResults.length > 0 && !userId && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
                  {userResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setUserId(u.id);
                        setUserSearch(u.email);
                        setUserResults([]);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0"
                    >
                      <p className="font-medium">{u.email}</p>
                      {u.wallet_address
                        ? <p className="text-xs text-gray-500 font-mono mt-0.5">{u.wallet_address.slice(0, 20)}…</p>
                        : <p className="text-xs text-orange-400 mt-0.5">No wallet linked</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="label mb-0">Amount</label>
              {selectedToken && (
                <span className="text-xs text-gray-500">{selectedToken.symbol} · {selectedToken.decimals} decimals</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                className="input pr-16"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="any"
                required
              />
              {selectedToken && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-mono">
                  {selectedToken.symbol}
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Success */}
          {result && (
            <div className="bg-green-900/30 border border-green-800 px-4 py-3 rounded-lg text-sm space-y-1">
              <p className="text-green-300 font-semibold">Transfer Successful!</p>
              {result.txHash ? (
                <>
                  <p className="text-gray-400 font-mono text-xs break-all">
                    Tx: {result.txHash}
                  </p>
                  {ETHERSCAN && (
                    <a
                      href={`${ETHERSCAN}/tx/${result.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:text-violet-300 text-xs underline"
                    >
                      View on Etherscan ↗
                    </a>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-xs">Tx ID: {result.txId}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !canSubmit}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  Processing via MCP…
                </span>
              : `Send ${selectedToken ? selectedToken.symbol : "Tokens"}`}
          </button>
        </form>
      </div>

      {/* Info card */}
      <div className="card bg-gray-800/40 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">How it works</p>
        <p>Tokens are transferred via the MCP-signed <span className="font-mono text-gray-400">TokenDistributor</span> contract on-chain.</p>
        <p>The operator wallet signs each transaction — no MetaMask approval needed from the sender.</p>
      </div>
    </div>
  );
}
