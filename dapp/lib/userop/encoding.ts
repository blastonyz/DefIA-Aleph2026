import { encodeAbiParameters, getAddress, isAddress, type Hex } from "viem";
import type { TradeAction } from "@/contexts/aa-context";

export type MoltbotReportConfigInput = {
  market?: string;
  collateralToken?: string;
  collateralAmount?: string;
  sizeDeltaUsd?: string;
  triggerPrice?: string;
  acceptablePrice?: string;
};

export type UserOpUnpacked = {
  sender: Hex;
  nonce: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymaster?: Hex;
  paymasterData?: Hex;
  paymasterVerificationGasLimit?: Hex;
  paymasterPostOpGasLimit?: Hex;
  factory?: Hex;
  factoryData?: Hex;
  signature: Hex;
};

export const toHex = (n: bigint | number | string) => `0x${BigInt(n).toString(16)}` as Hex;

export const packGas = (high: Hex | bigint, low: Hex | bigint) => {
  const highBig = typeof high === "string" ? BigInt(high) : high;
  const lowBig = typeof low === "string" ? BigInt(low) : low;
  return (`0x${highBig.toString(16).padStart(32, "0")}${lowBig.toString(16).padStart(32, "0")}` as Hex);
};

export const normalizeHex = (value?: string | null) => ((value ?? "0x0") as Hex);

export function actionToEnum(action: TradeAction): 0 | 1 | 2 {
  if (action === "long") return 0;
  if (action === "short") return 1;
  return 2;
}

function resolveStringEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function resolveStringConfig(keys: string[], override: string | undefined, useEnvFallback: boolean): string | undefined {
  const normalizedOverride = override?.trim();
  if (normalizedOverride) {
    return normalizedOverride;
  }

  if (!useEnvFallback) {
    return undefined;
  }

  return resolveStringEnv(keys);
}

function resolveAddressEnv(label: string, keys: string[]): Hex {
  const value = resolveStringEnv(keys);
  if (!value) {
    throw new Error(`Missing ${label}. Configure one of: ${keys.join(", ")}`);
  }
  if (!isAddress(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return getAddress(value);
}

function resolveAddressConfig(label: string, keys: string[], override: string | undefined, useEnvFallback: boolean): Hex {
  const value = resolveStringConfig(keys, override, useEnvFallback);
  if (!value) {
    throw new Error(`Missing ${label}. Configure one of: ${keys.join(", ")}`);
  }
  if (!isAddress(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return getAddress(value);
}

function resolveBigIntEnv(label: string, keys: string[], fallback?: bigint): bigint {
  const value = resolveStringEnv(keys);
  if (!value) {
    if (typeof fallback === "bigint") {
      return fallback;
    }
    throw new Error(`Missing ${label}. Configure one of: ${keys.join(", ")}`);
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function resolveBigIntConfig(
  label: string,
  keys: string[],
  override?: string,
  useEnvFallback: boolean = true,
  fallback?: bigint
): bigint {
  const value = resolveStringConfig(keys, override, useEnvFallback);
  if (!value) {
    if (typeof fallback === "bigint") {
      return fallback;
    }
    throw new Error(`Missing ${label}. Configure one of: ${keys.join(", ")}`);
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

export function getMoltbotReportConfigIssues(
  chainId?: number,
  action?: TradeAction,
  config?: MoltbotReportConfigInput
): string[] {
  const isFuji = chainId === 43113 || Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113) === 43113;
  const useEnvFallback = config === undefined;
  const issues: string[] = [];

  const market = resolveStringConfig(
    isFuji
      ? ["NEXT_PUBLIC_GMX_MARKET_ADDRESS_FUJI", "NEXT_PUBLIC_GMX_MARKET_ADDRESS"]
      : ["NEXT_PUBLIC_GMX_MARKET_ADDRESS"],
    config?.market,
    useEnvFallback
  );
  if (!market) {
    issues.push("Falta GMX market address.");
  } else if (!isAddress(market)) {
    issues.push(`GMX market address invalido: ${market}`);
  }

  const collateralToken = resolveStringConfig(
    isFuji
      ? ["NEXT_PUBLIC_GMX_COLLATERAL_TOKEN_ADDRESS_FUJI", "NEXT_PUBLIC_GMX_COLLATERAL_TOKEN_ADDRESS"]
      : ["NEXT_PUBLIC_GMX_COLLATERAL_TOKEN_ADDRESS"],
    config?.collateralToken,
    useEnvFallback
  );
  if (!collateralToken) {
    issues.push("Falta GMX collateral token address.");
  } else if (!isAddress(collateralToken)) {
    issues.push(`GMX collateral token address invalido: ${collateralToken}`);
  }

  const sizeDeltaUsd = resolveStringConfig(["NEXT_PUBLIC_GMX_SIZE_DELTA_USD"], config?.sizeDeltaUsd, useEnvFallback);
  if (!sizeDeltaUsd) {
    issues.push("Falta GMX size delta USD.");
  } else {
    try {
      BigInt(sizeDeltaUsd);
    } catch {
      issues.push(`GMX size delta USD invalido: ${sizeDeltaUsd}`);
    }
  }

  const acceptablePrice = resolveStringConfig(["NEXT_PUBLIC_GMX_ACCEPTABLE_PRICE"], config?.acceptablePrice, useEnvFallback);
  if (!acceptablePrice) {
    issues.push("Falta GMX acceptable price.");
  } else {
    try {
      BigInt(acceptablePrice);
    } catch {
      issues.push(`GMX acceptable price invalido: ${acceptablePrice}`);
    }
  }

  const triggerPrice = resolveStringConfig(["NEXT_PUBLIC_GMX_TRIGGER_PRICE"], config?.triggerPrice, useEnvFallback);
  if (triggerPrice) {
    try {
      BigInt(triggerPrice);
    } catch {
      issues.push(`GMX trigger price invalido: ${triggerPrice}`);
    }
  }

  if (action !== "close") {
    const collateralAmount = resolveStringConfig(["NEXT_PUBLIC_GMX_COLLATERAL_AMOUNT"], config?.collateralAmount, useEnvFallback);
    if (!collateralAmount) {
      issues.push("Falta GMX collateral amount.");
    } else {
      try {
        BigInt(collateralAmount);
      } catch {
        issues.push(`GMX collateral amount invalido: ${collateralAmount}`);
      }
    }
  }

  return issues;
}

export function buildMoltbotReport(
  action: TradeAction,
  chainId?: number,
  config?: MoltbotReportConfigInput
): Hex {
  const isFuji = chainId === 43113 || Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113) === 43113;
  const useEnvFallback = config === undefined;
  const market = resolveAddressConfig(
    "GMX market address",
    isFuji
      ? ["NEXT_PUBLIC_GMX_MARKET_ADDRESS_FUJI", "NEXT_PUBLIC_GMX_MARKET_ADDRESS"]
      : ["NEXT_PUBLIC_GMX_MARKET_ADDRESS"],
    config?.market,
    useEnvFallback
  );
  const collateralToken = resolveAddressConfig(
    "GMX collateral token address",
    isFuji
      ? ["NEXT_PUBLIC_GMX_COLLATERAL_TOKEN_ADDRESS_FUJI", "NEXT_PUBLIC_GMX_COLLATERAL_TOKEN_ADDRESS"]
      : ["NEXT_PUBLIC_GMX_COLLATERAL_TOKEN_ADDRESS"],
    config?.collateralToken,
    useEnvFallback
  );
  const collateralAmount = action === "close"
    ? 0n
    : resolveBigIntConfig(
        "GMX collateral amount",
        ["NEXT_PUBLIC_GMX_COLLATERAL_AMOUNT"],
        config?.collateralAmount,
        useEnvFallback,
        0n
      );
  const sizeDeltaUsd = resolveBigIntConfig(
    "GMX size delta USD",
    ["NEXT_PUBLIC_GMX_SIZE_DELTA_USD"],
    config?.sizeDeltaUsd,
    useEnvFallback
  );
  const triggerPrice = resolveBigIntConfig(
    "GMX trigger price",
    ["NEXT_PUBLIC_GMX_TRIGGER_PRICE"],
    config?.triggerPrice,
    useEnvFallback,
    0n
  );
  const acceptablePrice = resolveBigIntConfig(
    "GMX acceptable price",
    ["NEXT_PUBLIC_GMX_ACCEPTABLE_PRICE"],
    config?.acceptablePrice,
    useEnvFallback
  );

  return encodeAbiParameters(
    [
      { type: "uint8" },
      { type: "address" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [actionToEnum(action), collateralToken, market, collateralAmount, sizeDeltaUsd, triggerPrice, acceptablePrice]
  );
}
