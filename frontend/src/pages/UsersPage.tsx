import React, { useEffect, useState, useCallback } from "react";
import { usersApi } from "../services/api";

interface User {
  id: string;
  email: string;
  role: string;
  wallet_address: string | null;
  status: string;
  created_at: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.list({ page, limit, search: search || undefined });
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "disabled" : "active";
    setActionLoading(user.id);
    try {
      await usersApi.updateStatus(user.id, newStatus);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Users</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="card">
        <input
          className="input max-w-xs"
          placeholder="Search by email or wallet..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Wallet</th>
                <th className="th">Status</th>
                <th className="th">Joined</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-12 text-gray-500">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-12 text-gray-500">No users found</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="td">{user.email}</td>
                  <td className="td">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === "admin" ? "bg-violet-900 text-violet-300" : "bg-gray-800 text-gray-400"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="td font-mono text-xs">
                    {user.wallet_address
                      ? `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-6)}`
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="td">
                    {user.status === "active"
                      ? <span className="badge-success">Active</span>
                      : <span className="badge-failed">Disabled</span>}
                  </td>
                  <td className="td text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="td">
                    <button
                      onClick={() => toggleStatus(user)}
                      disabled={actionLoading === user.id}
                      className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                        user.status === "active"
                          ? "text-red-400 hover:bg-red-900/30"
                          : "text-green-400 hover:bg-green-900/30"
                      }`}
                    >
                      {actionLoading === user.id ? "..." : user.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span className="text-sm text-gray-400 self-center">Page {page} of {totalPages}</span>
          <button className="btn-secondary text-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}
