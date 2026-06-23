export const CONTRACTS = {
  BOARD_TOKEN: process.env.REACT_APP_BOARD_TOKEN_ADDRESS as `0x${string}`,
  CHAT_BOARD: process.env.REACT_APP_CHAT_BOARD_ADDRESS as `0x${string}`,
  MPC_AUTOMATION: process.env.REACT_APP_MPC_AUTOMATION_ADDRESS as `0x${string}`,
};

export const SUPPORTED_CHAIN_ID = Number(process.env.REACT_APP_CHAIN_ID || 31337);

export const BOARD_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

export const CHAT_BOARD_ABI = [
  "function postMessage(string content)",
  "function messageCount() view returns (uint256)",
  "function messages(uint256 id) view returns (uint256 id, address author, string content, uint256 timestamp, bool rewarded)",
  "function getMessages(uint256 from, uint256 count) view returns (tuple(uint256 id, address author, string content, uint256 timestamp, bool rewarded)[])",
  "function userMessageCount(address) view returns (uint256)",
  "function lastRewardedAt(address) view returns (uint256)",
  "function rewardPerMessage() view returns (uint256)",
  "function cooldownPeriod() view returns (uint256)",
  "event MessagePosted(uint256 indexed messageId, address indexed author, string content, uint256 timestamp)",
  "event TokenRewarded(uint256 indexed messageId, address indexed recipient, uint256 amount)",
] as const;
