import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000/api",
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string) =>
    api.post("/auth/register", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get("/users", { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  updateWallet: (walletAddress: string) =>
    api.patch("/users/me/wallet", { walletAddress }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/users/${id}/status`, { status }),
};

// ─── Tokens ──────────────────────────────────────────────────────────────────

export const tokensApi = {
  list: (all?: boolean) => api.get("/tokens", { params: { all: all ? "true" : undefined } }),
  getById: (id: string) => api.get(`/tokens/${id}`),
  add: (data: { name: string; symbol: string; contractAddress: string; decimals: number }) =>
    api.post("/tokens", data),
  update: (id: string, data: Partial<{ name: string; symbol: string; decimals: number }>) =>
    api.patch(`/tokens/${id}`, data),
  disable: (id: string) => api.delete(`/tokens/${id}`),
};

// ─── Transfers ───────────────────────────────────────────────────────────────

export const transfersApi = {
  sendByAddress: (tokenId: string, recipient: string, amount: string) =>
    api.post("/transfers/send-by-address", { tokenId, recipient, amount }),
  sendByUserId: (tokenId: string, userId: string, amount: string) =>
    api.post("/transfers/send-by-user", { tokenId, userId, amount }),
  bulk: (tokenId: string, file: File) => {
    const form = new FormData();
    form.append("tokenId", tokenId);
    form.append("file", file);
    return api.post("/transfers/bulk", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: (params?: { page?: number; limit?: number; status?: string; recipient?: string; tokenId?: string }) =>
    api.get("/transfers", { params }),
  getById: (id: string) => api.get(`/transfers/${id}`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
  auditLogs: (params?: { page?: number; limit?: number; action?: string; userId?: string }) =>
    api.get("/dashboard/audit-logs", { params }),
};
