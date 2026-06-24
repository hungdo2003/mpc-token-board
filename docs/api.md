# API Reference

Base URL: `http://localhost:4000/api`

## Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

Access tokens expire in 24 h (configurable via `JWT_EXPIRES_IN`). Use `POST /auth/refresh` to rotate them via the `refreshToken` httpOnly cookie.

---

## Auth

### POST /auth/register
Register a new user account.

**Body**
```json
{ "email": "user@example.com", "password": "SecurePass1!" }
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": "uuid", "email": "...", "role": "user", "status": "active" }
  }
}
```

---

### POST /auth/login
Login and receive an access token. Sets `refreshToken` httpOnly cookie.

**Body**
```json
{ "email": "admin@mcp.local", "password": "Admin123!" }
```

**Response 200** — same shape as `/register`.

---

### POST /auth/logout
Revokes the current refresh token. Requires Bearer token.

**Response 200**
```json
{ "success": true, "data": { "message": "Logged out" } }
```

---

### GET /auth/me
Returns current user profile.

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid", "email": "...", "role": "admin",
      "status": "active", "wallet_address": "0x..."
    }
  }
}
```

---

### POST /auth/refresh
Rotates the refresh token (reads from httpOnly cookie, issues new cookie + new accessToken).

**Response 200**
```json
{ "success": true, "data": { "accessToken": "eyJ..." } }
```

---

### PATCH /auth/change-password
Change the authenticated user's password.

**Body**
```json
{ "currentPassword": "old", "newPassword": "New1!" }
```

---

## Users

### GET /users  *(admin)*
List users with optional search and pagination.

**Query params**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `search` | string | — | Filter by email (case-insensitive) |

**Response 200**
```json
{
  "users": [ { "id": "...", "email": "...", "role": "user", "wallet_address": null, "status": "active", "created_at": "..." } ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### GET /users/:id  *(admin)*
Get a single user by UUID.

---

### PATCH /users/me/wallet  *(user)*
Link a MetaMask wallet address to the authenticated user.

**Body**
```json
{ "walletAddress": "0xAbC..." }
```

Returns 409 if the address is already linked to another account.

---

### DELETE /users/me/wallet  *(user)*
Unlink the authenticated user's wallet.

---

### PATCH /users/:id/status  *(admin)*
Activate or disable a user account.

**Body**
```json
{ "status": "active" }   // or "disabled"
```

---

## Tokens

### GET /tokens
List tokens. Default: active only. Pass `?all=true` to include disabled.

**Response 200**
```json
{
  "tokens": [
    {
      "id": "uuid", "name": "USD Coin", "symbol": "USDC",
      "contract_address": "0x...", "decimals": 6,
      "status": "active", "created_at": "..."
    }
  ]
}
```

---

### GET /tokens/:id
Get a single token by UUID.

---

### POST /tokens  *(admin)*
Register a new ERC-20 token.

**Body**
```json
{
  "name": "USD Coin",
  "symbol": "USDC",
  "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "decimals": 6
}
```

Returns 409 if `contractAddress` already exists.

---

### PATCH /tokens/:id  *(admin)*
Update token metadata. All fields are optional (COALESCE update).

**Body**
```json
{ "name": "USD Coin", "symbol": "USDC", "decimals": 6 }
```

---

### DELETE /tokens/:id  *(admin)*
Disable a token (sets `status = 'disabled'`). Does not delete the record.

---

## Transfers

### POST /transfers/send-by-address  *(admin)*
Send tokens to an Ethereum wallet address.

**Body**
```json
{
  "tokenId": "uuid",
  "recipient": "0xRecipientAddress...",
  "amount": "100.5"
}
```

**Response 200**
```json
{ "txHash": "0x...", "txId": "uuid", "status": "success" }
```

**Errors**
- `400` — invalid address or amount
- `400` — token not found or disabled
- `500` — on-chain tx failed (error stored in transactions table)

---

### POST /transfers/send-by-user  *(admin)*
Send tokens to a user's linked wallet. Resolves `userId → wallet_address` server-side.

**Body**
```json
{
  "tokenId": "uuid",
  "userId": "uuid",
  "amount": "50"
}
```

**Errors**
- `404` — user not found
- `400` — user has no linked wallet address

---

### POST /transfers/bulk  *(admin)*
Upload a CSV file to transfer tokens to multiple recipients in a single on-chain batch.

**Content-Type**: `multipart/form-data`

**Fields**
| Field | Type | Description |
|-------|------|-------------|
| `tokenId` | string (UUID) | Token to distribute |
| `file` | CSV file | Max 5 MB, max 1 000 rows |

**CSV format** (header row required):
```csv
walletAddress,amount
0xABC...,100
0xDEF...,250
```
Or use `userId` instead of `walletAddress` (resolved server-side):
```csv
userId,amount
a1b2c3...,75
```

**Response 200**
```json
{ "txHash": "0x...", "count": 42, "status": "success" }
```

---

### GET /transfers  *(admin)*
List transactions with optional filters.

**Query params**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default 1) |
| `limit` | int | Items per page (default 20, max 100) |
| `status` | string | `success`, `failed`, or `pending` |
| `recipient` | string | Address substring (ILIKE match) |
| `tokenId` | UUID | Filter by token |

**Response 200**
```json
{
  "transactions": [
    {
      "id": "uuid", "tx_hash": "0x...", "sender": "0x...",
      "recipient": "0x...", "amount": "100", "status": "success",
      "token_symbol": "USDC", "token_name": "USD Coin",
      "error_msg": null, "created_at": "..."
    }
  ],
  "total": 200,
  "page": 1,
  "limit": 20
}
```

---

### GET /transfers/:id  *(admin)*
Get a single transaction by UUID.

---

## Dashboard

### GET /dashboard/stats  *(admin)*
Aggregate statistics for the dashboard.

**Response 200**
```json
{
  "stats": {
    "totalTransfers": 150,
    "totalTokensDistributed": "25000.5",
    "successCount": 145,
    "failedCount": 5,
    "successRate": "96.7",
    "activeUsers": 12,
    "activeTokens": 3
  },
  "recentTransactions": [ /* last 5 */ ],
  "dailyActivity": [
    { "date": "2026-06-18", "count": "12", "total": "1500" },
    { "date": "2026-06-19", "count": "8", "total": "900" }
  ]
}
```

---

### GET /dashboard/mcp-status  *(admin)*
Returns current MCP signer status and on-chain info.

**Response 200**
```json
{
  "mcp": {
    "mode": "ethers-wallet",
    "configured": true,
    "operatorAddress": "0x...",
    "distributorAddress": "0x...",
    "network": "sepolia",
    "chainId": 11155111,
    "operatorBalanceEth": "0.1234"
  }
}
```

`configured` is `false` when `MCP_PRIVATE_KEY` or `DISTRIBUTOR_ADDRESS` is missing.

---

### GET /dashboard/audit-logs  *(admin)*
Paginated audit log.

**Query params**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number |
| `limit` | int | Items per page (max 100) |
| `action` | string | Substring filter on action field |
| `userId` | UUID | Filter by user |

**Response 200**
```json
{
  "logs": [
    {
      "id": "uuid", "user_email": "admin@mcp.local",
      "action": "TRANSFER", "description": "Sent 100 USDC to 0x...",
      "ip_address": "127.0.0.1", "created_at": "..."
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 20
}
```

---

## Error Responses

All errors follow this shape:

```json
{ "error": "Human-readable error message" }
```

| Status | When |
|--------|------|
| 400 | Validation error, bad input |
| 401 | Missing or expired access token |
| 403 | Valid token but insufficient role |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate contract address) |
| 429 | Rate limit exceeded |
| 500 | Internal server error / on-chain failure |
