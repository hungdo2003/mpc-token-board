# MPC Token Distribution System

A Web3 application for securely distributing ERC-20 tokens on Sepolia testnet using MPC wallet technology.

## Architecture

```
mpc-token-board/
├── contracts/     # Solidity smart contracts (Hardhat)
├── backend/       # Node.js + Express + PostgreSQL API
├── frontend/      # React + Tailwind CSS admin panel
└── docker-compose.yml
```

## Quick Start

### 1. Prerequisites
- Node.js 20+
- Docker & Docker Compose
- MetaMask browser extension

### 2. Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in: RPC_URL, MPC_PRIVATE_KEY, JWT_SECRET

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 3. Start with Docker

```bash
docker-compose up -d
```

Then run the database migration:

```bash
cd backend && npm run db:migrate
```

### 4. Local Development

```bash
# Start PostgreSQL
docker-compose up postgres -d

# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm start

# Contracts (new terminal)
cd contracts && npm install && npm run node
```

## Smart Contracts

```bash
cd contracts
npm run compile       # Compile contracts
npm test              # Run tests
npm run deploy:local  # Deploy to local Hardhat node
npm run deploy:sepolia # Deploy to Sepolia testnet
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Current user |
| GET  | /api/users | List users (admin) |
| PATCH | /api/users/me/wallet | Link wallet |
| GET  | /api/tokens | List tokens |
| POST | /api/tokens | Add token (admin) |
| POST | /api/transfers/send-by-address | Send to wallet (admin) |
| POST | /api/transfers/send-by-user | Send to user ID (admin) |
| POST | /api/transfers/bulk | Bulk CSV distribution (admin) |
| GET  | /api/transfers | Transaction history |
| GET  | /api/dashboard/stats | Dashboard stats (admin) |
| GET  | /api/dashboard/audit-logs | Audit logs (admin) |

## MPC Provider

The current implementation uses a mock MPC service (`backend/src/services/mpc.service.ts`).
To use a real MPC provider, replace the `distributeToken` and `distributeBatch` methods with:
- **Fireblocks**: `@fireblocks/fireblocks-sdk`
- **Lit Protocol**: `@lit-protocol/lit-node-client`
- **Coinbase CDP**: `@coinbase/cdp-sdk`

## Branch Strategy

```
main → develop → feature/*
```
