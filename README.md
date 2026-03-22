# DefIA Aleph 2026

> **The AI-native execution layer for DeFi**: from intent to on-chain action, with ERC-4337 account abstraction, session keys, and multi-wallet GMX execution.

---

## 🎯 Auditor Hook (30 seconds)

If you only have half a minute to evaluate this repo, here is why it is a winning candidate:

- **Real problem**: active DeFi execution still has too much click/signature friction.
- **Differentiated solution**: DefIA turns intent (`"I want a conservative long"`) into on-chain execution with modular, auditable architecture.
- **Technical edge**: full AA + Session Keys + GMX executor stack with multi-wallet allowlist (`allowedForwarders`).
- **Maturity signal**: not just a nice UI; includes deployment runbooks, ops scripts, on-chain error handling, and UserOp traceability.
- **Incubation potential**: strong base to evolve into an intelligent multi-protocol execution product (GMX today, strategy modules tomorrow).

---

## 🧠 Product Narrative

Imagine a user who understands markets but does not want to fight through 10 popups per trade.

DefIA introduces a middle layer between **human intent** and **on-chain execution**:

1. The user expresses an intent (manual or agent-assisted).
2. The system builds an ERC-4337 UserOperation with verifiable parameters.
3. The executor validates security context (forwarder allowlist, order config, balances).
4. The order is executed on GMX with full traceability.

This is not “AI for marketing”: it is **AI + execution infrastructure** to reduce friction without sacrificing control.

---

## 🏆 Why this project stands out

### 1) Innovation with immediate utility

- Integrates AI-assisted trading decisions with a real (not simulated) execution path.
- Uses Account Abstraction for product-grade UX (less dependency on repetitive wallet signatures).

### 2) Architecture designed to scale

- Clear domain separation:
   - `dapp/`: interface, agents, session UX, UserOp monitoring.
   - `hardhat/`: contracts, deployment and operations scripts.
- Designed for module replacement (AI provider, execution protocol, risk policies).

### 3) Pragmatic security (what auditors want to see)

- Session keys with expiration, explicit activation, and owner-signature fallback.
- Executor v2 with `mapping(address => bool) allowedForwarders` for multi-wallet support.
- Explicit on-chain errors (`InvalidForwarder`, `InvalidOrderVault`, etc.) with UI-side decoding.
- Pre-execution operational checks (native balance, collateral, GMX config).

### 4) Delivery signal

- Solved production-like issues (AA gas tuning, forwarder mismatch, local vs Vercel env drift).
- Operational scripts ready for reproducible execution (`deploy`, `add-forwarder`, `set-order-config`, `copy-abis`).

---

## 🧩 What this repository includes

- `dapp/` → Next.js frontend, wallet connection, AI chat, session key UX, GMX execution.
- `hardhat/` → contracts, deployment scripts, AA setup (ERC-4337), GMX executor.
- `SESSION_KEYS.md` → session-key architecture and behavior details.

---

## ⚙️ Technical stack

### Frontend (`dapp`)

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- RainbowKit + Wagmi + Viem
- Radix UI
- Lightweight Charts

### Smart Contracts (`hardhat`)

- Hardhat 3
- Solidity
- Ethers v6
- OpenZeppelin Contracts
- ERC-4337 (`@account-abstraction/contracts`)

---

## 🏗️ Architecture at a glance

```text
User Intent (manual / AI)
   │
   ▼
Agent Console (dapp)
   │
   ▼
UserOperation Builder (ERC-4337)
   │
   ▼
EntryPoint + Paymaster + Smart Account
   │
   ▼
GMXPositionExecutor v2 (allowedForwarders)
   │
   ▼
GMX ExchangeRouter (Fuji)
```

---

## 🚀 Quick setup

### 1) Install dependencies

```bash
git clone <repo-url>
cd aleph

cd dapp && npm install
cd ../hardhat && npm install
```

### 2) Configure environment

#### Frontend (`dapp/.env`)

Minimum variables:

- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_BUNDLER_RPC_URL_FUJI` (or equivalent fallback)
- `NEXT_PUBLIC_ENTRYPOINT_ADDRESS`
- `NEXT_PUBLIC_FACTORY_ADDRESS`
- `NEXT_PUBLIC_PAYMASTER_ADDRESS`
- `NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR`

#### Contracts (`hardhat/.env`)

Minimum variables:

- `AVAX_RPC_URL`
- `AVALANCHE_FUJI_PK` (or configured PK fallback)
- `MOLTBOT_GMX_EXECUTOR`
- `AVAX_FACTORY_ADDRESS`

> **Production note:** Vercel uses its own environment variables; it does not read your local `.env`.

### 3) Run

```bash
cd hardhat
npm run compile
npm run copy:abis

cd ../dapp
npm run dev
```

---

## 🧪 Recommended operational flow (Fuji)

1. Connect your wallet on Avalanche Fuji.
2. Verify the configured executor is the expected one (`NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR`).
3. In Agent Console, fund the executor:
   - `Fund executor +0.03 AVAX`
   - `Mint/Fund executor +<collateral amount> <token>`
4. (Optional) Create a session key to reduce signing friction.
5. Execute trade manually or via agent prompt.

### UI flow (mandatory: fund first)

On the **Agent Console** screen, the correct order is:

1. **Connect wallet** on Fuji.
2. Go to **Executor Check** and click **Refresh**.
3. If executor AVAX is low, click **Fund executor +0.03 AVAX**.
4. If collateral is zero, click **Mint/Fund executor +1 token**.
5. Confirm that:
   - `AVAX Balance` > `Execution fee`
   - `Collateral` > 0
   - `Router allowance` is sufficient
6. Only then execute **Long / Short / Close** or **Auto**.

> If you switch accounts, repeat this quick check before sending a new UserOperation.

---

## 🔐 Current functional security status

- ✅ Real multi-wallet support in executor v2 via allowlist (`addForwarder/removeForwarder`).
- ✅ Critical config validation before sending UserOps.
- ✅ On-chain error decoding for fast diagnosis.
- ✅ Session-key scoping by account/chain to avoid identity crossover when switching wallets.

---

## 📈 Incubation vision (why this is worth backing)

DefIA can evolve quickly into:

- **A multi-protocol execution copilot** (GMX, perp DEXs, lending loops, hedging).
- **A configurable risk-policy engine** by user profile.
- **Programmable smart accounts** with dynamic protection and limit rules.
- **White-label B2B infra** for wallets, crypto brokers, and on-chain fintechs.

In short: this is not just a hackathon demo; it is a product foundation with a clear path to traction.

---

## ℹ️ Build context

This project was built using a mixed workflow:

- Lovable / v0 for initial UI bootstrap.
- GitHub Copilot as an implementation assistant.
- Consolidation of multiple intermediate workspaces into this final repository.

The commit history reflects that integration process; the code here is the final evaluable version.
