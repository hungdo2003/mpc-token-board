import { ethers, run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const VERIFY = process.env.VERIFY === "true" || network.name === "sepolia";

async function verify(address: string, constructorArgs: unknown[]) {
  if (!VERIFY) return;
  console.log(`\nVerifying ${address} on Etherscan...`);
  try {
    await run("verify:verify", { address, constructorArguments: constructorArgs });
    console.log("  ✓ Verified");
  } catch (err: any) {
    if (err.message?.includes("Already Verified")) {
      console.log("  ✓ Already verified");
    } else {
      console.warn("  ⚠ Verification failed:", err.message);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("=".repeat(50));
  console.log("Network    :", network.name);
  console.log("Deployer   :", deployer.address);
  console.log("Balance    :", ethers.formatEther(balance), "ETH");
  console.log("=".repeat(50));

  if (network.name === "sepolia" && balance < ethers.parseEther("0.05")) {
    throw new Error("Insufficient balance — need at least 0.05 ETH on Sepolia");
  }

  // ── 1. Deploy MockERC20 (testnet / local only) ──────────────────────────
  console.log("\n[1/4] Deploying MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Distribution Token", "DIST", 18, deployer.address);
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();
  console.log("  ✓ MockERC20 deployed to:", tokenAddress);

  // ── 2. Deploy TokenDistributor ───────────────────────────────────────────
  console.log("\n[2/4] Deploying TokenDistributor...");
  const TokenDistributor = await ethers.getContractFactory("TokenDistributor");
  const distributor = await TokenDistributor.deploy(deployer.address);
  await distributor.waitForDeployment();
  const distributorAddress = await distributor.getAddress();
  console.log("  ✓ TokenDistributor deployed to:", distributorAddress);

  // ── 3. Fund distributor with initial tokens ──────────────────────────────
  console.log("\n[3/4] Funding distributor with 100,000,000 DIST...");
  const initialFund = ethers.parseEther("100000000");
  await (await mockToken.approve(distributorAddress, initialFund)).wait();
  await (await distributor.depositTokens(tokenAddress, initialFund)).wait();
  console.log("  ✓ Distributor funded");

  // ── 4. Write deployment.env ──────────────────────────────────────────────
  console.log("\n[4/4] Writing deployment.env...");
  const envLines = [
    `# Deployed on ${network.name} — ${new Date().toISOString()}`,
    `TOKEN_ADDRESS=${tokenAddress}`,
    `DISTRIBUTOR_ADDRESS=${distributorAddress}`,
    `REACT_APP_TOKEN_ADDRESS=${tokenAddress}`,
    `REACT_APP_DISTRIBUTOR_ADDRESS=${distributorAddress}`,
    `REACT_APP_CHAIN_ID=${network.config.chainId ?? 31337}`,
  ];
  const outPath = path.join(__dirname, "../deployment.env");
  fs.writeFileSync(outPath, envLines.join("\n") + "\n");
  console.log("  ✓ Addresses saved to contracts/deployment.env");

  // ── Etherscan verification (Sepolia only) ────────────────────────────────
  if (VERIFY) {
    // Wait a few blocks for Etherscan to index the contracts
    console.log("\nWaiting 30 s for Etherscan to index...");
    await new Promise((r) => setTimeout(r, 30_000));
    await verify(tokenAddress, ["Distribution Token", "DIST", 18, deployer.address]);
    await verify(distributorAddress, [deployer.address]);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log("Deployment complete");
  console.log("  TOKEN_ADDRESS       =", tokenAddress);
  console.log("  DISTRIBUTOR_ADDRESS =", distributorAddress);
  if (network.name === "sepolia") {
    console.log("\nEtherscan links:");
    console.log(`  Token      : https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log(`  Distributor: https://sepolia.etherscan.io/address/${distributorAddress}`);
  }
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
