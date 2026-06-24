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

const ACTION_GROUPS = [
  { label: "All actions", value: "" },
  { label: "Transfers", value: "TRANSFER" },
  { label: "Bulk transfers", value: "BULK_TRANSFER" },
  { label: "Login / Logout", value: "LOGIN" },
  { label: "Register", value: "REGISTER" },
  { label: "Token changes", value: "TOKEN" },
  { label: "User status", value: "USER_STATUS" },
  { label: "Wallet events", value: "WALLET" },
  { label: "Password change", value: "PASSWORD" },
];

const LIMIT = 20;

function actionChip(action: string) {
  const classes =
    action.includes("TRANSFER") || action.includes("BULK")
      ? "text-violet-300 bg-violet-900/40"
      : action.includes("LOGIN") || action.includes("LOGOUT")
      ? "text-blue-300 bg-blue-900/40"
      : action.includes("DISABLE") || action.includes("DELETE")
      ? "text-red-300 bg-red-900/40"
      : action.includes("ADD") || action.includes("REGISTER")
      ? "text-green-300 bg-green-900/40"
      : action.includes("WALLET")
      ? "text-cyan-300 bg-cyan-900/40"
      : "text-gray-300 bg-gray-800";

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {action}
    </span>
  );
}

function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button className="btn-secondary text-sm px-3" onClick={() => onChange(1)} disabled={page === 1}>«</button>
      <button className="btn-secondary text-sm px-3" onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
      <span className="text-sm text-gray-400 px-2">Page {page} of {totalPages}</span>
      <button className="btn-secondary text-sm px-3" onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
      <button className="btn-secondary text-sm px-3" onClick={() => onChange(totalPages)} disabled={page === totalPages}>»</button>
    </div>
  );
}

export function AuditLogsPage() {
  const [logs, setLogs]             = useState<AuditLog[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await dashboardApi.auditLogs({
        page, limit: LIMIT,
        action: actionFilter || undefined,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  const changeFilter = (value: string) => {
    setActionFilter(value);
    setPage(1);
    setExpanded(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Audit Logs</h2>
        <span className="text-sm text-gray-500">{total.toLocaleString()} total</span>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 mr-1">Filter:</span>
          {ACTION_GROUPS.map((g) => (
            <button
              key={g.value}
              onClick={() => changeFilter(g.value)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                actionFilter === g.value
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
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
                <tr>
                  <td colSpan={5} className="td text-center py-12">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td text-center py-12 text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr
                    className="table-row cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="td text-xs">{log.user_email || "—"}</td>
                    <td className="td">{actionChip(log.action)}</td>
                    <td className="td text-xs text-gray-400 max-w-xs truncate">{log.description}</td>
                    <td className="td text-xs font-mono text-gray-500">{log.ip_address || "—"}</td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="bg-gray-800/30">
                      <td colSpan={5} className="px-4 py-3 text-xs text-gray-300 border-b border-gray-700/50">
                        <span className="text-gray-500">Full description: </span>
                        {log.description}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
