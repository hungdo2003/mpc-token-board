import React, { useEffect, useState } from "react";
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

export function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", symbol: "", contractAddress: "", decimals: "18" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await tokensApi.add({ ...form, decimals: Number(form.decimals) });
      setForm({ name: "", symbol: "", contractAddress: "", decimals: "18" });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add token");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (id: string) => {
    if (!window.confirm("Disable this token?")) return;
    await tokensApi.disable(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tokens</h2>
        <button className="btn-primary text-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add Token"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Add New Token</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Token Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Symbol</label>
              <input className="input" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <label className="label">Contract Address</label>
              <input className="input font-mono text-sm" placeholder="0x..." value={form.contractAddress} onChange={(e) => setForm({ ...form, contractAddress: e.target.value })} required />
            </div>
            <div>
              <label className="label">Decimals</label>
              <input type="number" className="input" value={form.decimals} onChange={(e) => setForm({ ...form, decimals: e.target.value })} min={0} max={18} required />
            </div>

            {error && <p className="col-span-2 text-sm text-red-400">{error}</p>}

            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? "Adding..." : "Add Token"}</button>
            </div>
          </form>
        </div>
      )}

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
                <tr key={token.id} className="table-row">
                  <td className="td font-medium">{token.name}</td>
                  <td className="td">{token.symbol}</td>
                  <td className="td font-mono text-xs">{token.contract_address.slice(0, 12)}...{token.contract_address.slice(-8)}</td>
                  <td className="td">{token.decimals}</td>
                  <td className="td">
                    {token.status === "active" ? <span className="badge-success">Active</span> : <span className="badge-failed">Disabled</span>}
                  </td>
                  <td className="td">
                    {token.status === "active" && (
                      <button onClick={() => handleDisable(token.id)} className="text-xs text-red-400 hover:bg-red-900/30 px-3 py-1 rounded-lg">Disable</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
