# Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)
- Git

### Steps

```bash
# 1. Start PostgreSQL
docker-compose up postgres -d

# 2. Set up backend
cd backend
cp .env.example .env        # edit: JWT_SECRET, RPC_URL, MCP_PRIVATE_KEY, DISTRIBUTOR_ADDRESS
npm install
npm run db:setup            # runs migrations + seeds admin user

# 3. Start backend (port 4000)
npm run dev

# 4. Set up frontend (new terminal)
cd frontend
npm install
npm start                   # http://localhost:3000

# 5. (Optional) local blockchain
cd contracts
npm install
npm run node                # Hardhat node at http://127.0.0.1:8545
npm run deploy:local        # deploy MockERC20 + TokenDistributor
# copy TOKEN_ADDRESS and DISTRIBUTOR_ADDRESS from deployment.env into backend/.env
```

### Default admin credentials (seed)
```
Email:    admin@mcp.local
Password: Admin123!
```

---

## Sepolia Testnet Deployment

### 1. Get testnet resources

- **Sepolia ETH** — https://sepoliafaucet.com (need ~0.05 ETH for deployment)
- **Alchemy / Infura** — create a Sepolia RPC endpoint
- **Etherscan API key** — https://etherscan.io/myapikey

### 2. Configure contracts

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
PRIVATE_KEY=<deployer-private-key-hex>
ETHERSCAN_API_KEY=<your-etherscan-api-key>
```

### 3. Deploy and verify

```bash
cd contracts
npm run deploy:sepolia:verify
```

Output:
```
[1/4] Deploying MockERC20...        ✓  0x...
[2/4] Deploying TokenDistributor... ✓  0x...
[3/4] Funding distributor...        ✓
[4/4] Writing deployment.env...     ✓
Waiting 30s for Etherscan to index...
✓ MockERC20 verified
✓ TokenDistributor verified
```

### 4. Configure backend

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/mcp_token_board
JWT_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=15m
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
MCP_PRIVATE_KEY=<operator-wallet-private-key>
DISTRIBUTOR_ADDRESS=<from-deployment.env>
CORS_ORIGIN=https://your-frontend-domain.com
PORT=4000
```

> **Important**: `MCP_PRIVATE_KEY` is the operator wallet that signs every distribution. Fund it with enough Sepolia ETH to cover gas.

### 5. Database

```bash
cd backend
npm run db:migrate    # creates tables
npm run db:seed       # creates admin user
```

### 6. Start backend

```bash
npm run build && npm start
# or with PM2:
pm2 start dist/app.js --name mcp-backend
```

---

## Docker Compose (all-in-one)

```bash
# Start all three services
docker-compose up -d

# Run migrations (first time)
docker exec mcp_backend npm run db:setup

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### docker-compose.yml services

| Service | Port | Notes |
|---------|------|-------|
| `postgres` | 5432 | Persistent volume `mcp_pgdata` |
| `backend` | 4000 | Reads from `backend/.env` |
| `frontend` | 3000 | `REACT_APP_API_URL=http://localhost:4000/api` |

---

## Production Checklist

- [ ] `JWT_SECRET` is a long random string (≥ 64 chars)
- [ ] `MCP_PRIVATE_KEY` wallet is funded for gas
- [ ] `CORS_ORIGIN` set to exact frontend domain
- [ ] PostgreSQL not exposed on public interface
- [ ] HTTPS in front of backend (nginx / load balancer)
- [ ] Rate limiting configured (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`)
- [ ] Database backups scheduled
- [ ] Operator wallet balance monitored (alert below 0.05 ETH)

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | HTTP server port |
| `NODE_ENV` | `development` | `production` disables stack traces in errors |
| `DATABASE_URL` | localhost/mcp_token_board | PostgreSQL connection string |
| `JWT_SECRET` | — | **Required** — signs access tokens |
| `JWT_EXPIRES_IN` | `24h` | Access token lifetime |
| `RPC_URL` | `http://127.0.0.1:8545` | Ethereum JSON-RPC endpoint |
| `MCP_PRIVATE_KEY` | — | Operator wallet private key (no 0x prefix) |
| `DISTRIBUTOR_ADDRESS` | — | Deployed `TokenDistributor` contract address |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

### Contracts (`contracts/.env`)

| Variable | Description |
|----------|-------------|
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC URL |
| `PRIVATE_KEY` | Deployer wallet private key |
| `ETHERSCAN_API_KEY` | For contract source verification |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:4000/api` | Backend API base URL |
| `REACT_APP_CHAIN_ID` | `11155111` | Chain ID for Etherscan links |
