import { ethers } from "ethers";
import * as dotenv from "dotenv";
import GMXPositionExecutorArtifact from "../../artifacts/contracts/GMXPositionExecutor.sol/GMXPositionExecutor.json" with { type: "json" };
import { createWallet } from "../lib/network.js";

dotenv.config();

type OrderConfigLike = {
  orderVault: string;
  cancellationReceiver: string;
  callbackContract: string;
  uiFeeReceiver: string;
  executionFee: bigint;
  callbackGasLimit: bigint;
  minOutputAmount: bigint;
  validFromTime: bigint;
  shouldUnwrapNativeToken: boolean;
  autoCancel: boolean;
  referralCode: string;
  closeIsLong: boolean;
};

const ZERO_ADDRESS = ethers.ZeroAddress;
const ZERO_BYTES32 = ethers.ZeroHash;

const DEFAULT_BY_NETWORK: Record<string, { orderVault: string }> = {
  avalancheFuji: {
    orderVault: "0x25D23e8E655727F2687CC808BB9589525A6F599B",
  },
  arbitrum: {
    orderVault: "0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2",
  },
};

function normalizeAddress(value: string, label: string): string {
  try {
    return ethers.getAddress(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

async function main() {
  const { name, wallet } = createWallet();
  const executorAddressRaw = process.env.MOLTBOT_GMX_EXECUTOR?.trim();

  if (!executorAddressRaw) {
    throw new Error("MOLTBOT_GMX_EXECUTOR is required in .env");
  }

  const executorAddress = normalizeAddress(executorAddressRaw, "MOLTBOT_GMX_EXECUTOR");
  const networkDefaults = DEFAULT_BY_NETWORK[name] ?? DEFAULT_BY_NETWORK.arbitrum;

  const orderVault = normalizeAddress(
    process.env.GMX_ORDER_VAULT?.trim() || networkDefaults.orderVault,
    "GMX_ORDER_VAULT"
  );

  const config: OrderConfigLike = {
    orderVault,
    cancellationReceiver: normalizeAddress(process.env.GMX_CANCELLATION_RECEIVER?.trim() || ZERO_ADDRESS, "GMX_CANCELLATION_RECEIVER"),
    callbackContract: normalizeAddress(process.env.GMX_CALLBACK_CONTRACT?.trim() || ZERO_ADDRESS, "GMX_CALLBACK_CONTRACT"),
    uiFeeReceiver: normalizeAddress(process.env.GMX_UI_FEE_RECEIVER?.trim() || ZERO_ADDRESS, "GMX_UI_FEE_RECEIVER"),
    executionFee: BigInt(process.env.GMX_EXECUTION_FEE ?? "1000000000000000"),
    callbackGasLimit: BigInt(process.env.GMX_CALLBACK_GAS_LIMIT ?? "0"),
    minOutputAmount: BigInt(process.env.GMX_MIN_OUTPUT_AMOUNT ?? "0"),
    validFromTime: BigInt(process.env.GMX_VALID_FROM_TIME ?? "0"),
    shouldUnwrapNativeToken: (process.env.GMX_SHOULD_UNWRAP_NATIVE_TOKEN ?? "false").toLowerCase() === "true",
    autoCancel: (process.env.GMX_AUTO_CANCEL ?? "false").toLowerCase() === "true",
    referralCode: process.env.GMX_REFERRAL_CODE?.trim() || ZERO_BYTES32,
    closeIsLong: (process.env.GMX_CLOSE_IS_LONG ?? "true").toLowerCase() !== "false",
  };

  if (!ethers.isHexString(config.referralCode, 32)) {
    throw new Error(`Invalid GMX_REFERRAL_CODE (bytes32 expected): ${config.referralCode}`);
  }

  if (config.executionFee <= 0n) {
    throw new Error("GMX_EXECUTION_FEE must be > 0");
  }

  const executor = new ethers.Contract(executorAddress, GMXPositionExecutorArtifact.abi, wallet);

  const [owner, currentConfig] = await Promise.all([
    executor.owner() as Promise<string>,
    executor.orderConfig() as Promise<OrderConfigLike>,
  ]);

  console.log("Network:", name);
  console.log("Executor:", executorAddress);
  console.log("Wallet:", wallet.address);
  console.log("Owner :", owner);

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Connected signer is not executor owner. Use the deployer/owner key.");
  }

  console.log("\nCurrent orderConfig:");
  console.log(currentConfig);

  const tx = await executor.setOrderConfig(config);
  console.log("\nsetOrderConfig tx:", tx.hash);
  await tx.wait();

  const updatedConfig = (await executor.orderConfig()) as OrderConfigLike;
  console.log("\nUpdated orderConfig:");
  console.log(updatedConfig);

  console.log("\n✅ orderConfig configured");
}

main().catch((error) => {
  console.error("❌ set-order-config failed:", error);
  process.exitCode = 1;
});
