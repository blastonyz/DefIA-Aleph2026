import type { PublicClient } from "viem";

type RpcRequest = <T>(args: { method: string; params?: unknown[] }) => Promise<T>;

function getBundlerUrl(chainId: number | undefined): string | undefined {
  if (chainId === 43113) {
    return process.env.NEXT_PUBLIC_BUNDLER_RPC_URL_FUJI ?? process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
  }

  if (chainId === 421614) {
    return process.env.NEXT_PUBLIC_BUNDLER_RPC_URL_ARBITRUM ?? process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
  }

  return process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
}

function sanitizeBundlerUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/replace-with/i.test(trimmed)) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}

function isAaMethod(method: string): boolean {
  return method === "eth_sendUserOperation" || method === "eth_getUserOperationReceipt" || method.startsWith("rundler_");
}

export function isAaUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Account Abstractions methods are not enabled|Method not found|Unsupported method|does not exist/i.test(error.message);
}

function createHttpRpcRequest(url: string): RpcRequest {
  return async <T>({ method, params = [] }: { method: string; params?: unknown[] }) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });

    const bodyText = await response.text();
    let payload: { result?: T; error?: { code?: number; message?: string } } | null = null;

    try {
      payload = JSON.parse(bodyText) as { result?: T; error?: { code?: number; message?: string } };
    } catch {
      const bodyPreview = bodyText.slice(0, 180).replace(/\s+/g, " ");
      throw new Error(
        `RPC ${method} returned non-JSON (${response.status}) from ${url}: ${bodyPreview}`
      );
    }

    if (!response.ok || payload.error) {
      const details = payload.error?.message ?? response.statusText;
      throw new Error(`RPC ${method} failed (${response.status}) at ${url}: ${details}`);
    }

    return payload.result as T;
  };
}

export function getBundlerRpcRequest(params: {
  publicClient: PublicClient;
  chainId?: number;
}): RpcRequest {
  const { publicClient, chainId } = params;
  const fallbackRequest = publicClient.request as unknown as RpcRequest;

  const effectiveChainId = chainId ?? publicClient.chain?.id;
  const bundlerUrl = sanitizeBundlerUrl(getBundlerUrl(effectiveChainId));
  if (!bundlerUrl) {
    return async <T>(args: { method: string; params?: unknown[] }) => {
      if (isAaMethod(args.method)) {
        if (effectiveChainId === 43113) {
          throw new Error(
            "Missing/invalid NEXT_PUBLIC_BUNDLER_RPC_URL_FUJI. Set a valid EIP-4337 Bundler RPC URL for Fuji."
          );
        }
        throw new Error(
          "Missing/invalid bundler RPC URL. Set NEXT_PUBLIC_BUNDLER_RPC_URL (or network-specific variable)."
        );
      }

      return await fallbackRequest<T>(args);
    };
  }

  const bundlerRequest = createHttpRpcRequest(bundlerUrl);

  return async <T>(args: { method: string; params?: unknown[] }) => {
    try {
      return await bundlerRequest<T>(args);
    } catch (error) {
      if (!isAaMethod(args.method)) {
        return await fallbackRequest<T>(args);
      }

      throw error;
    }
  };
}
