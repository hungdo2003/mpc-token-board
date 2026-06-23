import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { SUPPORTED_CHAIN_ID } from "../config/contracts";

declare global {
  interface Window { ethereum?: any; }
}

export interface WalletState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const INITIAL: WalletState = {
  provider: null, signer: null, address: null, chainId: null,
  isConnected: false, isConnecting: false, error: null,
};

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL);

  const connect = useCallback(async (silent = false) => {
    if (!window.ethereum) {
      if (!silent) {
        setState((s) => ({ ...s, error: "MetaMask not found. Please install it." }));
      }
      return;
    }
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      // Silent check: eth_accounts doesn't trigger the MetaMask popup
      const method = silent ? "eth_accounts" : "eth_requestAccounts";
      const accounts: string[] = await provider.send(method, []);
      if (silent && accounts.length === 0) {
        setState((s) => ({ ...s, isConnecting: false }));
        return;
      }
      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      setState({ provider, signer, address, chainId, isConnected: true, isConnecting: false, error: null });
    } catch (err: any) {
      setState((s) => ({ ...s, isConnecting: false, error: err.message }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState(INITIAL);
  }, []);

  // Auto-reconnect silently on mount (no popup)
  useEffect(() => {
    connect(true);
  }, [connect]);

  // Listen for MetaMask account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) { setState(INITIAL); return; }
      connect(true);
    };
    const onChainChanged = () => connect(true);
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [connect]);

  const isWrongNetwork = state.isConnected && state.chainId !== SUPPORTED_CHAIN_ID;

  return { ...state, connect, disconnect, isWrongNetwork };
}
