import React, { useEffect, useState } from "react";
import { dashboardApi } from "../services/api";

interface Stats {
  totalTransfers: number;
  totalTokensDistributed: string;
  successCount: number;
  failedCount: number;
  successRate: string;
  activeUsers: number;
  activeTokens: number;
}

interface Transaction {
  id: string;
  tx_hash: string;
  recipient: string;
  amount: string;
  status: string;
  token_symbol: string;
  created_at: string;
}

interface DailyActivity {
  date: string;
  count: number;
  total: string;
}

interface McpStatus {
  mode: string;
  configured: boolean;
  operatorAddress: string;
  distributorAddress: string;
  network: string;
  chainId: number;
  operatorBalanceEth: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? "border-violet-700/50" : ""}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ? "text-violet-300" : "text-gray-100"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function statusBadge(status: string) {
  if (status === "success") return <span className="badge-success">Success</span>;
  if (status === "failed")  return <span className="badge-failed">Failed</span>;
  return <span className="badge-pending">Pending</span>;
}

const MODE_LABEL: Record<string, string> = {
  "ethers-wallet": "Ethers Wallet (Local/Testnet)",
  "fireblocks":    "Fireblocks",
  "lit-protocol":  "Lit Protocol",
  "unconfigured":  "Unconfigured",
};

function ActivityChart({ data }: { data: DailyActivity[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-28 text-gray-600 text-sm">
        No activity in the last 7 days
      </div>
    );
  }

  // Fill missing days
  const filled: DailyActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    filled.push(data.find((r) => r.date.slice(0, 10) === key) ?? { date: key, count: 0, total: "0" });
  }

  const maxCount = Math.max(...filled.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 h-28 mt-2">
      {filled.map((day) => {
        const pct = Math.max((day.count / maxCount) * 100, day.count > 0 ? 4 : 0);
        const label = new Date(day.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" });
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex flex-col justify-end" style={{ height: "80px" }}>
              {day.count > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-700 text-xs text-gray-200 px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                  {day.count} tx
                </div>
              )}
              <div
                className="w-full rounded-t bg-violet-600/70 hover:bg-violet-500 transition-all"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function McpStatusPanel({ mcp }: { mcp: McpStatus }) {
  const ok = mcp.configured;
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">MCP Signing Service</h3>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          ok ? "bg-green-900/40 text-green-400" : "bg-orange-900/40 text-orange-400"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-400" : "bg-orange-400"} animate-pulse`} />
          {ok ? "Ready" : "Not Configured"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-gray-500 mb-0.5">Mode</dt>
          <dd className="font-medium text-gray-200">{MODE_LABEL[mcp.mode] ?? mcp.mode}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 mb-0.5">Network</dt>
          <dd className="font-medium text-gray-200">
            {mcp.network !== "unknown" ? `${mcp.network} (${mcp.chainId})` : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-gray-500 mb-0.5">Operator Address</dt>
          <dd className="font-mono text-xs text-gray-300 break-all">{mcp.operatorAddress || "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-gray-500 mb-0.5">Distributor Contract</dt>
          <dd className="font-mono text-xs text-gray-300 break-all">
            {mcp.distributorAddress || <span className="text-orange-400">Not set — DISTRIBUTOR_ADDRESS missing</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 mb-0.5">Operator Balance</dt>
          <dd className={`font-medium ${Number(mcp.operatorBalanceEth) < 0.01 ? "text-orange-400" : "text-gray-200"}`}>
            {mcp.network !== "unknown" ? `${Number(mcp.operatorBalanceEth).toFixed(4)} ETH` : "—"}
          </dd>
        </div>
      </dl>

      {!ok && (
        <div className="border-t border-gray-700/50 pt-3 text-xs text-gray-500 space-y-0.5">
          <p className="font-medium text-gray-400">Required env vars:</p>
          <p>MCP_PRIVATE_KEY · DISTRIBUTOR_ADDRESS · RPC_URL</p>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [recentTx, setRecentTx]   = useState<Transaction[]>([]);
  const [activity, setActivity]   = useState<DailyActivity[]>([]);
  const [mcp, setMcp]             = useState<McpStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = () => {
    setLoading(true);
    Promise.all([dashboardApi.stats(), dashboardApi.mcpStatus()])
      .then(([statsRes, mcpRes]) => {
        setStats(statsRes.data.stats);
        setRecentTx(statsRes.data.recentTransactions);
        setActivity(statsRes.data.dailyActivity);
        setMcp(mcpRes.data.mcp);
        setLastRefresh(new Date());
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Transfers" value={stats?.totalTransfers || 0} />
        <StatCard
          label="Success Rate"
          value={`${stats?.successRate || 0}%`}
          sub={`${stats?.successCount} succeeded`}
          accent
        />
        <StatCard label="Failed" value={stats?.failedCount || 0} sub="transactions" />
        <StatCard label="Active Users" value={stats?.activeUsers || 0} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Tokens Distributed"
          value={Number(stats?.totalTokensDistributed || 0).toLocaleString()}
          sub="total amount sent"
        />
        <StatCard label="Active Tokens" value={stats?.activeTokens || 0} />
        <div className="card flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${mcp?.configured ? "bg-green-400 animate-pulse" : "bg-orange-400"}`} />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">MCP Signer</p>
            <p className="text-sm font-semibold mt-0.5">{mcp?.configured ? "Ready" : "Not Configured"}</p>
            {mcp?.configured && <p className="text-xs text-gray-600 font-mono mt-0.5">{mcp.operatorAddress.slice(0, 14)}…</p>}
          </div>
        </div>
      </div>

      {/* 7-day activity chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 mb-1">7-Day Transfer Activity</h3>
        <p className="text-xs text-gray-600 mb-2">Daily transaction count (hover bar for count)</p>
        <ActivityChart data={activity} />
      </div>

      {/* MCP Status Panel */}
      {mcp && <McpStatusPanel mcp={mcp} />}

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Recent Transactions</h3>
          <a href="/transactions" className="text-xs text-violet-400 hover:text-violet-300">
            View all →
          </a>
        </div>
        {recentTx.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="th">Recipient</th>
                  <th className="th">Amount</th>
                  <th className="th">Token</th>
                  <th className="th">Status</th>
                  <th className="th">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx) => (
                  <tr key={tx.id} className="table-row">
                    <td className="td font-mono text-xs">{tx.recipient.slice(0, 10)}…</td>
                    <td className="td">{Number(tx.amount).toLocaleString()}</td>
                    <td className="td">{tx.token_symbol}</td>
                    <td className="td">{statusBadge(tx.status)}</td>
                    <td className="td text-xs text-gray-500">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
