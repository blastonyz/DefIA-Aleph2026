# Hardhat Smart Account Setup

Scripts para desplegar y ejecutar Account Abstraction en Arbitrum Sepolia.

## Estructura

```
scripts/
├── account/          # AA infrastructure (Paymaster, Factory)
│   ├── deploy-account.ts      # Deploy PA + Factory
│   ├── deposit-account.ts     # Deposit ETH to EntryPoint
│   └── execute-userop.ts      # Send UserOps
├── gmx/              # GMX executor
│   └── deploy-executor.ts     # Deploy GMXPositionExecutor
├── lib/              # Shared utilities
├── utils/            # Helper functions
└── copy-abis.mjs     # Sync ABIs to frontend
```

## Deployment Flow

### 1️⃣ Deploy AA Infrastructure

```bash
npm run deploy:account
```

**Outputs:**
- Paymaster address
- AccountFactory address

**Action:** Update `.env` with these addresses

### 2️⃣ Create Smart Account

Use `execute.ts` to create your first smart account. The script will:
- Compute a deterministic account address via AccountFactory
- Show you the address
- You can then fund it

**Update `.env`:**
```
SMART_ACCOUNT_ADDRESS=0x...
```

### 3️⃣ Deploy GMX Executor

```bash
npm run deploy:gmx-executor
```

**Requires:** `SMART_ACCOUNT_ADDRESS` in `.env`

**Output:** GMXPositionExecutor address

**Action:** Update `.env` with `MOLTBOT_GMX_EXECUTOR`

---

## Scripts

### `scripts/account/deploy-account.ts`
Deploy core AA contracts (Paymaster, AccountFactory)

### `scripts/gmx/deploy-executor.ts`
Deploy GMXPositionExecutor that receives long/short/close operations from smart accounts

### `scripts/account/execute-userop.ts`
Create and send UserOperations. Reads `MOLTBOT_STRATEGY` and `MOLTBOT_GMX_ACTION` to determine execution behavior.

### `scripts/copy-abis.mjs`
Sync contract ABIs from `artifacts/` to `dapp/lib/contracts/`

---

## Configuration

See `.env.example` for all variables. Required before deployment:

```env
ARBITRUM_SEPOLIA_PK=0x...
ALCHEMY_ARB_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/...
```

---

## Contract Interfaces

### GMXPositionExecutor

```solidity
enum PositionAction { Long, Short, Close }

// Direct execution
function executeOperation(uint8 action) external

// Callback from smart account
function onReport(bytes metadata, bytes report) external
```

**Usage:**
- Smart Account calls `GMXPositionExecutor.onReport()` with position metadata
- Executor stores execution history and emits `PositionExecuted` event
- Supports long/short/close operations based on encoded action
