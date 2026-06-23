import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy MockERC20 (only for testnet / local dev)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Distribution Token", "DIST", 18, deployer.address);
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();
  console.log("MockERC20 deployed to:", tokenAddress);

  // 2. Deploy TokenDistributor
  const TokenDistributor = await ethers.getContractFactory("TokenDistributor");
  const distributor = await TokenDistributor.deploy(deployer.address);
  await distributor.waitForDeployment();
  const distributorAddress = await distributor.getAddress();
  console.log("TokenDistributor deployed to:", distributorAddress);

  // 3. Fund distributor with initial tokens (100M)
  const initialFund = ethers.parseEther("100000000");
  await mockToken.approve(distributorAddress, initialFund);
  await distributor.depositTokens(tokenAddress, initialFund);
  console.log("Funded distributor with 100,000,000 DIST tokens");

  // 4. Write addresses to .env file for frontend and backend
  const envContent = [
    `TOKEN_ADDRESS=${tokenAddress}`,
    `DISTRIBUTOR_ADDRESS=${distributorAddress}`,
    `REACT_APP_TOKEN_ADDRESS=${tokenAddress}`,
    `REACT_APP_DISTRIBUTOR_ADDRESS=${distributorAddress}`,
  ].join("\n");

  const outPath = path.join(__dirname, "../deployment.env");
  fs.writeFileSync(outPath, envContent);
  console.log("\nAddresses saved to contracts/deployment.env");

  console.log("\nDeployment summary:");
  console.log("  TOKEN_ADDRESS =", tokenAddress);
  console.log("  DISTRIBUTOR_ADDRESS =", distributorAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
