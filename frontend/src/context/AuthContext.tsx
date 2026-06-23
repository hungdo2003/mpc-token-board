import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, tokenStore } from "../services/api";

export interface User {
  id: string;
  email: string;
  role: string;
  wallet_address: string | null;
  status: string;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data.data.user);
    } catch {
      setUser(null);
      tokenStore.clear();
    }
  }, []);

  // On mount: if we have a stored token try to load the user; otherwise try
  // a silent refresh via cookie (covers page reload after token expiry)
  useEffect(() => {
    const stored = tokenStore.get();
    if (stored) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const { accessToken, user: loggedInUser } = data.data;
    tokenStore.set(accessToken);
    setUser(loggedInUser);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
