import React, { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { transfersApi, tokensApi, usersApi } from "../services/api";

interface Token   { id: string; name: string; symbol: string; decimals: number; }
interface User    { id: string; email: string; wallet_address: string | null; role: string; status: string; }
interface TxResult { txHash: string | null; txId: string; status: string; }

type Tab = "address" | "userId";

const CHAIN_ID  = Number(process.env.REACT_APP_CHAIN_ID || 11155111);
const ETHERSCAN =
  CHAIN_ID === 11155111 ? "https://sepolia.etherscan.io"
  : CHAIN_ID === 1      ? "https://etherscan.io"
  : null;

function isValidAddress(addr: string) {
  return addr.startsWith("0x") && ethers.isAddress(addr);
}

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SendTokenPage() {
  const [tab, setTab]         = useState<Tab>("address");
  const [tokens, setTokens]   = useState<Token[]>([]);
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<TxResult | null>(null);
  const [error, setError]     = useState("");

  // ── By-address state ────────────────────────────────────────────────────────
  const [recipient, setRecipient]   = useState("");
  const [addrTouched, setAddrTouched] = useState(false);

  // ── By-user-ID state ────────────────────────────────────────────────────────
  const [userQuery, setUserQuery]         = useState("");
  const [userResults, setUserResults]     = useState<User[]>([]);
  const [selectedUser, setSelectedUser]   = useState<User | null>(null);
  const [userSearching, setUserSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(userQuery, 300);

  const selectedToken = tokens.find((t) => t.id === tokenId) ?? null;

  useEffect(() => {
    tokensApi.list().then(({ data }) => setTokens(data.tokens));
  }, []);

  // Search users when debounced query changes (only when no user is selected yet)
  useEffect(() => {
    if (selectedUser || debouncedQuery.length < 2) { setUserResults([]); return; }
    setUserSearching(true);
    usersApi.list({ search: debouncedQuery, limit: 8 })
      .then(({ data }) => setUserResults(data.users))
      .catch(() => setUserResults([]))
      .finally(() => setUserSearching(false));
  }, [debouncedQuery, selectedUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectUser = useCallback((u: User) => {
    setSelectedUser(u);
    setUserQuery(u.email);
    setUserResults([]);
    setError("");
  }, []);

  const clearUser = () => {
    setSelectedUser(null);
    setUserQuery("");
    setUserResults([]);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === "address" && !isValidAddress(recipient)) {
      setError("Enter a valid Ethereum wallet address (0x…)");
      return;
    }
    if (tab === "userId") {
      if (!selectedUser) { setError("Select a user first"); return; }
      if (!selectedUser.wallet_address) {
        setError(`${selectedUser.email} has no linked wallet. Ask them to connect a wallet first.`);
        return;
      }
    }
    if (Number(amount) <= 0) { setError("Amount must be greater than 0"); return; }

    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } =
        tab === "address"
          ? await transfersApi.sendByAddress(tokenId, recipient, amount)
          : await transfersApi.sendByUserId(tokenId, selectedUser!.id, amount);

      setResult(data);
      toast.success("Transfer submitted!");
      setAmount("");
      setRecipient(""); setAddrTouched(false);
      clearUser();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Transfer failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Tab switch ──────────────────────────────────────────────────────────────
  const switchTab = (t: Tab) => {
    setTab(t); setError(""); setResult(null);
    setRecipient(""); setAddrTouched(false);
    clearUser();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const addrInvalid = addrTouched && recipient !== "" && !isValidAddress(recipient);

  const canSubmit = tokenId && Number(amount) > 0 && (
    tab === "address"
      ? isValidAddress(recipient)
      : !!(selectedUser?.wallet_address)
  );

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

          {/* ── By Wallet Address ── */}
          {tab === "address" && (
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
              {!addrInvalid && isValidAddress(recipient) && (
                <p className="text-xs text-green-500 mt-1">✓ Valid Ethereum address</p>
              )}
            </div>
          )}

          {/* ── By User ID ── */}
          {tab === "userId" && (
            <div className="space-y-3">
              <div className="relative" ref={dropdownRef}>
                <label className="label">Search User</label>
                <div className="relative">
                  <input
                    className="input pr-8"
                    placeholder="Search by email…"
                    value={userQuery}
                    onChange={(e) => { setUserQuery(e.target.value); if (selectedUser) clearUser(); }}
                    autoComplete="off"
                  />
                  {userSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-gray-500 border-t-violet-400 rounded-full inline-block" />
                    </span>
                  )}
                </div>

                {/* Search results dropdown */}
                {userResults.length > 0 && !selectedUser && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectUser(u)}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{u.email}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${u.role === "admin" ? "bg-violet-900/60 text-violet-300" : "bg-gray-700 text-gray-400"}`}>
                            {u.role}
                          </span>
                        </div>
                        {u.wallet_address
                          ? <p className="text-xs text-gray-500 font-mono mt-0.5">{u.wallet_address.slice(0, 22)}…</p>
                          : <p className="text-xs text-orange-400 mt-0.5">No wallet linked</p>}
                      </button>
                    ))}
                  </div>
                )}

                {!selectedUser && userQuery.length >= 2 && !userSearching && userResults.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No users found for "{userQuery}"</p>
                )}
              </div>

              {/* Selected user card */}
              {selectedUser && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${
                  selectedUser.wallet_address
                    ? "border-violet-700 bg-violet-900/20"
                    : "border-orange-700 bg-orange-900/20"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedUser.email}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${selectedUser.role === "admin" ? "bg-violet-900/60 text-violet-300" : "bg-gray-700 text-gray-400"}`}>
                        {selectedUser.role}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${selectedUser.status === "active" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                        {selectedUser.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearUser}
                      className="text-gray-500 hover:text-gray-300 text-xs shrink-0 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                    >
                      Change
                    </button>
                  </div>

                  {selectedUser.wallet_address ? (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-0.5">Wallet</p>
                      <p className="font-mono text-xs text-gray-300 break-all">{selectedUser.wallet_address}</p>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1.5 text-orange-400 text-xs">
                      <span>⚠</span>
                      <span>This user has no linked wallet — they cannot receive tokens until they connect one.</span>
                    </div>
                  )}
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-mono pointer-events-none">
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
            <div className="bg-green-900/30 border border-green-800 px-4 py-3 rounded-lg text-sm space-y-1.5">
              <p className="text-green-300 font-semibold">Transfer Successful!</p>
              {result.txHash ? (
                <>
                  <p className="text-gray-400 font-mono text-xs break-all">Tx: {result.txHash}</p>
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
              ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  Processing via MCP…
                </span>
              )
              : `Send ${selectedToken?.symbol ?? "Tokens"}`}
          </button>
        </form>
      </div>

      {/* Info card */}
      <div className="card bg-gray-800/40 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">How it works</p>
        <p>Tokens are sent via the MCP-signed <span className="font-mono text-gray-400">TokenDistributor</span> contract — the operator wallet signs each transaction.</p>
        <p className="text-gray-600">By User ID: the system looks up the user's linked wallet address and transfers to it.</p>
      </div>
    </div>
  );
}
