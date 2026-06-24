# MCP Token Distribution System

A production-grade Web3 application for distributing ERC-20 tokens on Sepolia testnet using MCP (Multi-Party Computation) wallet technology.

## Features

- **Admin dashboard** — transfer stats, 7-day activity chart, MCP signer status
- **Token management** — add / edit / disable ERC-20 tokens
- **Single transfer** — send tokens by wallet address or user ID
- **Bulk distribution** — CSV upload for up to 1 000 recipients in one tx
- **Transaction history** — searchable, filterable, paginated with Etherscan links
- **Audit logs** — every admin action is recorded with IP and timestamp
- **MCP signing** — pluggable signer abstraction (ethers.Wallet today; Fireblocks / Lit Protocol drop-in)
- **JWT auth** — access token + rotating refresh token with httpOnly cookie

## Architecture

```
mcp-token-board/
├── contracts/          # Solidity 0.8.24 — Hardhat + OpenZeppelin
│   ├── src/
│   │   ├── TokenDistributor.sol
│   │   └── MockERC20.sol
│   └── test/
│       └── TokenDistributor.test.ts   # 38 tests · 100% statement/line coverage
├── backend/            # Node.js · Express · PostgreSQL · ethers v6
│   └── src/
│       ├── controllers/
│       ├── services/mcp.service.ts    # IMcpSigner pluggable abstraction
│       ├── routes/
│       ├── db/migrate.ts
│       └── middleware/
├── frontend/           # React · TypeScript · Tailwind CSS · ethers v6
│   └── src/
│       ├── pages/
│       └── services/api.ts
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MetaMask browser extension (for wallet connection)

### 1. Clone & install

```bash
git clone https://github.com/hungdo2003/mpc-token-board.git
cd mcp-token-board
```

### 2. Environment setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT_SECRET, RPC_URL, MCP_PRIVATE_KEY, DISTRIBUTOR_ADDRESS

# Contracts (for Sepolia deployment)
cp contracts/.env.example contracts/.env
# Edit contracts/.env — set SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
```

**Backend env vars:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/mcp_token_board` |
| `JWT_SECRET` | yes | Random secret ≥ 32 chars |
| `MCP_PRIVATE_KEY` | yes | Operator wallet private key (hex, no 0x) |
| `DISTRIBUTOR_ADDRESS` | yes | Deployed `TokenDistributor` contract address |
| `RPC_URL` | yes | JSON-RPC endpoint (Alchemy / Infura / local) |
| `PORT` | no | API port (default 4000) |
| `CORS_ORIGIN` | no | Frontend URL (default http://localhost:3000) |

### 3. Start everything with Docker

```bash
docker-compose up -d
cd backend && npm install && npm run db:setup
```

### 4. Local development (without Docker)

```bash
# Terminal 1 — PostgreSQL
docker-compose up postgres -d

# Terminal 2 — Backend
cd backend && npm install && npm run db:setup && npm run dev

# Terminal 3 — Frontend
cd frontend && npm install && npm start

# Terminal 4 — Local Hardhat node (optional)
cd contracts && npm install && npm run node
# Then deploy locally:
cd contracts && npm run deploy:local
```

Visit **http://localhost:3000** and log in with the seed admin account:
- Email: `admin@mcp.local`
- Password: `Admin123!`

---

## Smart Contracts

### Contracts

| Contract | Description |
|----------|-------------|
| `TokenDistributor.sol` | Main distributor — `distributeToken`, `distributeBatch`, `pause`, `emergencyWithdraw` |
| `MockERC20.sol` | Mintable ERC-20 for local/testnet use |

### Commands

```bash
cd contracts

npm run compile              # Compile Solidity
npm test                     # Run 38 unit tests
npm run coverage             # Solidity coverage report
npm run deploy:hardhat       # Quick in-process deploy (no node needed)
npm run deploy:local         # Deploy to running local Hardhat node
npm run deploy:sepolia       # Deploy to Sepolia (requires .env)
npm run deploy:sepolia:verify  # Deploy + auto-verify on Etherscan
npm run verify:sepolia       # Verify already-deployed contracts
```

### Test results (v1.0.0)

```
38 passing
Statement coverage : 100%
Function coverage  : 100%
Line coverage      : 100%
Branch coverage    :  92%
```

### Deploy to Sepolia

```bash
# 1. Fill contracts/.env
cp contracts/.env.example contracts/.env

# 2. Deploy and verify
cd contracts && npm run deploy:sepolia:verify
```

The script outputs `deployment.env` with `TOKEN_ADDRESS` and `DISTRIBUTOR_ADDRESS`. Copy these into `backend/.env`.

---

## API Reference

Base URL: `http://localhost:4000/api`

All protected routes require `Authorization: Bearer <accessToken>`.  
Admin-only routes additionally require the user to have `role = 'admin'`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Register new user |
| `POST` | `/auth/login` | — | Login → access token + refresh cookie |
| `POST` | `/auth/logout` | user | Revoke refresh token |
| `GET`  | `/auth/me` | user | Current user profile |
| `POST` | `/auth/refresh` | cookie | Rotate refresh token |
| `PATCH`| `/auth/change-password` | user | Change password |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/users` | admin | List users (search, page, limit) |
| `GET`  | `/users/:id` | admin | Get user by ID |
| `PATCH`| `/users/me/wallet` | user | Link MetaMask wallet address |
| `DELETE`| `/users/me/wallet` | user | Unlink wallet address |
| `PATCH`| `/users/:id/status` | admin | Activate / disable user |

### Tokens

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/tokens` | user | List active tokens (`?all=true` includes disabled) |
| `GET`  | `/tokens/:id` | user | Get token by ID |
| `POST` | `/tokens` | admin | Add token (`name`, `symbol`, `contractAddress`, `decimals`) |
| `PATCH`| `/tokens/:id` | admin | Update token metadata |
| `DELETE`| `/tokens/:id` | admin | Disable token |

### Transfers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/transfers/send-by-address` | admin | Send to wallet address |
| `POST` | `/transfers/send-by-user` | admin | Send to user ID (resolves wallet) |
| `POST` | `/transfers/bulk` | admin | CSV batch transfer (≤ 1 000 rows) |
| `GET`  | `/transfers` | admin | List transactions (status, recipient, tokenId, page, limit) |
| `GET`  | `/transfers/:id` | admin | Get transaction detail |

**CSV bulk format:**
```csv
walletAddress,amount
0xABC...,100
0xDEF...,250
```
Or use `userId` column instead of `walletAddress`.

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard/stats` | admin | Aggregate stats + 5 recent tx + 7-day activity |
| `GET` | `/dashboard/mcp-status` | admin | MCP signer mode, network, balances |
| `GET` | `/dashboard/audit-logs` | admin | Audit log (action filter, page, limit) |

---

## MCP Signing Service

The signing layer is behind the `IMcpSigner` interface in `backend/src/services/mcp.service.ts`. The current implementation uses an `ethers.Wallet` — suitable for development and testnet.

**To integrate a production MCP provider**, implement `IMcpSigner` and swap the constructor:

```typescript
// mcp.service.ts — constructor
constructor() {
  if (config.fireblocksApiKey) {
    this.signer = new FireblocksSigner();       // your adapter
  } else if (config.litRelayerKey) {
    this.signer = new LitProtocolSigner();      // your adapter
  } else {
    this.signer = new EthersWalletSigner();     // default (dev/testnet)
  }
}
```

Provider references:
- **Fireblocks** — https://developers.fireblocks.com/
- **Lit Protocol** — https://developer.litprotocol.com/
- **Coinbase CDP** — https://docs.cdp.coinbase.com/
- **Web3Auth MPC** — https://web3auth.io/docs/

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Accounts with email, hashed password, optional wallet, role, status |
| `tokens` | ERC-20 token registry (name, symbol, address, decimals, status) |
| `transactions` | Transfer records (hash, sender, recipient, amount, status, error) |
| `refresh_tokens` | Hashed refresh tokens with expiry and revocation flag |
| `audit_logs` | Immutable admin action log with IP address |

Migrations are in `backend/src/db/migrate.ts` and run idempotently via `npm run db:migrate`.

---

## Docker

```bash
docker-compose up -d        # Start postgres + backend + frontend
docker-compose logs -f      # Stream logs
docker-compose down         # Stop all containers
docker-compose down -v      # Stop and delete volumes (wipes DB)
```

Services:
- `postgres` — port 5432
- `backend` — port 4000
- `frontend` — port 3000

---

## Branch Strategy

```
main
└── feature/<name>   →  PR  →  merge to main
```

One feature branch per day; each merged via pull request.
