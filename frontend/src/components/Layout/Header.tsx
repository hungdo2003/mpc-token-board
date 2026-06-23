import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWalletContext } from "../../context/WalletContext";
import { SUPPORTED_CHAIN_ID, NETWORK_NAMES } from "../../config/contracts";

export function Header() {
  const { user, logout } = useAuth();
  const {
    address, isConnected, isConnecting, isWrongNetwork,
    chainId, networkName,
    handleConnect, handleDisconnect,
  } = useWalletContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const targetNetwork = NETWORK_NAMES[SUPPORTED_CHAIN_ID] ?? `Chain ${SUPPORTED_CHAIN_ID}`;

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-3">
        {/* Wrong network banner */}
        {isWrongNetwork && (
          <span className="text-xs bg-red-900/50 text-red-400 border border-red-800 px-3 py-1 rounded-full">
            Switch to {targetNetwork}
          </span>
        )}

        {/* Wallet button */}
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="btn-secondary text-sm py-1.5"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* Network badge */}
            {networkName && !isWrongNetwork && (
              <span className="text-xs text-green-400 bg-green-900/30 border border-green-800 px-2 py-0.5 rounded-full">
                {networkName}
              </span>
            )}
            {/* Address + disconnect */}
            <div className="group relative">
              <span className="text-xs font-mono text-gray-300 bg-gray-800 border border-gray-700 px-3 py-1 rounded-full cursor-pointer select-none">
                {shortAddr}
              </span>
              <button
                onClick={handleDisconnect}
                className="absolute hidden group-hover:flex items-center inset-0 justify-center rounded-full bg-red-900/80 text-red-300 text-xs font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* User info */}
        <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
          <span className="text-sm text-gray-400">{user?.email}</span>
          {user?.role === "admin" && (
            <span className="text-xs bg-violet-600/30 text-violet-400 px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-400 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
