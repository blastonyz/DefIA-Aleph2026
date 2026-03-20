import { ethers } from "ethers";
import {
  encodeGmxExecutorOnReportCall,
  GmxOperation,
  OperationType,
  type MoltbotGmxReport,
} from "../utils/moltbot-encoding.js";

export type SmartAccountExecutionTarget = {
  operationType: OperationType;
  targetContract: string;
  valueWei: bigint;
  targetCallData: string;
  strategyLabel: "raw-noop" | "gmx-onreport";
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function resolveStrategy(): "raw-noop" | "gmx-onreport" {
  const value = (process.env.MOLTBOT_STRATEGY ?? "raw-noop").trim().toLowerCase();
  if (value === "raw-noop" || value === "gmx-onreport") {
    return value;
  }
  throw new Error(`Invalid MOLTBOT_STRATEGY: ${value}`);
}

function resolveGmxAction(): GmxOperation {
  const value = (process.env.MOLTBOT_GMX_ACTION ?? "long").trim().toLowerCase();
  if (value === "long") return GmxOperation.Long;
  if (value === "short") return GmxOperation.Short;
  if (value === "close") return GmxOperation.Close;
  throw new Error(`Invalid MOLTBOT_GMX_ACTION: ${value}`);
}

function resolveExecutorAddress(): string {
  return (process.env.MOLTBOT_GMX_EXECUTOR ?? ZERO_ADDRESS).trim();
}

const MOLTBOT_GMX_REPORT: MoltbotGmxReport = {
  action: resolveGmxAction(),
  collateralToken: ethers.ZeroAddress,
  market: ethers.ZeroAddress,
  collateralAmount: 0n,
  sizeDeltaUsd: 0n,
  triggerPrice: 0n,
  acceptablePrice: 0n,
};

const MOLTBOT_GMX_METADATA = "0x";
const MOLTBOT_GMX_VALUE_WEI = 0n;

export function buildMoltbotExecutionTarget(): SmartAccountExecutionTarget {
  const strategy = resolveStrategy();

  if (strategy === "raw-noop") {
    return {
      operationType: OperationType.RawNoop,
      targetContract: ethers.ZeroAddress,
      valueWei: 0n,
      targetCallData: "0x",
      strategyLabel: "raw-noop",
    };
  }

  const executor = resolveExecutorAddress();
  if (executor === ZERO_ADDRESS) {
    throw new Error("MOLTBOT_GMX_EXECUTOR is required when MOLTBOT_STRATEGY=gmx-onreport");
  }

  return {
    operationType: OperationType.GmxOnReport,
    targetContract: executor,
    valueWei: MOLTBOT_GMX_VALUE_WEI,
    targetCallData: encodeGmxExecutorOnReportCall(MOLTBOT_GMX_REPORT, MOLTBOT_GMX_METADATA),
    strategyLabel: "gmx-onreport",
  };
}