import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenDistributorModule = buildModule("TokenDistributorModule", (m) => {
  const admin = m.getAccount(0);

  // Deploy MockERC20 for local/testnet use only
  const mockToken = m.contract("MockERC20", [
    "Distribution Token",
    "DIST",
    18,
    admin,
  ]);

  // Deploy TokenDistributor with admin as both DEFAULT_ADMIN_ROLE and OPERATOR_ROLE
  const distributor = m.contract("TokenDistributor", [admin]);

  // Deposit initial tokens into the distributor (100 million DIST)
  const initialFund = 100_000_000n * 10n ** 18n;

  m.call(mockToken, "approve", [distributor, initialFund], {
    after: [distributor],
  });

  m.call(distributor, "depositTokens", [mockToken, initialFund], {
    after: [mockToken],
    id: "initialDeposit",
  });

  return { mockToken, distributor };
});

export default TokenDistributorModule;
