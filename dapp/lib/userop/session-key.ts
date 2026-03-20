import { hexToBytes, keccak256, recoverMessageAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113);

/**
 * Session Key: A delegated ECDSA key that can sign UserOps
 * without requiring MetaMask prompts after one-time authorization.
 */
export interface SessionKeyData {
  privateKey: Hex;        // Secret, stored locally only
  publicKey: Hex;         // Can be shared
  publicKeyHash: Hex;     // keccak256(abi.encodePacked(session signer address)), stored on-chain
  expiresAt: number;      // Unix timestamp
  chainId: number;
}

/**
 * Generate a new session key pair using viem/accounts.
 */
export async function generateSessionKey(
  expirationDuration: number = 7 * 24 * 60 * 60, // Default 7 days
  chainId: number = DEFAULT_CHAIN_ID
): Promise<SessionKeyData> {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const publicKey = account.publicKey as Hex;
  const publicKeyHash = keccak256(account.address);
  const expiresAt = Math.floor(Date.now() / 1000) + expirationDuration;

  return {
    privateKey,
    publicKey,
    publicKeyHash,
    expiresAt,
    chainId,
  };
}

/**
 * Sign a UserOp hash using a session key (no MetaMask required).
 * @param userOpHash The packed UserOp hash (as Hex)
 * @param sessionKey The session key data
 * @returns Signature bytes
 */
export async function signUserOpWithSessionKey(
  userOpHash: Hex,
  sessionKey: SessionKeyData
): Promise<Hex> {
  if (sessionKey.expiresAt < Math.floor(Date.now() / 1000)) {
    throw new Error("Session key has expired");
  }

  const account = privateKeyToAccount(sessionKey.privateKey);
  return account.signMessage({
    message: { raw: hexToBytes(userOpHash) },
  });
}

/**
 * Verify a session key signature (for debugging / validation).
 * Returns true if the signature was created with the session key.
 */
export async function verifySessionKeySignature(
  userOpHash: Hex,
  signature: Hex,
  sessionKey: SessionKeyData
): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({
      message: { raw: hexToBytes(userOpHash) },
      signature,
    });

    const expectedAddress = privateKeyToAccount(sessionKey.privateKey).address;
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Serialize session key for storage.
 * WARNING: Never expose the private key to servers or logs.
 */
export function serializeSessionKey(sessionKey: SessionKeyData): string {
  return JSON.stringify({
    privateKey: sessionKey.privateKey,
    publicKey: sessionKey.publicKey,
    publicKeyHash: sessionKey.publicKeyHash,
    expiresAt: sessionKey.expiresAt,
    chainId: sessionKey.chainId,
  });
}

/**
 * Deserialize session key from storage.
 */
export function deserializeSessionKey(serialized: string): SessionKeyData {
  const data = JSON.parse(serialized);
  return {
    privateKey: data.privateKey as Hex,
    publicKey: data.publicKey as Hex,
    publicKeyHash: data.publicKeyHash as Hex,
    expiresAt: data.expiresAt as number,
    chainId: data.chainId as number,
  };
}

/**
 * Check if a session key is still valid (not expired).
 */
export function isSessionKeyValid(sessionKey: SessionKeyData): boolean {
  return sessionKey.expiresAt > Math.floor(Date.now() / 1000);
}
