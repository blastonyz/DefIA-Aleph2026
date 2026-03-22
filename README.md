# DefIA Aleph 2026

## ⚠️ IMPORTANT CONTEXT (READ FIRST)

This project was built using a mixed workflow across multiple sources and tools:

- **Lovable & v0** was used as part of the UI/structure bootstrap process.
- **GitHub Copilot** was used as an AI coding assistant during implementation.
- The final submission repository is a **consolidation of development from multiple intermediate repositories/workspaces** into a single deliverable.

This means the final repo history reflects a consolidation process (migration + integration), while the codebase here is the final integrated version presented for evaluation.

---

## Overview

DefIAr is a DeFi hub powered by AI agents with account abstraction and GMX execution flow.

The repository contains:

- `dapp/` → Next.js frontend, wallet connection, AI chat integration, session key UX, and GMX execution controls.
- `hardhat/` → smart contracts, deployment scripts, account abstraction setup, and GMX executor flow.
- `SESSION_KEYS.md` → session key architecture and behavior notes.

---

## Tech Stack

### Frontend (`dapp`)

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **RainbowKit + Wagmi + Viem** (wallet + onchain interactions)
- **Radix UI** components
- **Lightweight Charts** (OHLC chart)

### Smart Contracts (`hardhat`)

- **Hardhat 3**
- **Solidity**
- **Ethers v6**
- **OpenZeppelin Contracts**
- **ERC-4337 Account Abstraction contracts** (`@account-abstraction/contracts`)

---

## Project Structure

```text
aleph/
├─ dapp/
├─ hardhat/
└─ SESSION_KEYS.md
```

---

## Setup Guide

### 1) Clone and install dependencies

```bash
git clone <repo-url>
cd aleph
```

Install frontend deps:

```bash
cd dapp
npm install
```

Install contracts deps:

```bash
cd ../hardhat
npm install
```

---

## Environment Configuration

### Frontend env (`dapp/.env`)

Create from template:

```bash
cd dapp
cp .env.example .env
```

Fill at least:

- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_BUNDLER_RPC_URL` (and chain-specific variants if needed)
- `NEXT_PUBLIC_ENTRYPOINT_ADDRESS`
- `NEXT_PUBLIC_FACTORY_ADDRESS`
- `NEXT_PUBLIC_PAYMASTER_ADDRESS`
- `NEXT_PUBLIC_SMART_ACCOUNT_ADDRESS`
- `NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR`
- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_HMAC_SECRET`
- `COINGECKO_API_KEY`

### Contracts env (`hardhat/.env`)

Create from template and fill deployment values:

- `ARBITRUM_SEPOLIA_PK`
- `ALCHEMY_ARB_RPC_URL`
- `ENTRYPOINT_ADDRESS`
- `PAYMASTER_ADDRESS`
- `FACTORY_ADDRESS`
- `SMART_ACCOUNT_ADDRESS`
- `MOLTBOT_GMX_EXECUTOR`

---

## Running the App

### Frontend

```bash
cd dapp
npm run dev
```

Main scripts:

- `npm run dev` → start dev server
- `npm run build` → production build
- `npm run start` → run production server
- `npm run lint` → lint code
- `npm run sync:abis` → copy ABIs from `hardhat` to frontend

### Contracts

```bash
cd hardhat
npm run compile
```

Main scripts:

- `npm run compile` → compile contracts
- `npm run copy:abis` → export ABIs
- `npm run deploy:account` → deploy AA core contracts
- `npm run deploy:gmx-executor` → deploy GMX executor

---

## Fuji Trading Requirements

Before executing GMX actions on Fuji, make sure you have:

- **AVAX on Fuji** (for gas).
- **USDC on Fuji** (collateral for the configured market flow).
- Executor funded from the UI (native AVAX + collateral top-up when needed).

In the `Agent Console`, use the executor funding actions first:

- `Fund executor +0.03 AVAX`
- `Mint/Fund executor +<collateral amount> <token>`

Without this funding, execution can fail due to missing gas/collateral on the executor account.

---

## Usage Flow

1. Configure env vars for both `dapp` and `hardhat`.
2. Deploy/account-setup contracts from `hardhat` (if needed).
3. Sync ABIs into frontend (`dapp`):
   - `npm run sync:abis`
4. Run frontend:
   - `npm run dev`
5. Connect wallet on **Avalanche Fuji** and confirm GMX params.
6. Fund the executor from `Agent Console` (AVAX + USDC collateral).
7. Execute trades using either flow:
   - **Session Key flow**: activate session key and execute without signing every operation.
   - **Agent flow**: send a natural-language prompt and let the AI agent select/trigger the action.

---

## Notes for Reviewers

- The repo intentionally includes both frontend and contracts to keep a full end-to-end demo in one place.
- Commit history reflects consolidation of prior workspaces into this final submission structure.
- For deeper session-key details, see `SESSION_KEYS.md`.
