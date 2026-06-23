import React from "react";

interface Props {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  tokenBalance: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletButton: React.FC<Props> = ({
  address,
  isConnected,
  isConnecting,
  isWrongNetwork,
  tokenBalance,
  onConnect,
  onDisconnect,
}) => {
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  if (!isConnected) {
    return (
      <button className="wallet-btn connect" onClick={onConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="wallet-info wrong-network">
        <span>Wrong Network</span>
        <button className="wallet-btn disconnect" onClick={onDisconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className="wallet-info">
      <span className="token-balance">{Number(tokenBalance).toFixed(2)} BOARD</span>
      <span className="wallet-address">{shortAddr}</span>
      <button className="wallet-btn disconnect" onClick={onDisconnect}>Disconnect</button>
    </div>
  );
};
