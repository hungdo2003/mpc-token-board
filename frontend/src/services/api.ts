import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

// ─── Token management ─────────────────────────────────────────────────────────

export const tokenStore = {
  get: ()           => localStorage.getItem("accessToken"),
  set: (t: string)  => localStorage.setItem("accessToken", t),
  clear: ()         => localStorage.removeItem("accessToken"),
};

// ─── Request: attach access token ─────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response: auto-refresh on 401 ────────────────────────────────────────────

let isRefreshing = false;
let waitQueue: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];

function processQueue(err: any, token: string | null) {
  waitQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  waitQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken: string = data.data.accessToken;
      tokenStore.set(newToken);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      tokenStore.clear();
      window.location.href = "/login";
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string) =>
    api.post("/auth/register", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch("/auth/change-password", { currentPassword, newPassword }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get("/users", { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  updateWallet: (walletAddress: string) =>
    api.patch("/users/me/wallet", { walletAddress }),
  removeWallet: () => api.delete("/users/me/wallet"),
  updateStatus: (id: string, status: string) =>
    api.patch(`/users/${id}/status`, { status }),
};

// ─── Tokens ───────────────────────────────────────────────────────────────────

export const tokensApi = {
  list: (all?: boolean) =>
    api.get("/tokens", { params: all ? { all: "true" } : undefined }),
  getById: (id: string) => api.get(`/tokens/${id}`),
  add: (data: { name: string; symbol: string; contractAddress: string; decimals: number }) =>
    api.post("/tokens", data),
  update: (id: string, data: Partial<{ name: string; symbol: string; decimals: number }>) =>
    api.patch(`/tokens/${id}`, data),
  disable: (id: string) => api.delete(`/tokens/${id}`),
};

// ─── Transfers ────────────────────────────────────────────────────────────────

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
  list: (params?: {
    page?: number; limit?: number;
    status?: string; recipient?: string; tokenId?: string;
  }) => api.get("/transfers", { params }),
  getById: (id: string) => api.get(`/transfers/${id}`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
  mcpStatus: () => api.get("/dashboard/mcp-status"),
  auditLogs: (params?: {
    page?: number; limit?: number; action?: string; userId?: string;
  }) => api.get("/dashboard/audit-logs", { params }),
};
