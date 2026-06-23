# MPC Token Distribution System - Requirements Specification

## 1. Project Overview

### 1.1 Project Name

MPC Token Distribution System

### 1.2 Purpose

Develop a Web3 application that allows an administrator or automated system to securely distribute ERC-20 tokens on the Sepolia test network using Multi-Party Computation (MPC) wallet technology.

The system enables token transfers to:

- A wallet address
- A registered user ID

without exposing private keys.

### 1.3 Objectives

- Secure token transfers using MPC signing.
- Eliminate single-point private key exposure.
- Automate token distribution.
- Provide transaction history and audit logs.
- Support future expansion to Ethereum Mainnet and other EVM chains.

---

# 2. Technology Stack

## Frontend

- ReactJS
- React Router
- Axios
- Web3.js / Ethers.js
- Tailwind CSS or Material UI

## Backend

- Node.js
- ExpressJS
- PostgreSQL

## Blockchain

- Solidity
- OpenZeppelin Contracts
- Sepolia Testnet

## MPC

Possible Providers:

- Fireblocks MPC
- Lit Protocol
- Coinbase CDP MPC
- Web3Auth MPC
- Safe Wallet + MPC Integration

## Infrastructure

- Docker
- GitHub
- CI/CD Pipeline

---

# 3. User Roles

## 3.1 Admin

Responsibilities:

- Manage users
- Manage token balances
- Create transfer requests
- View transaction history
- Configure MPC settings

Permissions:

- Full system access

---

## 3.2 User

Responsibilities:

- Register account
- Connect wallet
- View received tokens
- View transaction history

Permissions:

- Limited to own account

---

## 4. Functional Requirements

# FR-01 Authentication

## Description

Users can register and login.

### Acceptance Criteria

- Register by email/password
- Login
- Logout
- JWT Authentication

---

# FR-02 Wallet Management

## Description

Users can connect wallet.

### Supported Wallets

- MetaMask
- Rabby
- WalletConnect

### Acceptance Criteria

- Connect wallet
- Disconnect wallet
- Store wallet address

---

# FR-03 User Wallet Mapping

## Description

Each user account can have a blockchain wallet address.

### Data

User

- userId
- email
- walletAddress

### Acceptance Criteria

- One active wallet per user
- Wallet verification required

---

# FR-04 Token Management

## Description

Admin can manage supported tokens.

### Token Information

- Token Name
- Symbol
- Contract Address
- Decimals

### Acceptance Criteria

- Add token
- Update token
- Disable token

---

# FR-05 Send Token By Wallet Address

## Description

Admin can transfer tokens directly to a wallet address.

### Flow

1. Admin enters wallet address.
2. Admin enters amount.
3. Backend creates transfer request.
4. MPC signs transaction.
5. Transaction broadcast to Sepolia.
6. Result stored in database.

### Acceptance Criteria

- Validate wallet address
- Validate amount
- Show TxHash

---

# FR-06 Send Token By User ID

## Description

Admin can send tokens using internal User ID.

### Flow

1. Admin enters User ID.
2. System retrieves wallet address.
3. MPC signs transaction.
4. Transfer token.
5. Store history.

### Acceptance Criteria

- User must have wallet linked
- Display success/failure status

---

# FR-07 Bulk Token Distribution

## Description

Admin can distribute tokens to multiple users.

### Input

CSV File

Example:

UserID,Amount
U001,100
U002,50
U003,75

### Acceptance Criteria

- Upload CSV
- Validate records
- Execute batch distribution

---

# FR-08 Transaction History

## Description

Store all token transfer activities.

### Information

- Transaction ID
- TxHash
- Sender
- Receiver
- Amount
- Status
- Timestamp

### Acceptance Criteria

- Search
- Filter
- Pagination

---

# FR-09 Dashboard

## Description

Admin dashboard displaying system statistics.

### Metrics

- Total Transfers
- Total Tokens Distributed
- Success Rate
- Failed Transfers
- Active Users

---

# FR-10 Audit Log

## Description

Track every administrative action.

### Log Examples

- Login
- Create Transfer
- Approve Transfer
- Update Configuration

---

# 5. MPC Workflow

## Send Token Flow

1. Admin submits transfer request.
2. Backend validates request.
3. Request sent to MPC Service.
4. MPC participants generate signature.
5. Signed transaction returned.
6. Backend broadcasts transaction.
7. Smart contract executes transfer.
8. Transaction hash stored.

---

# 6. Smart Contract Requirements

## Contract Name

TokenDistributor.sol

## Features

### distributeToken()

Transfer token to one wallet.

Parameters:

- tokenAddress
- recipient
- amount

### distributeBatch()

Transfer token to multiple wallets.

Parameters:

- tokenAddress
- recipients[]
- amounts[]

### pause()

Pause distribution.

### unpause()

Resume distribution.

### emergencyWithdraw()

Emergency token withdrawal.

### Events

TransferExecuted
BatchTransferExecuted
EmergencyWithdrawn

---

# 7. Database Design

## Users

| Field          | Type    |
| -------------- | ------- |
| id             | UUID    |
| email          | VARCHAR |
| password_hash  | VARCHAR |
| wallet_address | VARCHAR |
| status         | VARCHAR |

---

## Tokens

| Field            | Type    |
| ---------------- | ------- |
| id               | UUID    |
| symbol           | VARCHAR |
| contract_address | VARCHAR |
| decimals         | INT     |

---

## Transactions

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| tx_hash    | VARCHAR   |
| sender     | VARCHAR   |
| recipient  | VARCHAR   |
| token_id   | UUID      |
| amount     | DECIMAL   |
| status     | VARCHAR   |
| created_at | TIMESTAMP |

---

## AuditLogs

| Field       | Type      |
| ----------- | --------- |
| id          | UUID      |
| user_id     | UUID      |
| action      | VARCHAR   |
| description | TEXT      |
| created_at  | TIMESTAMP |

---

# 8. Non-Functional Requirements

## Security

- MPC-based signing
- JWT Authentication
- Rate limiting
- Input validation
- Smart contract access control

## Performance

- Transfer request response < 2 seconds
- Dashboard load < 3 seconds

## Reliability

- 99.9% uptime
- Retry failed transactions

## Scalability

- Support 100,000+ users
- Support batch transfer of 1,000+ recipients

---

# 9. Smart Contract Security

Use OpenZeppelin:

- Ownable
- Pausable
- ReentrancyGuard
- AccessControl

Security Requirements:

- Prevent reentrancy attacks
- Prevent unauthorized transfers
- Validate token addresses
- Validate transfer amounts

---

# 10. Future Enhancements

- Mainnet deployment
- Multi-chain support
- Scheduled token distribution
- DAO approval workflow
- Multi-signature approval
- NFT distribution
- Reward campaign management
