import { expect } from "chai";
import { ethers } from "hardhat";
import { TokenDistributor, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TokenDistributor", () => {
  let distributor: TokenDistributor;
  let token: MockERC20;
  let admin: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let recipient1: HardhatEthersSigner;
  let recipient2: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  const ADMIN_ROLE = ethers.ZeroHash;
  const DEPOSIT_AMOUNT = ethers.parseEther("10000");
  const requestId = ethers.encodeBytes32String("req-001");

  beforeEach(async () => {
    [admin, operator, recipient1, recipient2, stranger] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = await MockERC20Factory.deploy("Test Token", "TEST", 18, admin.address);

    const DistributorFactory = await ethers.getContractFactory("TokenDistributor");
    distributor = await DistributorFactory.deploy(admin.address);

    // Grant operator role
    await distributor.grantRole(OPERATOR_ROLE, operator.address);

    // Deposit tokens into distributor
    await token.approve(await distributor.getAddress(), DEPOSIT_AMOUNT);
    await distributor.depositTokens(await token.getAddress(), DEPOSIT_AMOUNT);
  });

  // ─── Deployment ──────────────────────────────────────────────────────────

  describe("Deployment", () => {
    it("grants admin DEFAULT_ADMIN_ROLE", async () => {
      expect(await distributor.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("grants admin OPERATOR_ROLE on deploy", async () => {
      expect(await distributor.hasRole(OPERATOR_ROLE, admin.address)).to.be.true;
    });

    it("holds deposited tokens", async () => {
      const bal = await distributor.getTokenBalance(await token.getAddress());
      expect(bal).to.equal(DEPOSIT_AMOUNT);
    });
  });

  // ─── distributeToken ─────────────────────────────────────────────────────

  describe("distributeToken", () => {
    it("transfers tokens to recipient", async () => {
      const amount = ethers.parseEther("100");
      await distributor
        .connect(operator)
        .distributeToken(await token.getAddress(), recipient1.address, amount, requestId);

      expect(await token.balanceOf(recipient1.address)).to.equal(amount);
    });

    it("emits TransferExecuted event", async () => {
      const amount = ethers.parseEther("50");
      await expect(
        distributor
          .connect(operator)
          .distributeToken(await token.getAddress(), recipient1.address, amount, requestId)
      )
        .to.emit(distributor, "TransferExecuted")
        .withArgs(requestId, await token.getAddress(), recipient1.address, amount);
    });

    it("reverts if caller is not operator", async () => {
      await expect(
        distributor
          .connect(stranger)
          .distributeToken(await token.getAddress(), recipient1.address, 100n, requestId)
      ).to.be.reverted;
    });

    it("reverts on zero address token", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeToken(ethers.ZeroAddress, recipient1.address, 100n, requestId)
      ).to.be.revertedWith("Invalid token address");
    });

    it("reverts on zero address recipient", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeToken(await token.getAddress(), ethers.ZeroAddress, 100n, requestId)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("reverts on zero amount", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeToken(await token.getAddress(), recipient1.address, 0n, requestId)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("reverts when paused", async () => {
      await distributor.pause();
      await expect(
        distributor
          .connect(operator)
          .distributeToken(await token.getAddress(), recipient1.address, 100n, requestId)
      ).to.be.reverted;
    });
  });

  // ─── distributeBatch ─────────────────────────────────────────────────────

  describe("distributeBatch", () => {
    it("transfers tokens to multiple recipients", async () => {
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      await distributor
        .connect(operator)
        .distributeBatch(
          await token.getAddress(),
          [recipient1.address, recipient2.address],
          amounts,
          requestId
        );

      expect(await token.balanceOf(recipient1.address)).to.equal(amounts[0]);
      expect(await token.balanceOf(recipient2.address)).to.equal(amounts[1]);
    });

    it("emits BatchTransferExecuted event", async () => {
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const totalAmount = amounts[0] + amounts[1];
      await expect(
        distributor
          .connect(operator)
          .distributeBatch(
            await token.getAddress(),
            [recipient1.address, recipient2.address],
            amounts,
            requestId
          )
      )
        .to.emit(distributor, "BatchTransferExecuted")
        .withArgs(requestId, await token.getAddress(), 2, totalAmount);
    });

    it("reverts on length mismatch", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeBatch(
            await token.getAddress(),
            [recipient1.address],
            [100n, 200n],
            requestId
          )
      ).to.be.revertedWith("Length mismatch");
    });

    it("reverts on empty recipients", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeBatch(await token.getAddress(), [], [], requestId)
      ).to.be.revertedWith("Empty recipients");
    });

    it("reverts if caller is not operator", async () => {
      await expect(
        distributor
          .connect(stranger)
          .distributeBatch(
            await token.getAddress(),
            [recipient1.address],
            [100n],
            requestId
          )
      ).to.be.reverted;
    });
  });

  // ─── pause / unpause ─────────────────────────────────────────────────────

  describe("pause / unpause", () => {
    it("admin can pause and unpause", async () => {
      await distributor.pause();
      expect(await distributor.paused()).to.be.true;
      await distributor.unpause();
      expect(await distributor.paused()).to.be.false;
    });

    it("non-admin cannot pause", async () => {
      await expect(distributor.connect(stranger).pause()).to.be.reverted;
    });
  });

  // ─── emergencyWithdraw ───────────────────────────────────────────────────

  describe("emergencyWithdraw", () => {
    it("admin can withdraw tokens", async () => {
      const amount = ethers.parseEther("500");
      const before = await token.balanceOf(admin.address);
      await distributor.emergencyWithdraw(await token.getAddress(), admin.address, amount);
      expect(await token.balanceOf(admin.address)).to.equal(before + amount);
    });

    it("emits EmergencyWithdrawn event", async () => {
      const amount = ethers.parseEther("100");
      await expect(
        distributor.emergencyWithdraw(await token.getAddress(), admin.address, amount)
      )
        .to.emit(distributor, "EmergencyWithdrawn")
        .withArgs(await token.getAddress(), admin.address, amount);
    });

    it("non-admin cannot emergency withdraw", async () => {
      await expect(
        distributor
          .connect(stranger)
          .emergencyWithdraw(await token.getAddress(), stranger.address, 100n)
      ).to.be.reverted;
    });
  });

  // ─── depositTokens ───────────────────────────────────────────────────────

  describe("depositTokens", () => {
    it("emits TokensDeposited event", async () => {
      const amount = ethers.parseEther("500");
      await token.approve(await distributor.getAddress(), amount);
      await expect(distributor.depositTokens(await token.getAddress(), amount))
        .to.emit(distributor, "TokensDeposited")
        .withArgs(await token.getAddress(), admin.address, amount);
    });

    it("increases contract token balance", async () => {
      const before = await distributor.getTokenBalance(await token.getAddress());
      const amount = ethers.parseEther("200");
      await token.approve(await distributor.getAddress(), amount);
      await distributor.depositTokens(await token.getAddress(), amount);
      expect(await distributor.getTokenBalance(await token.getAddress())).to.equal(before + amount);
    });

    it("reverts on zero address token", async () => {
      await expect(
        distributor.depositTokens(ethers.ZeroAddress, 100n)
      ).to.be.revertedWith("Invalid token address");
    });

    it("reverts on zero amount", async () => {
      await expect(
        distributor.depositTokens(await token.getAddress(), 0n)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  // ─── distributeBatch — extra guards ──────────────────────────────────────

  describe("distributeBatch — extra guards", () => {
    it("reverts on zero address in recipients array", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeBatch(
            await token.getAddress(),
            [recipient1.address, ethers.ZeroAddress],
            [100n, 200n],
            requestId
          )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("reverts on zero amount in amounts array", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeBatch(
            await token.getAddress(),
            [recipient1.address, recipient2.address],
            [100n, 0n],
            requestId
          )
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("reverts on zero address token", async () => {
      await expect(
        distributor
          .connect(operator)
          .distributeBatch(ethers.ZeroAddress, [recipient1.address], [100n], requestId)
      ).to.be.revertedWith("Invalid token address");
    });

    it("reverts when paused", async () => {
      await distributor.pause();
      await expect(
        distributor
          .connect(operator)
          .distributeBatch(
            await token.getAddress(),
            [recipient1.address],
            [100n],
            requestId
          )
      ).to.be.reverted;
    });
  });

  // ─── emergencyWithdraw — extra guards ────────────────────────────────────

  describe("emergencyWithdraw — extra guards", () => {
    it("reverts on zero address token", async () => {
      await expect(
        distributor.emergencyWithdraw(ethers.ZeroAddress, admin.address, 100n)
      ).to.be.revertedWith("Invalid token address");
    });

    it("reverts on zero destination address", async () => {
      await expect(
        distributor.emergencyWithdraw(await token.getAddress(), ethers.ZeroAddress, 100n)
      ).to.be.revertedWith("Invalid destination");
    });

    it("reverts on zero amount", async () => {
      await expect(
        distributor.emergencyWithdraw(await token.getAddress(), admin.address, 0n)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  // ─── pause / unpause — resume transfers ──────────────────────────────────

  describe("pause / unpause — resume", () => {
    it("transfers succeed again after unpause", async () => {
      await distributor.pause();
      await distributor.unpause();
      const amount = ethers.parseEther("10");
      await distributor
        .connect(operator)
        .distributeToken(await token.getAddress(), recipient1.address, amount, requestId);
      expect(await token.balanceOf(recipient1.address)).to.equal(amount);
    });

    it("non-admin cannot unpause", async () => {
      await distributor.pause();
      await expect(distributor.connect(stranger).unpause()).to.be.reverted;
    });
  });

  // ─── Access Control ───────────────────────────────────────────────────────

  describe("Access Control", () => {
    it("admin can grant operator role to new address", async () => {
      await distributor.grantRole(OPERATOR_ROLE, stranger.address);
      expect(await distributor.hasRole(OPERATOR_ROLE, stranger.address)).to.be.true;
    });

    it("admin can revoke operator role", async () => {
      await distributor.revokeRole(OPERATOR_ROLE, operator.address);
      expect(await distributor.hasRole(OPERATOR_ROLE, operator.address)).to.be.false;
    });
  });

  // ─── MockERC20 ────────────────────────────────────────────────────────────

  describe("MockERC20", () => {
    it("returns correct decimals", async () => {
      expect(await token.decimals()).to.equal(18);
    });

    it("owner can mint additional tokens", async () => {
      const before = await token.balanceOf(admin.address);
      const amount = ethers.parseEther("1000");
      await token.mint(admin.address, amount);
      expect(await token.balanceOf(admin.address)).to.equal(before + amount);
    });

    it("non-owner cannot mint", async () => {
      await expect(token.connect(stranger).mint(stranger.address, 100n)).to.be.reverted;
    });
  });
});
