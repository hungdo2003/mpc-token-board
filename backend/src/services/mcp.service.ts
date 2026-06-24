import { ethers } from "ethers";
import { config } from "../config";
import { logger } from "../utils/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface McpStatus {
  mode: "ethers-wallet" | "fireblocks" | "lit-protocol" | "unconfigured";
  configured: boolean;
  operatorAddress: string;
  distributorAddress: string;
  network: string;
  chainId: number;
  operatorBalanceEth: string;
}

export class McpError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "McpError";
  }
}

// ── Signer interface ──────────────────────────────────────────────────────────

export interface IMcpSigner {
  getAddress(): string;
  getMode(): McpStatus["mode"];
  isConfigured(): boolean;
  distributeToken(
    tokenAddress: string,
    recipient: string,
    amount: bigint,
    requestId: string
  ): Promise<string>;
  distributeBatch(
    tokenAddress: string,
    recipients: string[],
    amounts: bigint[],
    requestId: string
  ): Promise<string>;
  getTokenBalance(tokenAddress: string): Promise<string>;
  getNetworkInfo(): Promise<{ name: string; chainId: number }>;
  getOperatorBalance(): Promise<string>;
}

// ── Ethers wallet signer (local / testnet) ────────────────────────────────────
// Swap this class with a Fireblocks / Lit Protocol / Coinbase CDP adapter
// without changing any call sites — they all go through IMcpSigner.

const DISTRIBUTOR_ABI = [
  "function distributeToken(address tokenAddress, address recipient, uint256 amount, bytes32 requestId) external",
  "function distributeBatch(address tokenAddress, address[] calldata recipients, uint256[] calldata amounts, bytes32 requestId) external",
];

class EthersWalletSigner implements IMcpSigner {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | ethers.HDNodeWallet;
  private distributor: ethers.Contract;
  private readonly configured: boolean;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    if (config.mcpPrivateKey) {
      this.wallet = new ethers.Wallet(config.mcpPrivateKey, this.provider);
      this.configured = true;
    } else {
      // Random ephemeral key — transfers will fail but the service starts cleanly.
      this.wallet = ethers.Wallet.createRandom().connect(this.provider);
      this.configured = false;
      logger.warn("[MCP] MCP_PRIVATE_KEY not set — using random wallet. Transfers will fail.");
    }

    this.distributor = new ethers.Contract(
      config.distributorAddress || ethers.ZeroAddress,
      DISTRIBUTOR_ABI,
      this.wallet
    );
  }

  getAddress() { return this.wallet.address; }
  getMode(): McpStatus["mode"] { return "ethers-wallet"; }
  isConfigured() { return this.configured && !!config.distributorAddress; }

  async distributeToken(
    tokenAddress: string,
    recipient: string,
    amount: bigint,
    requestId: string
  ): Promise<string> {
    this.assertReady();
    const reqIdBytes = ethers.encodeBytes32String(requestId.slice(0, 31));
    try {
      const tx      = await this.distributor.distributeToken(tokenAddress, recipient, amount, reqIdBytes);
      const receipt = await tx.wait();
      logger.info("[MCP] distributeToken", { txHash: receipt.hash, recipient, amount: amount.toString() });
      return receipt.hash as string;
    } catch (err) {
      throw new McpError("Token distribution failed", err);
    }
  }

  async distributeBatch(
    tokenAddress: string,
    recipients: string[],
    amounts: bigint[],
    requestId: string
  ): Promise<string> {
    this.assertReady();
    const reqIdBytes = ethers.encodeBytes32String(requestId.slice(0, 31));
    try {
      const tx      = await this.distributor.distributeBatch(tokenAddress, recipients, amounts, reqIdBytes);
      const receipt = await tx.wait();
      logger.info("[MCP] distributeBatch", { txHash: receipt.hash, count: recipients.length });
      return receipt.hash as string;
    } catch (err) {
      throw new McpError("Batch distribution failed", err);
    }
  }

  async getTokenBalance(tokenAddress: string): Promise<string> {
    const erc20 = new ethers.Contract(
      tokenAddress,
      ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
      this.provider
    );
    const [balance, decimals] = await Promise.all([
      erc20.balanceOf(config.distributorAddress),
      erc20.decimals(),
    ]);
    return ethers.formatUnits(balance, decimals);
  }

  async getNetworkInfo(): Promise<{ name: string; chainId: number }> {
    const network = await this.provider.getNetwork();
    return { name: network.name, chainId: Number(network.chainId) };
  }

  async getOperatorBalance(): Promise<string> {
    const wei = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(wei);
  }

  private assertReady() {
    if (!config.distributorAddress) throw new McpError("DISTRIBUTOR_ADDRESS not configured");
    if (!this.configured)           throw new McpError("MCP_PRIVATE_KEY not configured");
  }
}

// ── McpService facade ─────────────────────────────────────────────────────────
// Add new providers here: instantiate a different IMcpSigner based on env vars.
// e.g. if (config.fireblocksApiKey) this.signer = new FireblocksSigner();

export class McpService {
  private signer: IMcpSigner;

  constructor() {
    // Future: select provider from config
    // if (config.fireblocksApiKey) { this.signer = new FireblocksSigner(); }
    // else if (config.litRelayerKey) { this.signer = new LitProtocolSigner(); }
    // else { this.signer = new EthersWalletSigner(); }
    this.signer = new EthersWalletSigner();
  }

  // ── Forwarded to signer ────────────────────────────────────────────────────

  getOperatorAddress()    { return this.signer.getAddress(); }
  isConfigured()          { return this.signer.isConfigured(); }

  async distributeToken(tokenAddress: string, recipient: string, amount: bigint, requestId: string) {
    return this.signer.distributeToken(tokenAddress, recipient, amount, requestId);
  }

  async distributeBatch(tokenAddress: string, recipients: string[], amounts: bigint[], requestId: string) {
    return this.signer.distributeBatch(tokenAddress, recipients, amounts, requestId);
  }

  async getTokenBalance(tokenAddress: string) {
    return this.signer.getTokenBalance(tokenAddress);
  }

  // ── Status / health ────────────────────────────────────────────────────────

  async getStatus(): Promise<McpStatus> {
    let network = "unknown";
    let chainId = 0;
    let operatorBalanceEth = "0";

    try {
      const info = await this.signer.getNetworkInfo();
      network = info.name;
      chainId = info.chainId;
      operatorBalanceEth = await this.signer.getOperatorBalance();
    } catch {
      // Provider unreachable — return partial status
    }

    return {
      mode: this.signer.getMode(),
      configured: this.signer.isConfigured(),
      operatorAddress: this.signer.getAddress(),
      distributorAddress: config.distributorAddress || "",
      network,
      chainId,
      operatorBalanceEth,
    };
  }
}

export const mcpService = new McpService();
