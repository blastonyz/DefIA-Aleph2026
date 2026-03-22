"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAa, type TradeAction } from "@/contexts/aa-context";
import { usePublicClient, useWalletClient } from "wagmi";
import { arbitrumSepolia, avalanche, avalancheFuji } from "wagmi/chains";
import {
  decodeAbiParameters,
  decodeErrorResult,
  decodeEventLog,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  keccak256,
  parseEther,
  parseUnits,
  stringToHex,
  type Hex,
  zeroAddress,
} from "viem";
import { executeTradeUserOp } from "@/lib/userop/execute-trade";
import { getBundlerRpcRequest } from "@/lib/userop/bundler-rpc";
import { useSessionKey } from "@/hooks/useSessionKey";
import { OhlcChart } from "@/components/landing/ohlc-chart";
import GMXPositionExecutorArtifact from "@/lib/contracts/GMXPositionExecutor.json";
import {
  getMoltbotReportConfigIssues,
  type MoltbotReportConfigInput,
} from "@/lib/userop/encoding";

type UserOpStatus = "idle" | "pending" | "included" | "failed";

type UserOpReceipt = {
  userOpHash: Hex;
  sender: Hex;
  nonce: Hex;
  actualGasCost: Hex;
  actualGasUsed: Hex;
  success?: boolean | Hex | number | string;
  reason?: Hex;
  logs: unknown[];
  receipt: {
    transactionHash: Hex;
    blockNumber: Hex;
    status?: Hex | number | string;
  };
};

type GmxTradeData = {
  action: number;
  metadataHash: Hex;
  reportHash: Hex;
  executionCount: string;
};

type RecentExecutorExecution = {
  action: number;
  orderKey: Hex;
  sizeDeltaUsd: bigint;
  isLong: boolean;
  txHash: Hex;
  blockNumber: bigint;
};

type ExecutorHealth = {
  nativeBalance: bigint;
  collateralTokenAddress: Hex | null;
  collateralTokenSymbol: string | null;
  collateralTokenDecimals: number;
  collateralBalance: bigint | null;
  routerSpender: Hex | null;
  tokenAllowance: bigint | null;
  executionFee: bigint | null;
  forwarder: Hex | null;
  recentExecution: RecentExecutorExecution | null;
};

type GmxPreset = {
  id: string;
  label: string;
  description: string;
  config: MoltbotReportConfigInput;
};

const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113);
const DEFAULT_GMX_COLLATERAL_AMOUNT = "1000000";
const DEFAULT_GMX_SIZE_DELTA_USD = "100000000000000000000";
const DEFAULT_GMX_TRIGGER_PRICE = "0";
const DEFAULT_GMX_ACCEPTABLE_PRICE = "100000000000000000000";
const FUJI_WETH_USDC_PRESET: GmxPreset = {
  id: "fuji-wavax-usdc",
  label: "Fuji WAVAX/USDC",
  description: "Official GMX preset for Fuji with WAVAX/USDC market.",
  config: {
    market: "0xbf338a6C595f06B7Cfff2FA8c958d49201466374",
    collateralToken: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    collateralAmount: DEFAULT_GMX_COLLATERAL_AMOUNT,
    sizeDeltaUsd: DEFAULT_GMX_SIZE_DELTA_USD,
    triggerPrice: DEFAULT_GMX_TRIGGER_PRICE,
    acceptablePrice: DEFAULT_GMX_ACCEPTABLE_PRICE,
  },
};
const POSITION_REPORT_RECORDED_TOPIC = keccak256(
  stringToHex("PositionReportRecorded(uint8,bytes32,bytes32,uint256)")
);
const DIRECT_EXECUTION_CONSUMED_TOPIC = keccak256(
  stringToHex("DirectExecutionConsumed(uint8,bytes32,uint256,bool)")
);
const EXECUTOR_REASON_BY_SELECTOR: Record<string, string> = {
  "0xddef582c": "InvalidForwarder",
  "0xb0618435": "InvalidForwarder", // legacy v1 selector (2-arg)
  "0x55f9dbeb": "InvalidAction",
  "0xa3a89de5": "InvalidOrderVault",
  "0x0e5b47e8": "InvalidExecutionFee",
  "0xe4c98bfe": "InvalidMarket",
  "0x5a545152": "InvalidCollateralToken",
};
const EXECUTOR_TOP_UP_AMOUNT = parseEther("0.03");
const EXECUTOR_COLLATERAL_TOP_UP_AMOUNT = "1";
const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const warmPrimaryButtonClass =
  "rounded-full font-bold text-sm tracking-wide bg-gradient-to-br from-[#a43700] to-[#cd4700] text-white shadow-lg shadow-[#a43700]/20 active:scale-[0.98] transition-all border-0 hover:opacity-90 disabled:opacity-50";

const warmSecondaryButtonClass =
  "rounded-full font-bold text-sm tracking-wide bg-[#fdcdbc] text-[#795548] active:scale-[0.98] transition-all border-0 hover:opacity-90 disabled:opacity-50";

function getTxExplorerBase(chainId: number | undefined): string {
  if (chainId === arbitrumSepolia.id) {
    return `${arbitrumSepolia.blockExplorers.default.url}/tx/`;
  }
  if (chainId === avalanche.id) {
    return `${avalanche.blockExplorers.default.url}/tx/`;
  }
  return `${avalancheFuji.blockExplorers.default.url}/tx/`;
}

function getUserOpExplorerBase(chainId: number | undefined): string {
  const base =
    chainId === avalancheFuji.id
      ? process.env.NEXT_PUBLIC_USEROP_EXPLORER_BASE_FUJI
      : chainId === arbitrumSepolia.id
        ? process.env.NEXT_PUBLIC_USEROP_EXPLORER_BASE_ARBITRUM
        : undefined;

  const resolved = (base ?? process.env.NEXT_PUBLIC_USEROP_EXPLORER_BASE ?? "https://jiffyscan.xyz/userOpHash/").trim();
  return resolved.endsWith("/") ? resolved : `${resolved}/`;
}

function isTruthyExecutionFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1" || normalized === "0x1") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "0x0") {
      return false;
    }
  }

  return undefined;
}

function didUserOpSucceed(receipt: UserOpReceipt): boolean {
  const successFromField = isTruthyExecutionFlag(receipt.success);
  if (typeof successFromField === "boolean") {
    return successFromField;
  }

  const successFromStatus = isTruthyExecutionFlag(receipt.receipt?.status);
  if (typeof successFromStatus === "boolean") {
    return successFromStatus;
  }

  return false;
}

function decodeReceiptReason(reason: unknown): string | null {
  if (typeof reason !== "string" || !reason.startsWith("0x") || reason.length < 10) {
    return null;
  }

  const selector = reason.slice(0, 10).toLowerCase();
  const legacyReason = EXECUTOR_REASON_BY_SELECTOR[selector];
  if (legacyReason) {
    return legacyReason;
  }

  try {
    const decoded = decodeErrorResult({
      abi: GMXPositionExecutorArtifact.abi,
      data: reason as Hex,
    });

    if (decoded.errorName === "InvalidForwarder" && Array.isArray(decoded.args)) {
      const sender = String(decoded.args[0]);
      const extra = decoded.args.length >= 2 ? ` expectedForwarder=${String(decoded.args[1])}` : " (not in allowlist)";
      return `InvalidForwarder: sender=${sender}${extra}`;
    }

    return `${decoded.errorName}${Array.isArray(decoded.args) ? ` args=${JSON.stringify(decoded.args)}` : ""}`;
  } catch {
    return null;
  }
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const errorWithExtras = error as Error & {
      cause?: unknown;
      details?: unknown;
      data?: unknown;
      code?: unknown;
      shortMessage?: unknown;
      metaMessages?: unknown;
    };

    const payload = {
      name: errorWithExtras.name,
      message: errorWithExtras.message,
      shortMessage:
        typeof errorWithExtras.shortMessage === "string"
          ? errorWithExtras.shortMessage
          : undefined,
      code: errorWithExtras.code,
      details: errorWithExtras.details,
      data: errorWithExtras.data,
      cause: errorWithExtras.cause,
      metaMessages: Array.isArray(errorWithExtras.metaMessages)
        ? errorWithExtras.metaMessages
        : undefined,
      stack: errorWithExtras.stack,
    };

    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return `${errorWithExtras.name}: ${errorWithExtras.message}`;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return `Unknown error`;
  }
}

function buildInitialGmxConfig(chainId: number | undefined): MoltbotReportConfigInput {
  if (chainId === avalancheFuji.id) {
    return { ...FUJI_WETH_USDC_PRESET.config };
  }

  return {
    market: "",
    collateralToken: "",
    collateralAmount: DEFAULT_GMX_COLLATERAL_AMOUNT,
    sizeDeltaUsd: DEFAULT_GMX_SIZE_DELTA_USD,
    triggerPrice: DEFAULT_GMX_TRIGGER_PRICE,
    acceptablePrice: DEFAULT_GMX_ACCEPTABLE_PRICE,
  };
}

function formatTokenAmount(value: bigint | null, decimals: number): string {
  if (value === null) {
    return "N/A";
  }
  return formatUnits(value, decimals);
}

function formatShortHash(value: Hex | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function describeAction(action: number): string {
  if (action === 0) return "LONG";
  if (action === 1) return "SHORT";
  if (action === 2) return "CLOSE";
  return `UNKNOWN(${action})`;
}

function extractExecutionFee(orderConfig: unknown): bigint | null {
  if (Array.isArray(orderConfig) && orderConfig.length > 4) {
    return BigInt(orderConfig[4] as bigint | number | string);
  }

  if (orderConfig && typeof orderConfig === "object" && "executionFee" in orderConfig) {
    const executionFee = (orderConfig as { executionFee?: bigint | number | string }).executionFee;
    if (executionFee !== undefined) {
      return BigInt(executionFee);
    }
  }

  return null;
}

async function readExecutorState(params: {
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>;
  executorAddress: Hex;
}): Promise<{ forwarder: Hex | null; orderConfig: unknown; flavor: "current" }> {
  const { publicClient, executorAddress } = params;

  const orderConfig = await publicClient.readContract({
    address: executorAddress,
    abi: GMXPositionExecutorArtifact.abi,
    functionName: "orderConfig",
  });

  return { forwarder: null, orderConfig, flavor: "current" };
}

function pickActionFromAgentText(text: string): TradeAction | null {
  const normalized = text.toLowerCase();

  if (/\bclose\b|\bcierre\b/.test(normalized)) {
    return "close";
  }
  if (/\bshort\b/.test(normalized)) {
    return "short";
  }
  if (/\blong\b|\bbuy\b/.test(normalized)) {
    return "long";
  }

  return null;
}

export function AgentConsole() {
  const {
    address,
    chainId: connectedChainId,
    isConnected,
    isSupportedChain,
    selectedAction,
    actionSource,
    agentReasoning,
    setManualAction,
    setAutoAction,
    contracts,
  } = useAa();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { isSessionActive, signWithSession, createSession, revokeSession, isLoading: isSessionLoading, error: sessionError, sessionOpHash } = useSessionKey();
  const [isMounted, setIsMounted] = useState(false);
  const [prompt, setPrompt] = useState("Give me a conservative yield strategy on Avalanche to start today.");
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState(String(DEFAULT_CHAIN_ID));
  const [response, setResponse] = useState("");
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");
  const [executionError, setExecutionError] = useState("");
  const [lastUserOpHash, setLastUserOpHash] = useState("");
  const [executionTxHash, setExecutionTxHash] = useState("");
  const [executionBlockNumber, setExecutionBlockNumber] = useState("");
  const [gmxTradeData, setGmxTradeData] = useState<GmxTradeData | null>(null);
  const [userOpStatus, setUserOpStatus] = useState<UserOpStatus>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executorHealth, setExecutorHealth] = useState<ExecutorHealth | null>(null);
  const [executorHealthError, setExecutorHealthError] = useState("");
  const [isExecutorHealthLoading, setIsExecutorHealthLoading] = useState(false);
  const [isFundingExecutor, setIsFundingExecutor] = useState(false);
  const [isFundingCollateral, setIsFundingCollateral] = useState(false);
  const [executorFundingTxHash, setExecutorFundingTxHash] = useState("");
  const [executorCollateralFundingTxHash, setExecutorCollateralFundingTxHash] = useState("");
  const [gmxConfig, setGmxConfig] = useState<MoltbotReportConfigInput>(() => buildInitialGmxConfig(DEFAULT_CHAIN_ID));
  const rpcRequest = useMemo(() => {
    if (!publicClient) {
      return undefined;
    }

    return getBundlerRpcRequest({
      publicClient,
      chainId: connectedChainId ?? DEFAULT_CHAIN_ID,
    }) as <T>(args: { method: string; params?: unknown[] }) => Promise<T>;
  }, [publicClient, connectedChainId]);

  useEffect(() => {
    if (!lastUserOpHash || !rpcRequest) {
      return;
    }

    let isCancelled = false;
    setUserOpStatus("pending");

    const poll = async () => {
      try {
        const receipt = (await rpcRequest<UserOpReceipt | null>({
          method: "eth_getUserOperationReceipt",
          params: [lastUserOpHash as Hex],
        }));

        if (isCancelled) {
          return;
        }

        if (receipt?.receipt?.transactionHash) {
          setExecutionTxHash(receipt.receipt.transactionHash);
          setExecutionBlockNumber(BigInt(receipt.receipt.blockNumber).toString());

          const logs = Array.isArray(receipt.logs) ? receipt.logs : [];
          for (const rawLog of logs) {
            if (!rawLog || typeof rawLog !== "object") {
              continue;
            }

            const maybeLog = rawLog as { topics?: unknown; data?: unknown };
            if (!Array.isArray(maybeLog.topics) || typeof maybeLog.data !== "string") {
              continue;
            }

            try {
              const topics = maybeLog.topics as Hex[];
              if (topics.length < 4) {
                continue;
              }

              if (topics[0].toLowerCase() !== POSITION_REPORT_RECORDED_TOPIC.toLowerCase()) {
                continue;
              }

              const executionCount = decodeAbiParameters([{ type: "uint256" }], maybeLog.data as Hex)[0];

              setGmxTradeData({
                action: Number(BigInt(topics[1])),
                metadataHash: topics[2],
                reportHash: topics[3],
                executionCount: executionCount.toString(),
              });
            } catch {
              continue;
            }
          }

          const succeeded = didUserOpSucceed(receipt);
          setUserOpStatus(succeeded ? "included" : "failed");
          if (succeeded) {
            setExecutionError("");
            void loadExecutorHealth({ silent: true });
          } else {
            const decodedReason = decodeReceiptReason(receipt.reason);
            setExecutionError(
              `${decodedReason ? `${decodedReason}\n\n` : ""}La UserOperation fue incluida pero falló en ejecución.\n\nReceipt:\n${JSON.stringify(receipt, null, 2)}`
            );
          }
          return;
        }

        setTimeout(poll, 4000);
      } catch (pollError) {
        if (isCancelled) {
          return;
        }

        setUserOpStatus("failed");
        setExecutionError(formatUnknownError(pollError));
      }
    };

    poll();

    return () => {
      isCancelled = true;
    };
  }, [lastUserOpHash, rpcRequest]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (address) {
      setWalletAddress(address);
    }
  }, [address]);

  useEffect(() => {
    if (connectedChainId) {
      setChainId(String(connectedChainId));
    }
  }, [connectedChainId]);

  useEffect(() => {
    if (!connectedChainId) {
      return;
    }

    setGmxConfig((current) => {
      const hasCustomValues = Object.values(current).some((value) => Boolean(value?.trim()));
      if (hasCustomValues) {
        return current;
      }

      return buildInitialGmxConfig(connectedChainId);
    });
  }, [connectedChainId]);

  const gmxConfigIssues = useMemo(
    () => getMoltbotReportConfigIssues(publicClient?.chain?.id, selectedAction, gmxConfig),
    [publicClient, selectedAction, gmxConfig]
  );

  const selectedCollateralTokenAddress = useMemo(() => {
    const configured = gmxConfig.collateralToken?.trim();
    if (configured && isAddress(configured)) {
      return getAddress(configured);
    }

    return null;
  }, [connectedChainId, gmxConfig.collateralToken]);

  const applyGmxPreset = (preset: GmxPreset) => {
    setGmxConfig({ ...preset.config });
  };

  const updateGmxConfigField = (field: keyof MoltbotReportConfigInput, value: string) => {
    setGmxConfig((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const loadExecutorHealth = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!publicClient || !contracts.executor || contracts.executor.toLowerCase() === zeroAddress) {
      setExecutorHealth(null);
      return null;
    }

    if (!silent) {
      setIsExecutorHealthLoading(true);
      setExecutorHealthError("");
    }

    try {
      const executorAddress = contracts.executor as Hex;
      const collateralTokenAddress = selectedCollateralTokenAddress;

      const [nativeBalance, routerSpender, executorState] = await Promise.all([
        publicClient.getBalance({ address: executorAddress }),
        publicClient.readContract({
          address: executorAddress,
          abi: GMXPositionExecutorArtifact.abi,
          functionName: "gmxRouterSpender",
        }) as Promise<Hex>,
        readExecutorState({ publicClient, executorAddress }),
      ]);

      let collateralTokenSymbol: string | null = null;
      let collateralTokenDecimals = 18;
      let collateralBalance: bigint | null = null;
      let tokenAllowance: bigint | null = null;

      if (collateralTokenAddress) {
        const [symbol, decimals, balance, allowance] = await Promise.all([
          publicClient.readContract({
            address: collateralTokenAddress,
            abi: ERC20_ABI,
            functionName: "symbol",
          }) as Promise<string>,
          publicClient.readContract({
            address: collateralTokenAddress,
            abi: ERC20_ABI,
            functionName: "decimals",
          }) as Promise<number>,
          publicClient.readContract({
            address: collateralTokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [executorAddress],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: collateralTokenAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [executorAddress, routerSpender],
          }) as Promise<bigint>,
        ]);

        collateralTokenSymbol = symbol;
        collateralTokenDecimals = decimals;
        collateralBalance = balance;
        tokenAllowance = allowance;
      }

      const recentExecution: RecentExecutorExecution | null = null;

      const nextHealth: ExecutorHealth = {
        nativeBalance,
        collateralTokenAddress,
        collateralTokenSymbol,
        collateralTokenDecimals,
        collateralBalance,
        routerSpender,
        tokenAllowance,
        executionFee: extractExecutionFee(executorState.orderConfig),
        forwarder: executorState.forwarder,
        recentExecution,
      };

      setExecutorHealth(nextHealth);
      return nextHealth;
    } catch (loadError) {
      if (!silent) {
        setExecutorHealthError(formatUnknownError(loadError));
      }
      setExecutorHealth(null);
      return null;
    } finally {
      if (!silent) {
        setIsExecutorHealthLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadExecutorHealth();
  }, [publicClient, contracts.executor, connectedChainId, selectedCollateralTokenAddress]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadExecutorHealth({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [publicClient, contracts.executor, connectedChainId, selectedCollateralTokenAddress]);

  const fundExecutor = async () => {
    if (!walletClient || !publicClient || !address) {
      setExecutorHealthError("Wallet client not available to fund the executor.");
      return;
    }

    setIsFundingExecutor(true);
    setExecutorHealthError("");
    setExecutorFundingTxHash("");

    try {
      const txHash = await walletClient.sendTransaction({
        account: address as Hex,
        to: contracts.executor as Hex,
        value: EXECUTOR_TOP_UP_AMOUNT,
      });

      setExecutorFundingTxHash(txHash);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await loadExecutorHealth();
    } catch (fundError) {
      setExecutorHealthError(formatUnknownError(fundError));
    } finally {
      setIsFundingExecutor(false);
    }
  };

  const fundExecutorCollateral = async () => {
    if (!walletClient || !publicClient || !address) {
      setExecutorHealthError("Wallet client not available to fund collateral.");
      return;
    }

    if (!executorHealth?.collateralTokenAddress) {
      setExecutorHealthError("No collateral token configured for funding.");
      return;
    }

    if (!contracts.executor || contracts.executor.toLowerCase() === zeroAddress) {
      setExecutorHealthError("Executor no configurado.");
      return;
    }

    setIsFundingCollateral(true);
    setExecutorHealthError("");
    setExecutorCollateralFundingTxHash("");

    try {
      const amount = parseUnits(EXECUTOR_COLLATERAL_TOP_UP_AMOUNT, executorHealth.collateralTokenDecimals);

      const txHash = connectedChainId === avalancheFuji.id
        ? await walletClient.writeContract({
            account: address as Hex,
            address: executorHealth.collateralTokenAddress,
            abi: ERC20_ABI,
            functionName: "mint",
            args: [contracts.executor as Hex, amount],
          })
        : await walletClient.writeContract({
            account: address as Hex,
            address: executorHealth.collateralTokenAddress,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [contracts.executor as Hex, amount],
          });

      setExecutorCollateralFundingTxHash(txHash);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await loadExecutorHealth();
    } catch (fundError) {
      setExecutorHealthError(formatUnknownError(fundError));
    } finally {
      setIsFundingCollateral(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await fetch("/api/moltbot/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          walletAddress: walletAddress.trim() || undefined,
          chainId: chainId.trim() || undefined,
        }),
      });

      const raw = await result.text();
      let json: { text?: string; provider?: string; error?: string };
      try {
        json = JSON.parse(raw) as { text?: string; provider?: string; error?: string };
      } catch {
        throw new Error(`Respuesta no JSON desde /api/moltbot/chat (${result.status}).`);
      }

      if (!result.ok) {
        throw new Error(json.error ?? "Request failed");
      }
      setResponse(json.text ?? "No response");
      setProvider(json.provider ?? "");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
      setResponse("");
      setProvider("");
    } finally {
      setIsLoading(false);
    }
  };

  const requestAutoAction = async () => {
    setIsAutoLoading(true);
    setError("");

    try {
      const autoPrompt = [
        "You are a trading agent. Choose exactly one action: LONG, SHORT, or CLOSE.",
        "Respond in a single line starting with ACTION: LONG|SHORT|CLOSE and then a brief reason.",
        `User context: ${prompt}`,
      ].join("\n");

      const result = await fetch("/api/moltbot/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: autoPrompt,
          walletAddress: walletAddress.trim() || undefined,
          chainId: chainId.trim() || undefined,
        }),
      });

      const raw = await result.text();
      let json: { text?: string; provider?: string; error?: string };
      try {
        json = JSON.parse(raw) as { text?: string; provider?: string; error?: string };
      } catch {
        throw new Error(`Respuesta no JSON desde /api/moltbot/chat (${result.status}).`);
      }

      if (!result.ok) {
        throw new Error(json.error ?? "Auto request failed");
      }

      const text = json.text ?? "";
      setResponse(text || "No response");
      setProvider(json.provider ?? "");

      const inferred = pickActionFromAgentText(text);
      if (!inferred) {
        throw new Error("No pude inferir LONG/SHORT/CLOSE desde la respuesta del agente.");
      }

      setAutoAction(inferred, text);
      await executeTrade(inferred);
    } catch (autoError) {
      setError(autoError instanceof Error ? autoError.message : "Unknown auto error");
    } finally {
      setIsAutoLoading(false);
    }
  };

  const executeTrade = async (action: TradeAction) => {
    if (userOpStatus === "pending") {
      setExecutionError("There is already a pending UserOperation. Wait for confirmation before sending another.");
      return;
    }

    setExecutionError("");
    setLastUserOpHash("");
    setExecutionTxHash("");
    setExecutionBlockNumber("");
    setGmxTradeData(null);
    setUserOpStatus("idle");

    if (!isConnected) {
      setExecutionError("Connect the wallet before executing an operation.");
      return;
    }

    if (!isSupportedChain) {
      setExecutionError("Switch to the configured network to operate.");
      return;
    }

    if (!publicClient || !walletClient || !address) {
      setExecutionError("Wallet client not available. Reconnect the wallet.");
      return;
    }

    if (!contracts.executor || contracts.executor.toLowerCase() === zeroAddress) {
      setExecutionError("NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR no está configurado.");
      return;
    }

    const configIssues = getMoltbotReportConfigIssues(publicClient.chain?.id, action, gmxConfig);
    if (configIssues.length > 0) {
      setExecutionError(`Configuracion GMX incompleta:\n- ${configIssues.join("\n- ")}`);
      return;
    }

    setIsExecuting(true);
    try {
      const opHash = await executeTradeUserOp({
        action,
        address: address as Hex,
        contracts,
        publicClient,
        walletClient,
        reportConfig: gmxConfig,
        sessionSigner: isSessionActive
          ? async (userOpHash: Hex) => await signWithSession(userOpHash)
          : undefined,
        sessionStrict: isSessionActive,
      });

      setLastUserOpHash(opHash ?? "");
      setUserOpStatus("pending");
    } catch (executeError) {
      setUserOpStatus("failed");
      const fullError = formatUnknownError(executeError);
      if (!(executeError instanceof Error) || !/Missing GMX|Invalid GMX|Configuracion GMX/i.test(executeError.message)) {
        console.error("[executeTradeUserOp] full error", executeError);
      }
      setExecutionError(fullError);
    } finally {
      setIsExecuting(false);
    }
  };

  const onManualAction = async (action: TradeAction) => {
    setManualAction(action);
    await executeTrade(action);
  };

  if (!isMounted) {
    return (
      <section id="agent-console" className="relative overflow-hidden bg-darker-bg py-24 lg:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan/10 blur-[120px]" />
        <div className="relative mx-auto w-full px-6 lg:w-10/12 xl:w-4/5">
          <Card className="border-border/50 bg-dark-bg/80">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-2xl text-foreground md:text-3xl">
                Moltbot Integration Console
              </CardTitle>
              <CardDescription>Loading console...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="agent-console" className="relative overflow-hidden bg-darker-bg py-24 lg:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan/10 blur-[120px]" />

      <div className="relative mx-auto mb-10 w-full px-6 lg:w-10/12 xl:w-4/5">
        <h2 className="mb-4 text-center font-[family-name:var(--font-display)] text-2xl font-bold md:text-3xl">
          <span className="bg-gradient-to-r from-orange-200 via-orange-500 to-orange-700 bg-clip-text text-transparent">
            GMX Trading AI powered
          </span>
        </h2>
        <OhlcChart />
      </div>

        <div className="relative mx-auto w-full px-6 lg:w-10/12 xl:w-4/5">
        <Card className="border-border/50 bg-dark-bg/80">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)] text-2xl text-foreground md:text-3xl">
              Moltbot Integration Console
            </CardTitle>
            <CardDescription>
              Test your dapp connection with Moltbot from this frontend without exposing the token.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="rounded-lg border border-border/50 bg-darker-bg p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Current operation</p>
                <p className="text-sm text-foreground">
                  {selectedAction.toUpperCase()} · {actionSource.toUpperCase()}
                </p>
                {agentReasoning ? (
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{agentReasoning}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Button
                  type="button"
                  variant={selectedAction === "long" ? "default" : "secondary"}
                  className={selectedAction === "long" ? `h-auto py-3 ${warmPrimaryButtonClass}` : `h-auto py-3 ${warmSecondaryButtonClass}`}
                  onClick={() => onManualAction("long")}
                  disabled={isExecuting || isAutoLoading || userOpStatus === "pending"}
                >
                  Long
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "short" ? "default" : "secondary"}
                  className={selectedAction === "short" ? `h-auto py-3 ${warmPrimaryButtonClass}` : `h-auto py-3 ${warmSecondaryButtonClass}`}
                  onClick={() => onManualAction("short")}
                  disabled={isExecuting || isAutoLoading || userOpStatus === "pending"}
                >
                  Short
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "close" ? "default" : "secondary"}
                  className={selectedAction === "close" ? `h-auto py-3 ${warmPrimaryButtonClass}` : `h-auto py-3 ${warmSecondaryButtonClass}`}
                  onClick={() => onManualAction("close")}
                  disabled={isExecuting || isAutoLoading || userOpStatus === "pending"}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`h-auto py-3 ${warmPrimaryButtonClass}`}
                  onClick={requestAutoAction}
                  disabled={isAutoLoading || isExecuting || userOpStatus === "pending"}
                >
                  {isAutoLoading || isExecuting ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      Executing...
                    </span>
                  ) : (
                    "Auto"
                  )}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  placeholder="0x... (optional)"
                />
                <Input
                  value={chainId}
                  onChange={(event) => setChainId(event.target.value)}
                  placeholder="Chain ID"
                />
              </div>

              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Write what you want the agent to do"
                className="min-h-32"
              />

              <Button
                type="submit"
                className={`block w-full md:mx-auto md:w-[20vw] md:min-w-[180px] md:max-w-[280px] ${warmPrimaryButtonClass}`}
                disabled={isLoading || prompt.trim().length === 0}
              >
                {isLoading ? (
                  <span className="inline-flex justify-center items-center gap-2">
                    <Spinner />
                    Consulting Moltbot...
                  </span>
                ) : (
                  "Send"
                )}
              </Button>
            </form>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg border border-border/50 bg-darker-bg p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Response{provider ? ` · provider: ${provider}` : ""}
              </p>
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : response ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{response}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No response yet.</p>
              )}
              </div>

            <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">GMX Params</p>
                  <p className="text-sm text-muted-foreground">Choose a preset or adjust market, collateral, and amounts before executing.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className={`h-auto px-5 py-2.5 ${warmSecondaryButtonClass}`} onClick={() => applyGmxPreset(FUJI_WETH_USDC_PRESET)}>
                    {FUJI_WETH_USDC_PRESET.label}
                  </Button>
                </div>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{FUJI_WETH_USDC_PRESET.description}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gmx-market">GMX market</Label>
                  <Input id="gmx-market" value={gmxConfig.market ?? ""} onChange={(event) => updateGmxConfigField("market", event.target.value)} placeholder="0x... market token" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmx-collateral-token">Collateral token</Label>
                  <Input id="gmx-collateral-token" value={gmxConfig.collateralToken ?? ""} onChange={(event) => updateGmxConfigField("collateralToken", event.target.value)} placeholder="0x... collateral token" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmx-collateral-amount">Collateral amount</Label>
                  <Input id="gmx-collateral-amount" value={gmxConfig.collateralAmount ?? ""} onChange={(event) => updateGmxConfigField("collateralAmount", event.target.value)} placeholder="1000000" disabled={selectedAction === "close"} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmx-size-delta">Size delta USD</Label>
                  <Input id="gmx-size-delta" value={gmxConfig.sizeDeltaUsd ?? ""} onChange={(event) => updateGmxConfigField("sizeDeltaUsd", event.target.value)} placeholder="100000000000000000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmx-trigger-price">Trigger price</Label>
                  <Input id="gmx-trigger-price" value={gmxConfig.triggerPrice ?? ""} onChange={(event) => updateGmxConfigField("triggerPrice", event.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmx-acceptable-price">Acceptable price</Label>
                  <Input id="gmx-acceptable-price" value={gmxConfig.acceptablePrice ?? ""} onChange={(event) => updateGmxConfigField("acceptablePrice", event.target.value)} placeholder="100000000000000000000" />
                </div>
              </div>
              {gmxConfigIssues.length > 0 ? (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-amber-300">{`Missing or incorrect values:\n- ${gmxConfigIssues.join("\n- ")}`}</pre>
              ) : (
                <p className="mt-3 text-xs text-green-400">GMX config ready to submit.</p>
              )}
            </div>

              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5649]">Executor Check</h2>
                  <button
                    type="button"
                    onClick={() => void loadExecutorHealth()}
                    disabled={isExecutorHealthLoading || !contracts.executor}
                    className="flex items-center gap-1.5 text-[#a43700] font-bold text-xs hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {isExecutorHealthLoading ? <Spinner /> : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                        <path d="M21 3v5h-5"/>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                        <path d="M8 16H3v5"/>
                      </svg>
                    )}
                    {isExecutorHealthLoading ? "Updating..." : "Refresh"}
                  </button>
                </div>
                <div className="bg-[#faf4df] rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                  {executorHealthError ? (
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-red-500">{executorHealthError}</pre>
                  ) : null}
                  {executorHealth ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#f4eed9] p-4 rounded-2xl flex flex-col gap-1 border-b-2 border-[#a43700]/10">
                          <span className="text-[10px] font-bold text-[#5a4138] uppercase">AVAX Balance</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-extrabold text-[#1e1c0f]">{formatEther(executorHealth.nativeBalance)}</span>
                            <span className="text-[10px] font-bold text-[#7a5649]">AVAX</span>
                          </div>
                        </div>
                        <div className="bg-[#f4eed9] p-4 rounded-2xl flex flex-col gap-1 border-b-2 border-[#a43700]/10">
                          <span className="text-[10px] font-bold text-[#5a4138] uppercase">{executorHealth.collateralTokenSymbol ?? "Colateral"}</span>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-xl font-extrabold ${executorHealth.collateralBalance !== null && executorHealth.collateralBalance > 0n ? "text-[#1e1c0f]" : "text-red-500"}`}>
                              {formatTokenAmount(executorHealth.collateralBalance, executorHealth.collateralTokenDecimals)}
                            </span>
                            <span className="text-[10px] font-bold text-[#7a5649]">{executorHealth.collateralTokenSymbol ?? ""}</span>
                          </div>
                          {executorHealth.collateralBalance !== null && (
                            <span className={`text-[10px] font-bold ${executorHealth.collateralBalance > 0n ? "text-emerald-600" : "text-red-500"}`}>
                              {executorHealth.collateralBalance > 0n ? "✓ OK" : "✗ Balance 0"}
                            </span>
                          )}
                        </div>
                      </div>
                      {executorHealth.executionFee !== null ? (
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#805200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                              <path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>
                            </svg>
                            <span className="text-sm font-medium text-[#5a4138]">Execution fee</span>
                          </div>
                          <span className={`text-sm font-bold ${executorHealth.nativeBalance >= executorHealth.executionFee ? "text-emerald-600" : "text-amber-600"}`}>
                            {formatEther(executorHealth.executionFee)} AVAX
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-medium text-[#5a4138]">Allowance al router</span>
                        <span className="text-sm font-bold text-[#1e1c0f]">
                          {formatTokenAmount(executorHealth.tokenAllowance, executorHealth.collateralTokenDecimals)}{executorHealth.collateralTokenSymbol ? ` ${executorHealth.collateralTokenSymbol}` : ""}
                        </span>
                      </div>
                      {executorHealth.recentExecution ? (
                        <div className="rounded-2xl bg-[#f4eed9] p-4 text-xs text-[#5a4138] flex flex-col gap-1.5">
                          <p className="font-bold text-[#1e1c0f]">
                            Last execution: {describeAction(executorHealth.recentExecution.action)} · {formatShortHash(executorHealth.recentExecution.orderKey)}
                          </p>
                          <p>Tx: {formatShortHash(executorHealth.recentExecution.txHash)} · block {executorHealth.recentExecution.blockNumber.toString()}</p>
                          <p>sizeDeltaUsd: {executorHealth.recentExecution.sizeDeltaUsd.toString()} · {executorHealth.recentExecution.isLong ? "LONG" : "SHORT"}</p>
                          {executorHealth.collateralBalance === 0n ? (
                            <p className="text-amber-600 font-medium">Collateral consumed by the last GMX order — expected after successful execution.</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-3">
                        <Button
                          type="button"
                          onClick={fundExecutor}
                          disabled={isFundingExecutor || !isConnected || !walletClient}
                          className={`w-full py-4 h-auto ${warmPrimaryButtonClass}`}
                        >
                          {isFundingExecutor ? (
                            <span className="inline-flex items-center gap-2"><Spinner />Funding...</span>
                          ) : (
                            "Fund executor +0.03 AVAX"
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={fundExecutorCollateral}
                          disabled={isFundingCollateral || !isConnected || !walletClient || !executorHealth.collateralTokenAddress}
                          className={`w-full py-4 h-auto ${warmSecondaryButtonClass}`}
                        >
                          {isFundingCollateral ? (
                            <span className="inline-flex items-center gap-2"><Spinner />Funding collateral...</span>
                          ) : (
                            `${connectedChainId === avalancheFuji.id ? "Mint" : "Fund"} executor +${EXECUTOR_COLLATERAL_TOP_UP_AMOUNT} ${executorHealth.collateralTokenSymbol ?? "token"}`
                          )}
                        </Button>
                        {executorFundingTxHash ? (
                          <a
                            className="text-xs text-[#a43700] underline-offset-4 hover:underline text-center"
                            href={`${getTxExplorerBase(connectedChainId)}${executorFundingTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Funding tx: {executorFundingTxHash}
                          </a>
                        ) : null}
                        {executorCollateralFundingTxHash ? (
                          <a
                            className="text-xs text-[#a43700] underline-offset-4 hover:underline text-center"
                            href={`${getTxExplorerBase(connectedChainId)}${executorCollateralFundingTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Collateral tx: {executorCollateralFundingTxHash}
                          </a>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-center italic text-[#5a4138]/60 py-4">No executor data yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-[#faf4df] p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5649]">Execution status</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${
                      userOpStatus === "included"
                        ? "bg-emerald-100 text-emerald-700"
                        : userOpStatus === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : userOpStatus === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-[#ffddb4] text-[#633f00]"
                    }`}
                  >
                    {userOpStatus === "included" ? "INCLUDED" : userOpStatus === "pending" ? "PENDING" : userOpStatus === "failed" ? "FAILED" : "IDLE"}
                  </span>
                </div>

                {executionError ? (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-[#ffdad6] p-4 text-xs text-[#93000a]">{executionError}</pre>
                ) : lastUserOpHash ? (
                  <div className="space-y-3">
                    <a
                      className="flex items-center justify-between rounded-2xl bg-[#f4eed9] p-4 text-sm font-semibold text-[#a43700] underline-offset-4 hover:underline"
                      href={`${getUserOpExplorerBase(connectedChainId)}${lastUserOpHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>UserOp</span>
                      <span>{formatShortHash(lastUserOpHash as Hex)}</span>
                    </a>

                    <div className="grid gap-3 grid-cols-1">
                      {executionTxHash ? (
                        <a
                          className="flex items-center justify-between rounded-2xl bg-[#f4eed9] p-4 text-sm font-semibold text-[#a43700] underline-offset-4 hover:underline"
                          href={`${getTxExplorerBase(connectedChainId)}${executionTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>Tx</span>
                          <span>{formatShortHash(executionTxHash as Hex)}</span>
                        </a>
                      ) : (
                        <div className="rounded-2xl bg-[#f4eed9] p-4 text-sm text-[#5a4138]">Tx pending confirmation</div>
                      )}

                      {executionBlockNumber ? (
                        <div className="rounded-2xl bg-[#f4eed9] p-4 text-sm text-[#1e1c0f]">
                          <span className="block text-[10px] uppercase tracking-wide text-[#7a5649]">Bloque</span>
                          <span className="font-bold">{executionBlockNumber}</span>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[#f4eed9] p-4 text-sm text-[#5a4138]">Block not available yet</div>
                      )}
                    </div>

                    {gmxTradeData ? (
                      <div className="rounded-2xl bg-[#f4eed9] p-4">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a5649]">GMX Trade Data</p>
                        <div className="grid gap-2 grid-cols-1">
                          <div className="rounded-xl bg-[#fff9e7] px-3 py-2 text-xs text-[#5a4138]">
                            <span className="block text-[10px] uppercase tracking-wide text-[#7a5649]">Action</span>
                            <span className="font-semibold text-[#1e1c0f]">{gmxTradeData.action}</span>
                          </div>
                          <div className="rounded-xl bg-[#fff9e7] px-3 py-2 text-xs text-[#5a4138]">
                            <span className="block text-[10px] uppercase tracking-wide text-[#7a5649]">Execution count</span>
                            <span className="font-semibold text-[#1e1c0f]">{gmxTradeData.executionCount}</span>
                          </div>
                          <div className="rounded-xl bg-[#fff9e7] px-3 py-2 text-xs text-[#5a4138]">
                            <span className="block text-[10px] uppercase tracking-wide text-[#7a5649]">metadataHash</span>
                            <span className="font-semibold text-[#1e1c0f]">{formatShortHash(gmxTradeData.metadataHash)}</span>
                          </div>
                          <div className="rounded-xl bg-[#fff9e7] px-3 py-2 text-xs text-[#5a4138]">
                            <span className="block text-[10px] uppercase tracking-wide text-[#7a5649]">reportHash</span>
                            <span className="font-semibold text-[#1e1c0f]">{formatShortHash(gmxTradeData.reportHash)}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-[#f4eed9] p-4 text-sm italic text-[#5a4138]/70">No recent execution.</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Session Key</p>
              {sessionError ? (
                <p className="mb-2 text-sm text-red-400">{sessionError}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-sm font-medium ${isSessionActive ? "text-green-400" : "text-muted-foreground"}`}>
                  {isSessionActive ? "✓ Active — trades without signature" : "Inactive — each trade requires signature"}
                </span>
                {!isSessionActive ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={`h-auto px-5 py-2.5 ${warmPrimaryButtonClass}`}
                    disabled={isSessionLoading || !isConnected || !contracts.smartAccount}
                    onClick={() => createSession(contracts)}
                  >
                    {isSessionLoading ? (
                      <span className="inline-flex items-center gap-2"><Spinner />Registering...</span>
                    ) : (
                      "Activate Session Key"
                    )}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className={`h-auto px-5 py-2.5 ${warmSecondaryButtonClass}`} onClick={revokeSession}>
                    Revoke
                  </Button>
                )}
              </div>
              {sessionOpHash ? (
                <a
                  className="mt-2 block text-xs text-cyan underline-offset-4 hover:underline"
                  href={`${getUserOpExplorerBase(connectedChainId ?? DEFAULT_CHAIN_ID)}${sessionOpHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Receipt: {sessionOpHash}
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
