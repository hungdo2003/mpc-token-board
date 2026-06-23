import React, { createContext, useContext, useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useWallet, WalletState } from "../hooks/useWallet";
import { usersApi } from "../services/api";
import { useAuth } from "./AuthContext";
import { NETWORK_NAMES, SUPPORTED_CHAIN_ID } from "../config/contracts";

interface WalletContextValue extends WalletState {
  isWrongNetwork: boolean;
  networkName: string | null;
  connect: (silent?: boolean) => Promise<void>;
  disconnect: () => void;
  handleConnect: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const { user, refreshUser } = useAuth();

  const prevAddress = useRef<string | null>(null);

  // Sync MetaMask address → backend whenever it changes
  useEffect(() => {
    const current = wallet.address;
    if (current === prevAddress.current) return;
    prevAddress.current = current;

    if (!user) return; // not logged in

    if (current) {
      // New address connected — save to backend
      usersApi.updateWallet(current).then(() => refreshUser()).catch(() => {});
    } else if (user.wallet_address) {
      // MetaMask disconnected — clear from backend
      usersApi.removeWallet().then(() => refreshUser()).catch(() => {});
    }
  }, [wallet.address, user, refreshUser]);

  // Show toast when wrong network is detected
  useEffect(() => {
    if (wallet.isWrongNetwork) {
      const target = NETWORK_NAMES[SUPPORTED_CHAIN_ID] ?? `Chain ${SUPPORTED_CHAIN_ID}`;
      toast.error(`Wrong network — please switch to ${target}`, { id: "wrong-network" });
    }
  }, [wallet.isWrongNetwork]);

  // User-triggered connect (shows MetaMask popup)
  const handleConnect = useCallback(async () => {
    await wallet.connect(false);
  }, [wallet]);

  // User-triggered disconnect (clears local state + DB)
  const handleDisconnect = useCallback(async () => {
    wallet.disconnect();
    try {
      await usersApi.removeWallet();
      await refreshUser();
      toast.success("Wallet disconnected");
    } catch {}
  }, [wallet, refreshUser]);

  const networkName = wallet.chainId ? (NETWORK_NAMES[wallet.chainId] ?? `Chain ${wallet.chainId}`) : null;

  return (
    <WalletContext.Provider
      value={{
        ...wallet,
        networkName,
        handleConnect,
        handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}
