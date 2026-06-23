# Entity Relationship Diagram

## ERD (Text)

```
┌─────────────────────────────────┐
│             users               │
├─────────────────────────────────┤
│ id             UUID  PK         │
│ email          VARCHAR(255) UQ  │
│ password_hash  VARCHAR(255)     │
│ wallet_address VARCHAR(42)      │
│ role           VARCHAR(20)      │
│ status         VARCHAR(20)      │
│ created_at     TIMESTAMP        │
│ updated_at     TIMESTAMP        │
└──────────────┬──────────────────┘
               │ 1
               │ has many
               │ N
┌──────────────▼──────────────────┐
│           audit_logs            │
├─────────────────────────────────┤
│ id           UUID  PK           │
│ user_id      UUID  FK → users   │
│ action       VARCHAR(100)       │
│ description  TEXT               │
│ ip_address   VARCHAR(45)        │
│ created_at   TIMESTAMP          │
└─────────────────────────────────┘


┌─────────────────────────────────┐
│             tokens              │
├─────────────────────────────────┤
│ id               UUID  PK       │
│ name             VARCHAR(100)   │
│ symbol           VARCHAR(20)    │
│ contract_address VARCHAR(42) UQ │
│ decimals         INT            │
│ status           VARCHAR(20)    │
│ created_at       TIMESTAMP      │
│ updated_at       TIMESTAMP      │
└──────────────┬──────────────────┘
               │ 1
               │ used in
               │ N
┌──────────────▼──────────────────┐
│          transactions           │
├─────────────────────────────────┤
│ id          UUID  PK            │
│ tx_hash     VARCHAR(66)         │
│ sender      VARCHAR(42)         │
│ recipient   VARCHAR(42)         │
│ token_id    UUID  FK → tokens   │
│ amount      NUMERIC(36,18)      │
│ status      VARCHAR(20)         │
│ error_msg   TEXT                │
│ created_at  TIMESTAMP           │
│ updated_at  TIMESTAMP           │
└─────────────────────────────────┘


┌─────────────────────────────────┐
│       schema_migrations         │
├─────────────────────────────────┤
│ version     VARCHAR(50) PK      │
│ applied_at  TIMESTAMP           │
└─────────────────────────────────┘
```

## Relationships

| From         | To           | Type       | Via              |
|--------------|--------------|------------|------------------|
| users        | audit_logs   | 1 → N      | audit_logs.user_id |
| tokens       | transactions | 1 → N      | transactions.token_id |

## Constraints Summary

| Table        | Constraint              | Rule                              |
|--------------|-------------------------|-----------------------------------|
| users        | role CHECK              | admin \| user                     |
| users        | status CHECK            | active \| disabled                |
| users        | wallet_address CHECK    | NULL or ^0x[0-9a-fA-F]{40}$      |
| tokens       | decimals CHECK          | 0 – 18                            |
| tokens       | contract_address CHECK  | ^0x[0-9a-fA-F]{40}$              |
| tokens       | status CHECK            | active \| disabled                |
| transactions | status CHECK            | pending \| success \| failed      |
| transactions | amount CHECK            | > 0                               |
| transactions | tx_hash CHECK           | NULL or ^0x[0-9a-fA-F]{64}$     |
