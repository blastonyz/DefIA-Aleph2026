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
  id: "fuji-weth-usdc",
  label: "Fuji WETH/USDC",
  description: "Preset oficial del repo GMX para Fuji con market WETH/WETH/USDC.",
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
  "0xb0618435": "InvalidForwarder",
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

    if (decoded.errorName === "InvalidForwarder" && Array.isArray(decoded.args) && decoded.args.length >= 2) {
      const sender = String(decoded.args[0]);
      const expected = String(decoded.args[1]);
      return `InvalidForwarder: sender=${sender} expectedForwarder=${expected}`;
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
    return "Error desconocido";
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

  const [forwarder, orderConfig] = await Promise.all([
    publicClient.readContract({
      address: executorAddress,
      abi: GMXPositionExecutorArtifact.abi,
      functionName: "forwarder",
    }) as Promise<Hex>,
    publicClient.readContract({
      address: executorAddress,
      abi: GMXPositionExecutorArtifact.abi,
      functionName: "orderConfig",
    }),
  ]);

  return { forwarder, orderConfig, flavor: "current" };
}

function pickActionFromAgentText(text: string): TradeAction | null {
  const normalized = text.toLowerCase();

  if (/\bclose\b|\bcerrar\b|\bcierre\b/.test(normalized)) {
    return "close";
  }
  if (/\bshort\b/.test(normalized)) {
    return "short";
  }
  if (/\blong\b|\bcomprar\b|\balcista\b/.test(normalized)) {
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
  const [prompt, setPrompt] = useState("Dame una estrategia conservadora de yield en Avalanche para empezar hoy.");
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
      setExecutorHealthError("Wallet client no disponible para fondear el executor.");
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
      setExecutorHealthError("Wallet client no disponible para fondear colateral.");
      return;
    }

    if (!executorHealth?.collateralTokenAddress) {
      setExecutorHealthError("No hay collateral token configurado para fondear.");
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
        "Sos un agente de trading. Elegí exactamente una acción: LONG, SHORT o CLOSE.",
        "Respondé en una sola línea empezando por ACTION: LONG|SHORT|CLOSE y luego un motivo breve.",
        `Contexto usuario: ${prompt}`,
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
      setExecutionError("Ya hay una UserOperation pendiente. Espera confirmación antes de enviar otra.");
      return;
    }

    setExecutionError("");
    setLastUserOpHash("");
    setExecutionTxHash("");
    setExecutionBlockNumber("");
    setGmxTradeData(null);
    setUserOpStatus("idle");

    if (!isConnected) {
      setExecutionError("Conecta la wallet antes de ejecutar una operación.");
      return;
    }

    if (!isSupportedChain) {
      setExecutionError("Cambia a la red configurada para operar.");
      return;
    }

    if (!publicClient || !walletClient || !address) {
      setExecutionError("Wallet client no disponible. Reconecta la wallet.");
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
        <div className="relative mx-auto max-w-4xl px-6">
          <Card className="border-border/50 bg-dark-bg/80">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-2xl text-foreground md:text-3xl">
                Moltbot Integration Console
              </CardTitle>
              <CardDescription>Cargando consola...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="agent-console" className="relative overflow-hidden bg-darker-bg py-24 lg:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan/10 blur-[120px]" />

      <div className="relative mx-auto max-w-4xl px-6">
        <Card className="border-border/50 bg-dark-bg/80">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)] text-2xl text-foreground md:text-3xl">
              Moltbot Integration Console
            </CardTitle>
            <CardDescription>
              Prueba la conexión de tu dapp con Moltbot desde este frontend sin exponer el token.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="rounded-lg border border-border/50 bg-darker-bg p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Operacion actual</p>
                <p className="text-sm text-foreground">
                  {selectedAction.toUpperCase()} · {actionSource.toUpperCase()}
                </p>
                {agentReasoning ? (
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{agentReasoning}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Button type="button" variant={selectedAction === "long" ? "default" : "secondary"} onClick={() => onManualAction("long")} disabled={isExecuting || isAutoLoading || userOpStatus === "pending"}>
                  Long
                </Button>
                <Button type="button" variant={selectedAction === "short" ? "default" : "secondary"} onClick={() => onManualAction("short")} disabled={isExecuting || isAutoLoading || userOpStatus === "pending"}>
                  Short
                </Button>
                <Button type="button" variant={selectedAction === "close" ? "default" : "secondary"} onClick={() => onManualAction("close")} disabled={isExecuting || isAutoLoading || userOpStatus === "pending"}>
                  Close
                </Button>
                <Button type="button" variant="outline" onClick={requestAutoAction} disabled={isAutoLoading || isExecuting || userOpStatus === "pending"}>
                  {isAutoLoading || isExecuting ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      Ejecutando...
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
                placeholder="Escribe qué quieres que haga el agente"
                className="min-h-32"
              />

              <Button type="submit" className="w-full" disabled={isLoading || prompt.trim().length === 0}>
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Consultando Moltbot...
                  </span>
                ) : (
                  "Enviar"
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Respuesta{provider ? ` · provider: ${provider}` : ""}
              </p>
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : response ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{response}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Aún no hay respuesta.</p>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">GMX Params</p>
                  <p className="text-sm text-muted-foreground">Elegí un preset o ajustá market, collateral y montos antes de ejecutar.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => applyGmxPreset(FUJI_WETH_USDC_PRESET)}>
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
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-amber-300">{`Faltan o estan mal estos valores:\n- ${gmxConfigIssues.join("\n- ")}`}</pre>
              ) : (
                <p className="mt-3 text-xs text-green-400">Configuracion GMX lista para enviar.</p>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Executor Check</p>
                <Button type="button" variant="outline" onClick={() => void loadExecutorHealth()} disabled={isExecutorHealthLoading || !contracts.executor}>
                  {isExecutorHealthLoading ? (
                    <span className="inline-flex items-center gap-2"><Spinner />Actualizando...</span>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
              {executorHealthError ? (
                <pre className="mb-3 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-red-400">{executorHealthError}</pre>
              ) : null}
              {executorHealth ? (
                <div className="space-y-2">
                  <p className="text-sm text-foreground">Executor: {contracts.executor}</p>
                  <p className="text-sm text-muted-foreground">Balance AVAX: {formatEther(executorHealth.nativeBalance)}</p>
                  <p className="text-sm text-muted-foreground">Execution fee: {executorHealth.executionFee !== null ? formatEther(executorHealth.executionFee) : "N/A"}</p>
                  <p className="text-sm text-muted-foreground">Forwarder: {executorHealth.forwarder ?? "N/A"}</p>
                  <p className="text-sm text-muted-foreground">Router spender: {executorHealth.routerSpender ?? "N/A"}</p>
                  <p className="text-sm text-muted-foreground">Collateral token: {executorHealth.collateralTokenAddress ?? "No configurado"}</p>
                  <p className={`text-sm font-medium ${executorHealth.collateralBalance !== null && executorHealth.collateralBalance > 0n ? "text-green-400" : "text-red-400"}`}>
                    Balance colateral: {formatTokenAmount(executorHealth.collateralBalance, executorHealth.collateralTokenDecimals)}{executorHealth.collateralTokenSymbol ? ` ${executorHealth.collateralTokenSymbol}` : ""}{" "}
                    {executorHealth.collateralBalance !== null ? (executorHealth.collateralBalance > 0n ? "✓ OK" : "✗ Balance 0") : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">Allowance al router: {formatTokenAmount(executorHealth.tokenAllowance, executorHealth.collateralTokenDecimals)}{executorHealth.collateralTokenSymbol ? ` ${executorHealth.collateralTokenSymbol}` : ""}</p>
                  {executorHealth.recentExecution ? (
                    <div className="rounded-md border border-border/50 bg-dark-bg/60 p-3 text-xs text-muted-foreground">
                      <p className="text-foreground">Ultima ejecucion: {describeAction(executorHealth.recentExecution.action)} · orderKey {formatShortHash(executorHealth.recentExecution.orderKey)}</p>
                      <p>Tx: {formatShortHash(executorHealth.recentExecution.txHash)} · bloque {executorHealth.recentExecution.blockNumber.toString()}</p>
                      <p>sizeDeltaUsd: {executorHealth.recentExecution.sizeDeltaUsd.toString()} · direccion: {executorHealth.recentExecution.isLong ? "LONG" : "SHORT"}</p>
                      {executorHealth.collateralBalance === 0n ? (
                        <p className="text-amber-300">El colateral del executor ya fue consumido por la ultima orden de GMX. Ver 0 {executorHealth.collateralTokenSymbol ?? "TOKEN"} despues de una ejecucion exitosa es esperado.</p>
                      ) : null}
                    </div>
                  ) : null}
                  {executorHealth.executionFee !== null ? (
                    <p className={`text-sm ${executorHealth.nativeBalance >= executorHealth.executionFee ? "text-green-400" : "text-amber-400"}`}>
                      {executorHealth.nativeBalance >= executorHealth.executionFee
                        ? "Balance AVAX suficiente para el executionFee actual"
                        : "Falta AVAX en el executor para cubrir el executionFee actual"}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={fundExecutor} disabled={isFundingExecutor || !isConnected || !walletClient}>
                      {isFundingExecutor ? (
                        <span className="inline-flex items-center gap-2"><Spinner />Fondeando...</span>
                      ) : (
                        "Fondear executor +0.03 AVAX"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={fundExecutorCollateral}
                      disabled={
                        isFundingCollateral ||
                        !isConnected ||
                        !walletClient ||
                        !executorHealth.collateralTokenAddress
                      }
                    >
                      {isFundingCollateral ? (
                        <span className="inline-flex items-center gap-2"><Spinner />Fondeando colateral...</span>
                      ) : (
                        `${connectedChainId === avalancheFuji.id ? "Mint" : "Fondear"} executor +${EXECUTOR_COLLATERAL_TOP_UP_AMOUNT} ${executorHealth.collateralTokenSymbol ?? "token"}`
                      )}
                    </Button>
                    {executorFundingTxHash ? (
                      <a
                        className="text-xs text-cyan underline-offset-4 hover:underline"
                        href={`${getTxExplorerBase(connectedChainId)}${executorFundingTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Funding tx: {executorFundingTxHash}
                      </a>
                    ) : null}
                    {executorCollateralFundingTxHash ? (
                      <a
                        className="text-xs text-cyan underline-offset-4 hover:underline"
                        href={`${getTxExplorerBase(connectedChainId)}${executorCollateralFundingTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Collateral tx: {executorCollateralFundingTxHash}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos del executor todavía.</p>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Estado de ejecución</p>
              {executionError ? (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-red-400">{executionError}</pre>
              ) : lastUserOpHash ? (
                <div className="space-y-2">
                  <a
                    className="block text-sm text-cyan underline-offset-4 hover:underline"
                    href={`${getUserOpExplorerBase(connectedChainId)}${lastUserOpHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    UserOp: {lastUserOpHash}
                  </a>
                  <p className="text-sm text-muted-foreground">
                    Estado: {userOpStatus === "included" ? "INCLUDED" : userOpStatus === "pending" ? "PENDING" : userOpStatus === "failed" ? "FAILED" : "IDLE"}
                  </p>
                  {executionTxHash ? (
                    <a
                      className="block text-sm text-cyan underline-offset-4 hover:underline"
                      href={`${getTxExplorerBase(connectedChainId)}${executionTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Tx: {executionTxHash}
                    </a>
                  ) : null}
                  {executionBlockNumber ? (
                    <p className="text-sm text-muted-foreground">Bloque: {executionBlockNumber}</p>
                  ) : null}
                  {gmxTradeData ? (
                    <div className="space-y-1 pt-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">GMX Trade Data</p>
                      <p className="text-sm text-foreground">action: {gmxTradeData.action}</p>
                      <p className="break-all text-xs text-muted-foreground">metadataHash: {gmxTradeData.metadataHash}</p>
                      <p className="break-all text-xs text-muted-foreground">reportHash: {gmxTradeData.reportHash}</p>
                      <p className="text-sm text-muted-foreground">executionCount: {gmxTradeData.executionCount}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin ejecución reciente.</p>
              )}
            </div>

            <OhlcChart />

            <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Session Key</p>
              {sessionError ? (
                <p className="mb-2 text-sm text-red-400">{sessionError}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-sm font-medium ${isSessionActive ? "text-green-400" : "text-muted-foreground"}`}>
                  {isSessionActive ? "✓ Activa — trades sin firma" : "Inactiva — cada trade pide firma"}
                </span>
                {!isSessionActive ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSessionLoading || !isConnected || !contracts.smartAccount}
                    onClick={() => createSession(contracts)}
                  >
                    {isSessionLoading ? (
                      <span className="inline-flex items-center gap-2"><Spinner />Registrando...</span>
                    ) : (
                      "Activar Session Key"
                    )}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={revokeSession}>
                    Revocar
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
                  Registro: {sessionOpHash}
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
