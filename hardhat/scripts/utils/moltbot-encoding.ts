import { ethers } from "ethers";

export enum OperationType {
  RawNoop = 0,
  GmxOnReport = 1,
}

export enum GmxOperation {
  Long = 0,
  Short = 1,
  Close = 2,
}

export type MoltbotGmxReport = {
  action: GmxOperation;
  collateralToken: string;
  market: string;
  collateralAmount: bigint;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
};

const gmxExecutorInterface = new ethers.Interface([
  "function onReport(bytes metadata, bytes report)",
]);

export function encodeMoltbotReport(report: MoltbotGmxReport): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint8", "address", "address", "uint256", "uint256", "uint256", "uint256"],
    [
      report.action,
      report.collateralToken,
      report.market,
      report.collateralAmount,
      report.sizeDeltaUsd,
      report.triggerPrice,
      report.acceptablePrice,
    ]
  );
}

export function encodeGmxExecutorOnReportCall(report: MoltbotGmxReport, metadata = "0x"): string {
  const encodedReport = encodeMoltbotReport(report);
  return gmxExecutorInterface.encodeFunctionData("onReport", [metadata, encodedReport]);
}