import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../../services/api";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function Header() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask.");
      return;
    }
    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      await usersApi.updateWallet(address);
      await refreshUser();
    } catch (err: any) {
      alert(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  const shortAddr = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
    : null;

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {!shortAddr ? (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="btn-secondary text-sm"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <span className="text-xs font-mono text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            {shortAddr}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{user?.email}</span>
          {user?.role === "admin" && (
            <span className="text-xs bg-violet-600/30 text-violet-400 px-2 py-0.5 rounded-full">Admin</span>
          )}
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-400 transition-colors">
          Logout
        </button>
      </div>
    </header>
  );
}
