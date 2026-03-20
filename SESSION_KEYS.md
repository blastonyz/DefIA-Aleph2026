# Session Keys Architecture

## Problem
Currently, each action (Trade Long/Short/Close) requires **3 MetaMask signature prompts**:
1. Gas estimation (simulation)
2. Final send
3. Potentially retry on fee bump

**Solution:** Delegate signing to a temporary session key after one-time owner authorization.

---

## How It Works

### Phase 1: Authorization (One-time, ~2 minutes)
User clicks **"Authorize Session"** button:
1. Frontend generates a new ECDSA keypair (private key stored locally in sessionStorage)
2. Frontend creates a UserOp that calls `Account.createSessionKey(publicKeyHash, duration)`
3. User signs this UserOp with MetaMask (**1 signature**)
4. UserOp is sent to bundler and mined on-chain
5. Smart Account now recognizes the public key as a valid signer
6. Session is active! ✅

### Phase 2: Frictionless Actions (Subsequent trades, no signatures)
User clicks **"Long" / "Short" / "Close"**:
1. Frontend generates the UserOp normally (same logic as before)
2. **Instead of asking MetaMask to sign**, frontend uses the stored session key private key to sign
3. Signature is computed **client-side** (no HTTP request, instant)
4. UserOp is sent to bundler and mined on-chain
5. EntryPoint calls `Account.validateUserOp()`, which checks:
   - Is signature from owner? NO (it's from session key)
   - Is it a valid session key? YES (stored from Phase 1)
   - Is it expired? NO
   - → **Valid! Execute the UserOp**

### Phase 3: Logout (Revoke session)
User clicks **"Revoke Session"** or session expires:
1. Frontend clears sessionStorage
2. Optionally, user can send a UserOp to revoke on-chain (emergency)
3. Session key is no longer valid

---

## Code Integration

### 1. hooks/useSessionKey.ts
Manages session key lifecycle:
```typescript
const {
  sessionKey,          // SessionKeyData | null
  isSessionActive,     // boolean
  createSession,       // () => Promise<void>
  signWithSession,     // (hash) => Promise<Hex>
  revokeSession,       // () => void
} = useSessionKey();
```

### 2. lib/userop/session-key.ts
Low-level cryptography:
- `generateSessionKey()` → SessionKeyData
- `signUserOpWithSessionKey(hash, sessionKey)` → Signature
- `isSessionKeyValid(sessionKey)` → boolean

### 3. lib/userop/create-session-key-userop.ts
Creates the authorization UserOp:
- `createSessionKeyUserOp(params)` → opHash for bundler
- Requires one MetaMask signature
- Mined on-chain to register public key

### 4. Smart Contract (Account.sol)
- `createSessionKey(publicKeyHash, duration)` - register session
- `validateUserOp()` - accept owner OR valid session key

---

## UI Flow

```
┌─────────────────────────────────────┐
│    Agent Console                    │
│  ┌────────────────────────────────┐ │
│  │ 🔓 Session: INACTIVE           │ │
│  │ [Authorize Session] [Details]  │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │ Prompt: "You have 3 USDC"      │ │
│  │ [Long] [Short] [Close] [Auto]  │ │
│  │ (disabled - session required)   │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
     ↓ User clicks [Authorize Session]
┌─────────────────────────────────────┐
│ MetaMask Popup #1 (Sign UserOp)     │
│ "Create Session Key"                │
│ [Reject] [Confirm]                  │
└─────────────────────────────────────┘
     ↓ Confirmed → Bundler mines
┌─────────────────────────────────────┐
│    Agent Console                    │
│  ┌────────────────────────────────┐ │
│  │ ✅ Session: ACTIVE (7d)         │ │
│  │ [Details] [Revoke Session]      │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │ Prompt: "You have 3 USDC"      │ │
│  │ [Long] [Short] [Close] [Auto]  │ │
│  │ (now enabled - click freely!)   │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
     ↓ User clicks [Long] → Instant sign, no MetaMask!
┌─────────────────────────────────────┐
│ UserOp Submitted (no signature popup) │
│ Status: PENDING → INCLUDED (4s poll)  │
│ Tx: 0x6eef8d8... Block: 251917764    │
└─────────────────────────────────────┘
```

---

## Timeline

**Friday (Today):**
- ✅ Session key contracts (Account.sol) - DONE
- ✅ Session key crypto library (session-key.ts) - DONE
- ✅ useSessionKey hook - DONE
- ✅ Commit + push to private repo
- [ ] Prepare UI integration design

**Saturday Morning:**
- [ ] Add "Authorize Session" button to agent-console.tsx
- [ ] Wire up `createSession()` to create and send Session Key Registration UserOp
- [ ] Modify `executeTrade()` to use session key signature if available
- [ ] Add session status badge + revoke button
- [ ] Test end-to-end: 1 MetaMask pop-up → 3 frictionless trades
- [ ] Polish + demo

---

## Testing Checklist

- [ ] Create session key (1 MetaMask signature)
- [ ] LocalStorage persists session across refresh
- [ ] Trade with session key (no MetaMask pop-ups)
- [ ] Signature verification passes in smart contract
- [ ] UserOp mined + block explorer shows success
- [ ] Multiple consecutive trades work (nonce auto-increments)
- [ ] Revoke session (clear storage, no more trades)
- [ ] Session expiration (can't use after 7 days)

---

## Security Notes

⚠️ **Session Key Private Key Storage:**
- Currently: sessionStorage (cleared on tab close)
- For production: Encrypt with user password, or use IndexedDB with encryption
- **Never** send to backend or expose in logs

⚠️ **Signature Validation:**
- Smart Account must validate session key signature correctly
- Use ECDSA recovery to verify public key matches session key hash
- Check expiration on-chain

---

## Next Steps

1. Deploy updated Account.sol (with session key support)
2. Update account address in .env
3. Integrate UI: agent-console.tsx
4. Test E2E
5. Record demo video (1 auth, 3 trades, no signatures)
6. Commit to Aleph-2026 repo
