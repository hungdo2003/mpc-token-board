import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../services/api";

interface User {
  id: string;
  email: string;
  role: string;
  walletAddress: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data.user);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token, refreshUser]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin: user?.role === "admin",
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
