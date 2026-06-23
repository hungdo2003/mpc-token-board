import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { SUPPORTED_CHAIN_ID } from "../config/contracts";

interface WalletState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    provider: null,
    signer: null,
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState((s) => ({ ...s, error: "MetaMask not found. Please install it." }));
      return;
    }
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setState({ provider, signer, address, chainId, isConnected: true, isConnecting: false, error: null });
    } catch (err: any) {
      setState((s) => ({ ...s, isConnecting: false, error: err.message }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ provider: null, signer: null, address: null, chainId: null, isConnected: false, isConnecting: false, error: null });
  }, []);

  const isWrongNetwork = state.isConnected && state.chainId !== SUPPORTED_CHAIN_ID;

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = () => connect();
    const handleChainChanged = () => connect();
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [connect]);

  return { ...state, connect, disconnect, isWrongNetwork };
}
