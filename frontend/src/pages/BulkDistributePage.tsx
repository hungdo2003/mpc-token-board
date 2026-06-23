import React, { useEffect, useState, useRef } from "react";
import { transfersApi, tokensApi } from "../services/api";

interface Token { id: string; name: string; symbol: string; }

export function BulkDistributePage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenId, setTokenId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txHash: string; count: number } | null>(null);
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    tokensApi.list().then(({ data }) => setTokens(data.tokens));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { data } = await transfersApi.bulk(tokenId, file);
      setResult(data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      const errData = err.response?.data;
      setError({ message: errData?.error || "Bulk transfer failed", details: errData?.details });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-xl font-bold">Bulk Distribution</h2>

      <div className="card bg-gray-800/50 border-dashed">
        <p className="text-sm font-medium text-gray-300 mb-2">CSV Format</p>
        <pre className="text-xs text-gray-400 font-mono bg-gray-900 rounded p-3">
          {`userId,amount\nU001,100\nU002,50\n\n# or use walletAddress:\nwalletAddress,amount\n0xAbc...,200`}
        </pre>
        <p className="text-xs text-gray-500 mt-2">Max 1,000 recipients per batch</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Token</label>
            <select className="input" value={tokenId} onChange={(e) => setTokenId(e.target.value)} required>
              <option value="">Select token...</option>
              {tokens.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 px-4 py-3 rounded-lg">
              <p className="text-red-300 text-sm font-medium">{error.message}</p>
              {error.details && error.details.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {error.details.map((d, i) => (
                    <li key={i} className="text-xs text-red-400">• {d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result && (
            <div className="bg-green-900/30 border border-green-800 px-4 py-3 rounded-lg">
              <p className="text-green-300 font-medium text-sm">Batch Transfer Complete!</p>
              <p className="text-gray-400 text-xs mt-1">{result.count} recipients processed</p>
              <p className="text-gray-400 font-mono text-xs mt-1 break-all">TxHash: {result.txHash}</p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading || !tokenId || !file}>
            {loading ? `Processing batch via MPC...` : "Execute Bulk Transfer"}
          </button>
        </form>
      </div>
    </div>
  );
}
