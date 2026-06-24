import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { tokensApi } from "../services/api";

interface Token {
  id: string;
  name: string;
  symbol: string;
  contract_address: string;
  decimals: number;
  status: string;
  created_at: string;
}

type Mode = "add" | "edit";

const EMPTY_ADD = { name: "", symbol: "", contractAddress: "", decimals: "18" };

export function TokensPage() {
  const [tokens, setTokens]         = useState<Token[]>([]);
  const [loading, setLoading]       = useState(true);
  const [mode, setMode]             = useState<Mode | null>(null);
  const [addForm, setAddForm]       = useState(EMPTY_ADD);
  const [editTarget, setEditTarget] = useState<Token | null>(null);
  const [editForm, setEditForm]     = useState({ name: "", symbol: "", decimals: "18" });
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [detail, setDetail]         = useState<Token | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await tokensApi.list(true);
      setTokens(data.tokens);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Add ──────────────────────────────────────────────────────────────────

  const openAdd = () => { setMode("add"); setAddForm(EMPTY_ADD); setError(""); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await tokensApi.add({ ...addForm, decimals: Number(addForm.decimals) });
      toast.success("Token added");
      setMode(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add token");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────

  const openEdit = (token: Token) => {
    setEditTarget(token);
    setEditForm({ name: token.name, symbol: token.symbol, decimals: String(token.decimals) });
    setMode("edit");
    setError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setError("");
    setSaving(true);
    try {
      await tokensApi.update(editTarget.id, {
        name: editForm.name,
        symbol: editForm.symbol,
        decimals: Number(editForm.decimals),
      });
      toast.success("Token updated");
      setMode(null);
      setEditTarget(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update token");
    } finally {
      setSaving(false);
    }
  };

  // ── Disable ───────────────────────────────────────────────────────────────

  const handleDisable = async (token: Token) => {
    if (!window.confirm(`Disable ${token.symbol}? Transfers using this token will stop.`)) return;
    try {
      await tokensApi.disable(token.id);
      toast.success(`${token.symbol} disabled`);
      await load();
    } catch {
      toast.error("Failed to disable token");
    }
  };

  // ── Close panel ───────────────────────────────────────────────────────────

  const closePanel = () => { setMode(null); setEditTarget(null); setError(""); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tokens</h2>
        <button className="btn-primary text-sm" onClick={mode === "add" ? closePanel : openAdd}>
          {mode === "add" ? "Cancel" : "+ Add Token"}
        </button>
      </div>

      {/* Add Token Form */}
      {mode === "add" && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Add New Token</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Token Name</label>
              <input
                className="input"
                placeholder="e.g. USD Coin"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Symbol</label>
              <input
                className="input"
                placeholder="e.g. USDC"
                value={addForm.symbol}
                onChange={(e) => setAddForm({ ...addForm, symbol: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="label">Contract Address</label>
              <input
                className="input font-mono text-sm"
                placeholder="0x..."
                value={addForm.contractAddress}
                onChange={(e) => setAddForm({ ...addForm, contractAddress: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Decimals</label>
              <input
                type="number"
                className="input"
                value={addForm.decimals}
                onChange={(e) => setAddForm({ ...addForm, decimals: e.target.value })}
                min={0}
                max={18}
                required
              />
            </div>

            {error && <p className="col-span-2 text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={saving}>
                {saving ? "Adding..." : "Add Token"}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={closePanel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Token Form */}
      {mode === "edit" && editTarget && (
        <div className="card border-violet-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-1">Edit Token</h3>
          <p className="text-xs text-gray-500 mb-4 font-mono">{editTarget.contract_address}</p>
          <form onSubmit={handleEdit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Token Name</label>
              <input
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Symbol</label>
              <input
                className="input"
                value={editForm.symbol}
                onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div>
              <label className="label">Decimals</label>
              <input
                type="number"
                className="input"
                value={editForm.decimals}
                onChange={(e) => setEditForm({ ...editForm, decimals: e.target.value })}
                min={0}
                max={18}
                required
              />
            </div>

            {error && <p className="col-span-2 text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={closePanel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Token Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Symbol</th>
                <th className="th">Contract Address</th>
                <th className="th">Decimals</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-12 text-gray-500">Loading...</td></tr>
              ) : tokens.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-12 text-gray-500">No tokens added yet</td></tr>
              ) : tokens.map((token) => (
                <tr
                  key={token.id}
                  className={`table-row cursor-pointer ${editTarget?.id === token.id ? "bg-violet-900/10" : ""}`}
                  onClick={() => setDetail(token)}
                >
                  <td className="td font-medium">{token.name}</td>
                  <td className="td font-mono text-xs font-semibold text-violet-300">{token.symbol}</td>
                  <td className="td font-mono text-xs">
                    {token.contract_address.slice(0, 10)}…{token.contract_address.slice(-8)}
                  </td>
                  <td className="td text-center">{token.decimals}</td>
                  <td className="td">
                    {token.status === "active"
                      ? <span className="badge-success">Active</span>
                      : <span className="badge-failed">Disabled</span>}
                  </td>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {token.status === "active" && (
                        <>
                          <button
                            onClick={() => openEdit(token)}
                            className="text-xs text-violet-400 hover:bg-violet-900/30 px-3 py-1 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDisable(token)}
                            className="text-xs text-red-400 hover:bg-red-900/30 px-3 py-1 rounded-lg transition-colors"
                          >
                            Disable
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Detail Modal */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setDetail(null)}
        >
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{detail.name}</h3>
                <span className="text-xs text-violet-300 font-mono font-semibold">{detail.symbol}</span>
              </div>
              <button className="text-gray-500 hover:text-gray-300 text-lg" onClick={() => setDetail(null)}>✕</button>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wider mb-1">Contract Address</dt>
                <dd className="font-mono text-xs break-all bg-gray-800 px-3 py-2 rounded-lg">{detail.contract_address}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-gray-500 text-xs uppercase tracking-wider mb-1">Decimals</dt>
                  <dd className="font-semibold">{detail.decimals}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs uppercase tracking-wider mb-1">Status</dt>
                  <dd>
                    {detail.status === "active"
                      ? <span className="badge-success">Active</span>
                      : <span className="badge-failed">Disabled</span>}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wider mb-1">Added</dt>
                <dd className="text-gray-400">{new Date(detail.created_at).toLocaleString()}</dd>
              </div>
            </dl>
            {detail.status === "active" && (
              <div className="flex gap-2 mt-5">
                <button
                  className="btn-primary text-sm flex-1"
                  onClick={() => { openEdit(detail); setDetail(null); }}
                >
                  Edit Token
                </button>
                <button
                  className="btn-secondary text-sm flex-1 text-red-400 hover:text-red-300"
                  onClick={() => { handleDisable(detail); setDetail(null); }}
                >
                  Disable
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
