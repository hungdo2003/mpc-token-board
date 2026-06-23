import React, { useEffect, useState, useCallback } from "react";
import { dashboardApi } from "../services/api";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await dashboardApi.auditLogs({ page, limit, action: actionFilter || undefined });
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  const actionColor = (action: string) => {
    if (action.includes("TRANSFER") || action.includes("BULK")) return "text-violet-300 bg-violet-900/40";
    if (action.includes("LOGIN")) return "text-blue-300 bg-blue-900/40";
    if (action.includes("DISABLE") || action.includes("DELETE")) return "text-red-300 bg-red-900/40";
    if (action.includes("ADD") || action.includes("REGISTER")) return "text-green-300 bg-green-900/40";
    return "text-gray-300 bg-gray-800";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Audit Logs</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="card">
        <div className="max-w-xs">
          <label className="label">Filter by action</label>
          <input className="input" placeholder="e.g. TRANSFER, LOGIN..." value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="th">Time</th>
                <th className="th">User</th>
                <th className="th">Action</th>
                <th className="th">Description</th>
                <th className="th">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="td text-center py-12 text-gray-500">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="td text-center py-12 text-gray-500">No audit logs found</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="td text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="td text-xs">{log.user_email || "—"}</td>
                  <td className="td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="td text-xs text-gray-400 max-w-xs truncate">{log.description}</td>
                  <td className="td text-xs font-mono text-gray-500">{log.ip_address || "—"}</td>
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
    </div>
  );
}
