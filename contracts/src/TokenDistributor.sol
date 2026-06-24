// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenDistributor
 * @dev Distributes ERC-20 tokens to recipients via MCP-signed transactions.
 *      Tokens must be deposited into this contract before distribution.
 */
contract TokenDistributor is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    event TransferExecuted(
        bytes32 indexed requestId,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    event BatchTransferExecuted(
        bytes32 indexed requestId,
        address indexed token,
        uint256 recipientCount,
        uint256 totalAmount
    );

    event TokensDeposited(address indexed token, address indexed from, uint256 amount);

    event EmergencyWithdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    // ─── Core Distribution ────────────────────────────────────────────────────

    /**
     * @dev Transfer tokens to a single recipient. Called by the MCP operator wallet.
     */
    function distributeToken(
        address tokenAddress,
        address recipient,
        uint256 amount,
        bytes32 requestId
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(tokenAddress).safeTransfer(recipient, amount);

        emit TransferExecuted(requestId, tokenAddress, recipient, amount);
    }

    /**
     * @dev Transfer tokens to multiple recipients in one transaction.
     * @param recipients Array of recipient addresses (max 1000)
     * @param amounts    Array of amounts matching each recipient
     */
    function distributeBatch(
        address tokenAddress,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 requestId
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        require(recipients.length > 0, "Empty recipients");
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length <= 1000, "Exceeds max batch size");

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Amount must be greater than 0");

            IERC20(tokenAddress).safeTransfer(recipients[i], amounts[i]);
            totalAmount += amounts[i];
        }

        emit BatchTransferExecuted(requestId, tokenAddress, recipients.length, totalAmount);
    }

    // ─── Token Deposit ────────────────────────────────────────────────────────

    /**
     * @dev Deposit tokens into the distributor contract.
     */
    function depositTokens(address tokenAddress, uint256 amount) external {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

        emit TokensDeposited(tokenAddress, msg.sender, amount);
    }

    // ─── Admin Controls ───────────────────────────────────────────────────────

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal in case of contract issues.
     */
    function emergencyWithdraw(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        require(to != address(0), "Invalid destination");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(tokenAddress).safeTransfer(to, amount);

        emit EmergencyWithdrawn(tokenAddress, to, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getTokenBalance(address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }
}
