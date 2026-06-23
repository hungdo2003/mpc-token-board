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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function statusBadge(status: string) {
  if (status === "success") return <span className="badge-success">Success</span>;
  if (status === "failed") return <span className="badge-failed">Failed</span>;
  return <span className="badge-pending">Pending</span>;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats().then(({ data }) => {
      setStats(data.stats);
      setRecentTx(data.recentTransactions);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Transfers" value={stats?.totalTransfers || 0} />
        <StatCard label="Success Rate" value={`${stats?.successRate || 0}%`} sub={`${stats?.successCount} succeeded`} />
        <StatCard label="Failed" value={stats?.failedCount || 0} />
        <StatCard label="Active Users" value={stats?.activeUsers || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatCard label="Tokens Distributed" value={Number(stats?.totalTokensDistributed || 0).toLocaleString()} />
        <StatCard label="Active Tokens" value={stats?.activeTokens || 0} />
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Transactions</h3>
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
                    <td className="td font-mono text-xs">{tx.recipient.slice(0, 10)}...</td>
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
