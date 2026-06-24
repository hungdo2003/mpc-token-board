import { ethers } from "ethers";
import { config } from "../config";

/**
 * MCP Service — pluggable signing abstraction.
 *
 * Current implementation: Mock MCP using a single ethers.Wallet (development only).
 * Replace signTransaction() internals with your chosen MCP provider:
 *   - Fireblocks:  https://developers.fireblocks.com/
 *   - Lit Protocol: https://developer.litprotocol.com/
 *   - Coinbase CDP: https://docs.cdp.coinbase.com/
 *   - Web3Auth MPC: https://web3auth.io/docs/
 */

const DISTRIBUTOR_ABI = [
  "function distributeToken(address tokenAddress, address recipient, uint256 amount, bytes32 requestId) external",
  "function distributeBatch(address tokenAddress, address[] calldata recipients, uint256[] calldata amounts, bytes32 requestId) external",
];

export class McpService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | ethers.HDNodeWallet;
  private distributor: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    if (!config.mcpPrivateKey) {
      // Warn but don't crash on startup — will fail at transfer time
      console.warn("[MCP] Warning: MCP_PRIVATE_KEY not set. Transfers will fail.");
      this.wallet = ethers.Wallet.createRandom().connect(this.provider);
    } else {
      this.wallet = new ethers.Wallet(config.mcpPrivateKey, this.provider);
    }

    this.distributor = new ethers.Contract(
      config.distributorAddress,
      DISTRIBUTOR_ABI,
      this.wallet
    );
  }

  getOperatorAddress(): string {
    return this.wallet.address;
  }

  /**
   * Sign and broadcast a single token transfer via the TokenDistributor contract.
   */
  async distributeToken(
    tokenAddress: string,
    recipient: string,
    amount: bigint,
    requestId: string
  ): Promise<string> {
    if (!config.distributorAddress) throw new Error("DISTRIBUTOR_ADDRESS not configured");

    const reqIdBytes = ethers.encodeBytes32String(requestId.slice(0, 31));
    const tx = await this.distributor.distributeToken(tokenAddress, recipient, amount, reqIdBytes);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  /**
   * Sign and broadcast a batch token transfer via the TokenDistributor contract.
   */
  async distributeBatch(
    tokenAddress: string,
    recipients: string[],
    amounts: bigint[],
    requestId: string
  ): Promise<string> {
    if (!config.distributorAddress) throw new Error("DISTRIBUTOR_ADDRESS not configured");

    const reqIdBytes = ethers.encodeBytes32String(requestId.slice(0, 31));
    const tx = await this.distributor.distributeBatch(tokenAddress, recipients, amounts, reqIdBytes);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async getTokenBalance(tokenAddress: string): Promise<string> {
    const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
    const token = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
    const [balance, decimals] = await Promise.all([
      token.balanceOf(config.distributorAddress),
      token.decimals(),
    ]);
    return ethers.formatUnits(balance, decimals);
  }
}

export const mcpService = new McpService();
