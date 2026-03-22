import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import {
  generateSessionKey,
  signUserOpWithSessionKey,
  isSessionKeyValid,
  serializeSessionKey,
  deserializeSessionKey,
  type SessionKeyData,
} from "@/lib/userop/session-key";
import { createSessionKeyUserOp } from "@/lib/userop/create-session-key-userop";
import { getBundlerRpcRequest } from "@/lib/userop/bundler-rpc";

const SESSION_KEY_STORAGE_KEY_PREFIX = "aleph_session_key";

type UserOpReceipt = {
  success: boolean;
  receipt?: {
    transactionHash?: `0x${string}`;
    blockNumber?: `0x${string}`;
  };
};

interface UseSessionKeyReturn {
  sessionKey: SessionKeyData | null;
  isSessionActive: boolean;
  isLoading: boolean;
  error: string | null;
  sessionOpHash: string | null;

  // Actions
  createSession: (contracts: { entryPoint: string; factory: string; paymaster: string; smartAccount: string }, expirationDays?: number) => Promise<void>;
  revokeSession: () => void;
  signWithSession: (userOpHash: `0x${string}`) => Promise<`0x${string}`>;
  loadSessionFromStorage: () => void;
}

/**
 * React Hook: Manage session key lifecycle
 * - Load from sessionStorage on mount
 * - Create new session (requires owner signature via UserOp)
 * - Sign UserOps without additional prompts
 * - Revoke on logout or expiration
 */
export function useSessionKey(): UseSessionKeyReturn {
  const [sessionKey, setSessionKey] = useState<SessionKeyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionOpHash, setSessionOpHash] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const connectedChainId = useChainId();

  const getStorageKey = useCallback(() => {
    if (!address) {
      return null;
    }

    const chainId = Number(connectedChainId ?? publicClient?.chain?.id ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113);
    return `${SESSION_KEY_STORAGE_KEY_PREFIX}:${chainId}:${address.toLowerCase()}`;
  }, [address, connectedChainId, publicClient]);

  const waitForUserOpReceipt = useCallback(
    async (opHash: `0x${string}`, timeoutMs: number = 120_000): Promise<UserOpReceipt> => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      const rpcRequest = getBundlerRpcRequest({
        publicClient,
        chainId: publicClient.chain?.id,
      });

      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const receipt = await rpcRequest<UserOpReceipt | null>({
          method: "eth_getUserOperationReceipt",
          params: [opHash],
        });

        if (receipt?.receipt?.transactionHash) {
          return receipt;
        }

        await new Promise((resolve) => setTimeout(resolve, 4_000));
      }

      throw new Error("Session key registration is still pending. Wait a bit and retry.");
    },
    [publicClient]
  );

  const loadSessionFromStorage = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      if (!storageKey) {
        setSessionKey(null);
        setError(null);
        return;
      }

      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const key = deserializeSessionKey(stored);
        if (isSessionKeyValid(key)) {
          setSessionKey(key);
          setError(null);
        } else {
          // Expired, remove from storage
          sessionStorage.removeItem(storageKey);
          setSessionKey(null);
        }
      } else {
        // No session for this account/chain
        setSessionKey(null);
        setError(null);
      }
    } catch (e) {
      setError(`Failed to load session: ${String(e)}`);
    }
  }, [getStorageKey]);

  // Load session from storage whenever account/chain changes
  useEffect(() => {
    loadSessionFromStorage();
  }, [loadSessionFromStorage]);

  const createSession = useCallback(async (
    contracts: { entryPoint: string; factory: string; paymaster: string; smartAccount: string },
    expirationDays: number = 7
  ) => {
    setIsLoading(true);
    setError(null);
    setSessionOpHash(null);

    try {
      if (!publicClient || !walletClient) {
        throw new Error("Wallet not connected");
      }

      // 1. Generate session key pair locally
      const expirationDuration = expirationDays * 24 * 60 * 60;
      const sessionChainId = Number(publicClient.chain?.id ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113);
      const newSessionKey = await generateSessionKey(expirationDuration, sessionChainId);

      // 2. Send one-time registration UserOp (1 MetaMask prompt, owner signs)
      const opHash = await createSessionKeyUserOp({
        publicClient,
        walletClient,
        config: contracts,
        sessionKeyPublicKeyHash: newSessionKey.publicKeyHash as `0x${string}`,
        expirationDays,
      });

      setSessionOpHash(opHash);

      // 3. Wait until registration UserOp is included and successful
      const receipt = await waitForUserOpReceipt(opHash as `0x${string}`);
      if (!receipt.success) {
        throw new Error("Session key registration UserOp was included but failed");
      }

      // 4. Store locally only after on-chain confirmation
      const storageKey = getStorageKey();
      if (!storageKey) {
        throw new Error("Wallet address unavailable while storing session key");
      }
      sessionStorage.setItem(storageKey, serializeSessionKey(newSessionKey));
      setSessionKey(newSessionKey);
      setError(null);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(`Failed to create session: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, walletClient, waitForUserOpReceipt, getStorageKey]);

  const revokeSession = useCallback(() => {
    const storageKey = getStorageKey();
    if (storageKey) {
      sessionStorage.removeItem(storageKey);
    }
    setSessionKey(null);
    setError(null);
  }, [getStorageKey]);

  const signWithSession = useCallback(
    async (userOpHash: `0x${string}`): Promise<`0x${string}`> => {
      if (!sessionKey) {
        throw new Error("No active session key");
      }

      if (!isSessionKeyValid(sessionKey)) {
        revokeSession();
        throw new Error("Session key has expired");
      }

      try {
        const signature = await signUserOpWithSessionKey(userOpHash, sessionKey);
        return signature;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to sign with session key: ${errorMsg}`);
      }
    },
    [sessionKey, revokeSession]
  );

  return {
    sessionKey,
    isSessionActive: !!sessionKey && isSessionKeyValid(sessionKey),
    isLoading,
    error,
    sessionOpHash,
    createSession,
    revokeSession,
    signWithSession,
    loadSessionFromStorage,
  };
}
