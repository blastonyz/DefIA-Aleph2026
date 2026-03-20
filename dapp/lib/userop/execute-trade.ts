
import {
  decodeFunctionResult,
  encodeFunctionData,
  hexToBytes,
  recoverMessageAddress,
  type Hex,
  type PublicClient,
  type WalletClient,
  zeroAddress,
} from "viem";
import type { TradeAction } from "@/contexts/aa-context";
import AccountArtifact from "@/lib/contracts/Account.json";
import AccountFactoryArtifact from "@/lib/contracts/AccountFactory.json";
import EntryPointArtifact from "@/lib/contracts/EntryPoint.json";
import GMXPositionExecutorArtifact from "@/lib/contracts/GMXPositionExecutor.json";
import {
  buildMoltbotReport,
  type MoltbotReportConfigInput,
  normalizeHex,
  packGas,
  toHex,
  type UserOpUnpacked,
} from "@/lib/userop/encoding";
import { getBundlerRpcRequest, isAaUnsupportedError } from "@/lib/userop/bundler-rpc";

type ContractsConfig = {
  entryPoint: string;
  factory: string;
  paymaster: string;
  smartAccount: string;
  executor: string;
};


const USER_OP_GAS_BUFFER = 1_000_000n;
const MIN_PRIORITY_FEE_PER_GAS = 100_000_000n; // 0.1 gwei
// 65-byte placeholder used for gas estimation — no wallet prompt needed
const DUMMY_SIGNATURE = ("0x" + "ff".repeat(65)) as Hex;
// GMX createOrder on Fuji costs ~800k-900k gas (DataStore SSTOREs + 63/64 nesting).
// 800k was insufficient — bumped to 1_200_000 to give headroom.
const TRADE_CALL_GAS_LIMIT = 1_200_000n;
// For deployed accounts, validateUserOp (ECDSA) uses ~24k-50k gas.
// Rundler requires actual/limit >= 0.4, so keep limit <= 2.5× actual.
const TRADE_VERIFICATION_GAS_LIMIT = 22_000n;
const TRADE_PRE_VERIFICATION_GAS = 60_000n;
const TRADE_PAYMASTER_VERIFICATION_GAS_LIMIT = 20_000n;
const TRADE_PAYMASTER_POST_OP_GAS_LIMIT = 30_000n;
const DEPLOY_CALL_GAS_LIMIT = 600_000n;
// For first deploy, factory + validateUserOp uses ~530k gas measured live.
const DEPLOY_VERIFICATION_GAS_LIMIT = 1_000_000n;
const DEPLOY_PRE_VERIFICATION_GAS = 160_000n;
const DEPLOY_PAYMASTER_VERIFICATION_GAS_LIMIT = 120_000n;
const DEPLOY_PAYMASTER_POST_OP_GAS_LIMIT = 80_000n;

function getRequiredMaxFeePerGas(error: unknown): bigint | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/must be at least\s+(\d+)/i);
  if (!match) {
    return null;
  }

  return BigInt(match[1]);
}

function isInvalidAccountSignatureError(error: unknown): boolean {
  return error instanceof Error && /invalid account signature/i.test(error.message);
}

function isReplacementUnderpricedError(error: unknown): boolean {
  return error instanceof Error && /replacement underpriced/i.test(error.message);
}

function isVerificationEfficiencyLowError(error: unknown): boolean {
  return error instanceof Error && /efficiency too low/i.test(error.message);
}

function isAA26OverVerificationGasLimitError(error: unknown): boolean {
  return error instanceof Error && /AA26 over verificationGasLimit/i.test(error.message);
}

function getEfficiencyActualRatio(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/Actual:\s*([0-9]*\.?[0-9]+)/i);
  if (!match) {
    return null;
  }

  const ratio = Number(match[1]);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

function toAddressHex(value: string): Hex {
  return value as Hex;
}

function buildPaymasterAndData(params: {
  paymasterAddress: Hex;
  verificationGasLimit: Hex;
  postOpGasLimit: Hex;
  paymasterData?: Hex;
}): Hex {
  const { paymasterAddress, verificationGasLimit, postOpGasLimit, paymasterData = "0x" } = params;

  return (
    `${paymasterAddress}${BigInt(normalizeHex(verificationGasLimit))
      .toString(16)
      .padStart(32, "0")}${BigInt(normalizeHex(postOpGasLimit))
      .toString(16)
      .padStart(32, "0")}${paymasterData.slice(2)}` as Hex
  );
}

async function signUserOpHash(params: {
  address: Hex;
  userOpHash: Hex;
  walletClient: WalletClient;
  sessionSigner?: ((userOpHash: Hex) => Promise<Hex>) | null;
}): Promise<Hex> {
  const { address, userOpHash, walletClient, sessionSigner } = params;

  if (sessionSigner) {
    return await sessionSigner(userOpHash);
  }

  const signature = await walletClient.signMessage({
    account: address,
    message: { raw: hexToBytes(userOpHash) },
  });

  const recoveredAddress = await recoverMessageAddress({
    message: { raw: hexToBytes(userOpHash) },
    signature,
  });

  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    throw new Error(
      `Invalid local signature recovery. expected=${address} recovered=${recoveredAddress}`
    );
  }

  return signature;
}

export async function executeTradeUserOp(params: {
  action: TradeAction;
  address: Hex;
  contracts: ContractsConfig;
  publicClient: PublicClient;
  walletClient: WalletClient;
  reportConfig?: MoltbotReportConfigInput;
  sessionSigner?: (userOpHash: Hex) => Promise<Hex>;
  sessionStrict?: boolean;
}): Promise<Hex> {
  const {
    action,
    address,
    contracts,
    publicClient,
    walletClient,
    reportConfig,
    sessionSigner,
    sessionStrict = false,
  } = params;
  let activeSessionSigner = sessionSigner ?? null;
  const entryPointAddress = toAddressHex(contracts.entryPoint);
  const factoryAddress = toAddressHex(contracts.factory);
  const paymasterAddress = toAddressHex(contracts.paymaster);
  const executorAddress = toAddressHex(contracts.executor);
  const rpcRequest = getBundlerRpcRequest({
    publicClient,
    chainId: publicClient.chain?.id,
  });

  const configuredSmartAccount = toAddressHex(contracts.smartAccount);

  const factoryData = encodeFunctionData({
    abi: AccountFactoryArtifact.abi,
    functionName: "createAccount",
    args: [address],
  });

  const configuredAccountBytecode = await publicClient.getCode({ address: configuredSmartAccount });
  const configuredAccountExists = !!configuredAccountBytecode && configuredAccountBytecode !== "0x";

  let sender = configuredSmartAccount;
  let accountExists = configuredAccountExists;

  if (!accountExists) {
    const senderCall = await publicClient.call({
      to: factoryAddress,
      data: factoryData,
    });

    if (!senderCall.data) {
      throw new Error("AccountFactory createAccount returned no data");
    }

    sender = decodeFunctionResult({
      abi: AccountFactoryArtifact.abi,
      functionName: "createAccount",
      data: senderCall.data,
    }) as Hex;

    const derivedAccountBytecode = await publicClient.getCode({ address: sender });
    accountExists = !!derivedAccountBytecode && derivedAccountBytecode !== "0x";
  }

  if (accountExists) {
    const onchainOwner = (await publicClient.readContract({
      address: sender,
      abi: AccountArtifact.abi,
      functionName: "owner",
    })) as Hex;

    if (onchainOwner.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        `Connected wallet is not the smart account owner. connected=${address} owner=${onchainOwner}`
      );
    }
  }

  const readEntryPointNonce = async () => {
    if (!accountExists) return 0n;
    return (await publicClient.readContract({
      address: entryPointAddress,
      abi: EntryPointArtifact.abi,
      functionName: "getNonce",
      args: [sender, 0n],
    })) as bigint;
  };

  const targetCallData = encodeFunctionData({
    abi: GMXPositionExecutorArtifact.abi,
    functionName: "executeFromSmartAccount",
    args: [buildMoltbotReport(action, publicClient.chain?.id, reportConfig)],
  });

  const accountExecuteCallData = encodeFunctionData({
    abi: AccountArtifact.abi,
    functionName: "execute",
    args: [executorAddress, 0n, targetCallData, 1],
  });

  const nonce = await readEntryPointNonce();

  const userOp: UserOpUnpacked = {
    sender,
    nonce: toHex(nonce),
    callData: accountExecuteCallData,
    callGasLimit: "0x0",
    verificationGasLimit: "0x0",
    preVerificationGas: "0x0",
    maxFeePerGas: "0x0",
    maxPriorityFeePerGas: "0x0",
    signature: "0x",
  };

  if (!accountExists) {
    userOp.factory = factoryAddress;
    userOp.factoryData = factoryData;
  }

  const usePaymaster = paymasterAddress.toLowerCase() !== zeroAddress;
  if (usePaymaster) {
    userOp.paymaster = paymasterAddress;
    userOp.paymasterData = "0x";
    userOp.paymasterVerificationGasLimit = "0x0";
    userOp.paymasterPostOpGasLimit = "0x0";
  }

  const initCode = !accountExists && userOp.factory && userOp.factoryData
    ? (`${userOp.factory}${userOp.factoryData.slice(2)}` as Hex)
    : ("0x" as Hex);

  // Use deterministic gas limits so we only need one final signature.
  // This avoids AA23 during estimate when signature is not yet valid.
  userOp.signature = DUMMY_SIGNATURE;
  userOp.callGasLimit = toHex(accountExists ? TRADE_CALL_GAS_LIMIT : DEPLOY_CALL_GAS_LIMIT);
  userOp.verificationGasLimit = toHex(
    accountExists ? TRADE_VERIFICATION_GAS_LIMIT : DEPLOY_VERIFICATION_GAS_LIMIT
  );
  userOp.preVerificationGas = toHex(
    accountExists ? TRADE_PRE_VERIFICATION_GAS : DEPLOY_PRE_VERIFICATION_GAS
  );
  if (usePaymaster) {
    userOp.paymasterVerificationGasLimit = toHex(
      accountExists
        ? TRADE_PAYMASTER_VERIFICATION_GAS_LIMIT
        : DEPLOY_PAYMASTER_VERIFICATION_GAS_LIMIT
    );
    userOp.paymasterPostOpGasLimit = toHex(
      accountExists ? TRADE_PAYMASTER_POST_OP_GAS_LIMIT : DEPLOY_PAYMASTER_POST_OP_GAS_LIMIT
    );
  }

  // Ask the bundler for accurate gas estimates; keep hardcoded values as fallback.
  try {
    const gasEstimate = await rpcRequest<{
      callGasLimit: Hex;
      verificationGasLimit: Hex;
      preVerificationGas: Hex;
      paymasterVerificationGasLimit?: Hex;
      paymasterPostOpGasLimit?: Hex;
    }>({
      method: "eth_estimateUserOperationGas",
      params: [userOp, entryPointAddress],
    });
    // Add 50% buffer on callGasLimit — bundler simulation underestimates GMX DataStore SSTOREs.
    userOp.callGasLimit = toHex((BigInt(gasEstimate.callGasLimit) * 150n) / 100n);
    userOp.verificationGasLimit = gasEstimate.verificationGasLimit;
    userOp.preVerificationGas = gasEstimate.preVerificationGas;
    if (usePaymaster) {
      if (gasEstimate.paymasterVerificationGasLimit) {
        userOp.paymasterVerificationGasLimit = gasEstimate.paymasterVerificationGasLimit;
      }
      if (gasEstimate.paymasterPostOpGasLimit) {
        userOp.paymasterPostOpGasLimit = gasEstimate.paymasterPostOpGasLimit;
      }
    }
  } catch {
    // Estimation failed — keep hardcoded limits (800k callGasLimit).
  }

  const gasPrice = await publicClient.getGasPrice();
  let maxPriorityFeePerGas: Hex;
  try {
    maxPriorityFeePerGas = await rpcRequest<Hex>({
      method: "rundler_maxPriorityFeePerGas",
      params: [],
    });
  } catch {
    try {
      maxPriorityFeePerGas = await rpcRequest<Hex>({
        method: "eth_maxPriorityFeePerGas",
        params: [],
      });
    } catch {
      maxPriorityFeePerGas = toHex(MIN_PRIORITY_FEE_PER_GAS);
    }
  }
  const priorityFee = BigInt(maxPriorityFeePerGas);
  const effectivePriorityFee = priorityFee > MIN_PRIORITY_FEE_PER_GAS
    ? priorityFee
    : MIN_PRIORITY_FEE_PER_GAS;

  userOp.maxFeePerGas = toHex(gasPrice + effectivePriorityFee * 2n + USER_OP_GAS_BUFFER);
  userOp.maxPriorityFeePerGas = toHex(effectivePriorityFee);

  const paymasterAndData = usePaymaster
    ? buildPaymasterAndData({
        paymasterAddress,
        verificationGasLimit: normalizeHex(userOp.paymasterVerificationGasLimit),
        postOpGasLimit: normalizeHex(userOp.paymasterPostOpGasLimit),
        paymasterData: (userOp.paymasterData ?? "0x") as Hex,
      })
    : ("0x" as Hex);

  const latestNonce = await readEntryPointNonce();
  if (BigInt(userOp.nonce) !== latestNonce) {
    userOp.nonce = toHex(latestNonce);
  }

  const signAndSend = async (): Promise<Hex> => {
    const packed = {
      sender: userOp.sender,
      nonce: BigInt(userOp.nonce),
      initCode,
      callData: userOp.callData,
      accountGasLimits: packGas(userOp.verificationGasLimit, userOp.callGasLimit),
      preVerificationGas: BigInt(userOp.preVerificationGas),
      gasFees: packGas(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas),
      paymasterAndData,
      signature: "0x" as Hex,
    };

    const hash = (await publicClient.readContract({
      address: entryPointAddress,
      abi: EntryPointArtifact.abi,
      functionName: "getUserOpHash",
      args: [packed],
    })) as Hex;

    userOp.signature = await signUserOpHash({
      address,
      userOpHash: hash,
      walletClient,
      sessionSigner: activeSessionSigner,
    });

    try {
      return await rpcRequest<Hex>({
        method: "eth_sendUserOperation",
        params: [userOp, entryPointAddress],
      });
    } catch (error) {
      if (isAaUnsupportedError(error)) {
        throw error;
      }
      throw error;
    }
  };

  const sendWithAdaptiveRetries = async (): Promise<Hex> => {
    const allowAdaptiveRetries = !!activeSessionSigner;
    const maxAttempts = allowAdaptiveRetries ? 6 : 1;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        return await signAndSend();
      } catch (error) {
        lastError = error;

        if (isInvalidAccountSignatureError(error) && activeSessionSigner) {
          if (sessionStrict) {
            throw error;
          }
          activeSessionSigner = null;
          const fallbackNonce = await readEntryPointNonce();
          userOp.nonce = toHex(fallbackNonce);
          continue;
        }

        if (isInvalidAccountSignatureError(error)) {
          const refreshedNonce = await readEntryPointNonce();
          userOp.nonce = toHex(refreshedNonce);
          continue;
        }

        if (isReplacementUnderpricedError(error)) {
          if (!allowAdaptiveRetries) {
            throw error;
          }
          const bumpedPriorityFee = (BigInt(userOp.maxPriorityFeePerGas) * 130n) / 100n + 1n;
          const bumpedMaxFee = (BigInt(userOp.maxFeePerGas) * 130n) / 100n + bumpedPriorityFee;
          userOp.maxPriorityFeePerGas = toHex(bumpedPriorityFee);
          userOp.maxFeePerGas = toHex(bumpedMaxFee);
          continue;
        }

        if (isVerificationEfficiencyLowError(error)) {
          if (!allowAdaptiveRetries) {
            throw error;
          }
          const currentVerificationGasLimit = BigInt(userOp.verificationGasLimit);
          const actualRatio = getEfficiencyActualRatio(error);

          let nextVerificationGasLimit = (currentVerificationGasLimit * 90n) / 100n;
          if (actualRatio) {
            const desiredRatio = 0.4;
            const estimatedActualGas = Number(currentVerificationGasLimit) * actualRatio;
            const computed = Math.ceil(estimatedActualGas / desiredRatio) + 64;
            if (Number.isFinite(computed) && computed > 0) {
              nextVerificationGasLimit = BigInt(computed);
            }
          }

          if (nextVerificationGasLimit >= currentVerificationGasLimit) {
            nextVerificationGasLimit = currentVerificationGasLimit > 1n
              ? currentVerificationGasLimit - 1n
              : currentVerificationGasLimit;
          }

          if (nextVerificationGasLimit < 20_000n) {
            nextVerificationGasLimit = 20_000n;
          }

          if (nextVerificationGasLimit > 40_000n) {
            nextVerificationGasLimit = 40_000n;
          }

          userOp.verificationGasLimit = toHex(nextVerificationGasLimit);
          continue;
        }

        if (isAA26OverVerificationGasLimitError(error)) {
          if (!allowAdaptiveRetries) {
            throw error;
          }
          const currentVerificationGasLimit = BigInt(userOp.verificationGasLimit);
          const nextVerificationGasLimit = currentVerificationGasLimit < 22_000n
            ? 22_000n
            : currentVerificationGasLimit + 2_048n;
          userOp.verificationGasLimit = toHex(nextVerificationGasLimit);
          continue;
        }

        const requiredMaxFeePerGas = getRequiredMaxFeePerGas(error);
        if (requiredMaxFeePerGas) {
          if (!allowAdaptiveRetries) {
            throw error;
          }
          userOp.maxFeePerGas = toHex(requiredMaxFeePerGas + USER_OP_GAS_BUFFER);
          continue;
        }

        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to send UserOperation after adaptive retries");
  };

  return await sendWithAdaptiveRetries();
}
