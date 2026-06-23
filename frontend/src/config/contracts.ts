// Sepolia testnet (chain ID 11155111)
export const SEPOLIA_CHAIN_ID = 11155111;
export const SUPPORTED_CHAIN_ID = Number(
  process.env.REACT_APP_CHAIN_ID || SEPOLIA_CHAIN_ID
);

export const DISTRIBUTOR_ADDRESS =
  (process.env.REACT_APP_DISTRIBUTOR_ADDRESS as `0x${string}`) || "0x";

export const DISTRIBUTOR_ABI = [
  "function distributeToken(address tokenAddress, address recipient, uint256 amount, bytes32 requestId) external",
  "function distributeBatch(address tokenAddress, address[] calldata recipients, uint256[] calldata amounts, bytes32 requestId) external",
  "function depositTokens(address tokenAddress, uint256 amount) external",
  "function pause() external",
  "function unpause() external",
  "function emergencyWithdraw(address tokenAddress, address to, uint256 amount) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function paused() view returns (bool)",
] as const;

export const NETWORK_NAMES: Record<number, string> = {
  1:        "Ethereum",
  11155111: "Sepolia",
  31337:    "Hardhat",
};
