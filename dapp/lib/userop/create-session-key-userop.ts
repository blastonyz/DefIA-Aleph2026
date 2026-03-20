import {
  encodeFunctionData,
  decodeFunctionResult,
  hexToBytes,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import AccountArtifact from "@/lib/contracts/Account.json";
import AccountFactoryArtifact from "@/lib/contracts/AccountFactory.json";
import EntryPointArtifact from "@/lib/contracts/EntryPoint.json";
import {
  normalizeHex,
  packGas,
  toHex,
  type UserOpUnpacked,
} from "@/lib/userop/encoding";
import { getBundlerRpcRequest, isAaUnsupportedError } from "@/lib/userop/bundler-rpc";

const SESSION_CALL_GAS_LIMIT = 300_000n;
// For session registration we need to avoid both:
// - AA26 over verificationGasLimit (too low account verification gas)
// - efficiency too low (combined verification gas too high)
const SESSION_VERIFICATION_GAS_LIMIT = 30_000n;
const SESSION_PRE_VERIFICATION_GAS = 60_000n;
const SESSION_PAYMASTER_VERIFICATION_GAS_LIMIT = 20_000n;
const SESSION_PAYMASTER_POST_OP_GAS_LIMIT = 30_000n;

type ContractsConfig = {
  entryPoint: string;
  factory: string;
  paymaster: string;
  smartAccount: string;
};

/**
 * Create a UserOp that registers a session key on-chain.
 * One-time setup signed by the owner (MetaMask).
 * After confirmation the session key can sign subsequent UserOps locally.
 */
export async function createSessionKeyUserOp(params: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  config: ContractsConfig;
  sessionKeyPublicKeyHash: Hex;
  expirationDays?: number;
}): Promise<string> {
  const {
    publicClient,
    walletClient,
    config,
    sessionKeyPublicKeyHash,
    expirationDays = 7,
  } = params;

  const rpcRequest = getBundlerRpcRequest({
    publicClient,
    chainId: publicClient.chain?.id,
  });

  const entryPointAddress = config.entryPoint as Hex;
  const paymasterAddress = config.paymaster as Hex;
  const usePaymaster = paymasterAddress.toLowerCase() !== "0x0000000000000000000000000000000000000000";
  const factoryAddress = config.factory as Hex;

  const [connectedAccount] = await walletClient.getAddresses();
  if (!connectedAccount) {
    throw new Error("No wallet connected");
  }

  // 1. Derive smart account address
  const { sender, accountExists } = await deriveSender(publicClient, config, connectedAccount as Hex);

  // 2. Get current nonce from EntryPoint
  const nonce = (await publicClient.readContract({
    address: entryPointAddress,
    abi: EntryPointArtifact.abi,
    functionName: "getNonce",
    args: [sender, 0n],
  })) as bigint;

  // 3. Build session registration callData and auto-detect the valid path
  //    (some deployed Account variants accept direct call from EntryPoint,
  //     others require execute(self, ...)).
  const expirationDuration = BigInt(expirationDays * 24 * 60 * 60);
  const createSessionKeyCallData = encodeFunctionData({
    abi: AccountArtifact.abi,
    functionName: "createSessionKey",
    args: [sessionKeyPublicKeyHash, expirationDuration],
  });

  const executeCallData = encodeFunctionData({
    abi: AccountArtifact.abi,
    functionName: "execute",
    args: [
      sender,
      0n,
      createSessionKeyCallData,
      0,
    ],
  });

  const registrationCallData = accountExists
    ? await selectRegistrationCallData({
        publicClient,
        sender,
        entryPointAddress,
        directCallData: createSessionKeyCallData,
        executeCallData,
      })
    : executeCallData;

  // 4. Build UserOp with deterministic gas limits (single-sign flow)
  const userOp: UserOpUnpacked = {
    sender,
    nonce: toHex(nonce),
    callData: registrationCallData,
    callGasLimit: toHex(SESSION_CALL_GAS_LIMIT),
    verificationGasLimit: toHex(SESSION_VERIFICATION_GAS_LIMIT),
    preVerificationGas: toHex(SESSION_PRE_VERIFICATION_GAS),
    maxFeePerGas: toHex(4_000_000_000n),
    maxPriorityFeePerGas: toHex(2_000_000_000n),
    signature: ("0x" + "ff".repeat(65)) as Hex,
  };

  if (!accountExists) {
    const factoryData = encodeFunctionData({
      abi: AccountFactoryArtifact.abi,
      functionName: "createAccount",
      args: [connectedAccount as Hex],
    });

    userOp.factory = factoryAddress;
    userOp.factoryData = factoryData;
  }

  if (usePaymaster) {
    userOp.paymaster = paymasterAddress;
    userOp.paymasterData = "0x";
    userOp.paymasterVerificationGasLimit = toHex(SESSION_PAYMASTER_VERIFICATION_GAS_LIMIT);
    userOp.paymasterPostOpGasLimit = toHex(SESSION_PAYMASTER_POST_OP_GAS_LIMIT);
  }

  // 5. Fetch fees
  const gasPrice = await publicClient.getGasPrice();
  let priorityFeeHex: Hex;
  try {
    priorityFeeHex = await rpcRequest<Hex>({
      method: "rundler_maxPriorityFeePerGas",
      params: [],
    });
  } catch {
    try {
      priorityFeeHex = await rpcRequest<Hex>({
        method: "eth_maxPriorityFeePerGas",
        params: [],
      });
    } catch {
      priorityFeeHex = toHex(100_000_000n);
    }
  }
  const priorityFee = BigInt(priorityFeeHex);
  const effectivePriority = priorityFee > 100_000_000n ? priorityFee : 100_000_000n;
  userOp.maxFeePerGas = toHex(gasPrice + effectivePriority * 2n + 1_000_000n);
  userOp.maxPriorityFeePerGas = toHex(effectivePriority);

  // 7. Build packed UserOp for EntryPoint hash calculation
  const initCode = userOp.factory && userOp.factoryData
    ? (`${userOp.factory}${userOp.factoryData.slice(2)}` as Hex)
    : ("0x" as Hex);

  const paymasterAndData = usePaymaster
    ? (paymasterAddress +
        BigInt(normalizeHex(userOp.paymasterVerificationGasLimit)).toString(16).padStart(32, "0") +
        BigInt(normalizeHex(userOp.paymasterPostOpGasLimit)).toString(16).padStart(32, "0")) as Hex
    : "0x" as Hex;

  const userOpPackedFinal = {
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

  const userOpHash = (await publicClient.readContract({
    address: entryPointAddress,
    abi: EntryPointArtifact.abi,
    functionName: "getUserOpHash",
    args: [userOpPackedFinal],
  })) as Hex;

  // 8. Sign the EntryPoint hash with owner's wallet (one MetaMask prompt)
  userOp.signature = await walletClient.signMessage({
    account: connectedAccount as Hex,
    message: { raw: hexToBytes(userOpHash) },
  });

  // 9. Send UserOp to bundler
  let opHash: string;
  try {
    opHash = await rpcRequest<string>({
      method: "eth_sendUserOperation",
      params: [userOp, entryPointAddress],
    });
  } catch (error) {
    if (isAaUnsupportedError(error)) {
      throw new Error(
        "Bundler RPC no soporta Account Abstraction en esta red. Configura NEXT_PUBLIC_BUNDLER_RPC_URL_FUJI (o NEXT_PUBLIC_BUNDLER_RPC_URL)."
      );
    }
    throw error;
  }

  return opHash;
}

async function deriveSender(
  publicClient: PublicClient,
  config: ContractsConfig,
  owner: Hex
): Promise<{ sender: Hex; accountExists: boolean }> {
  const accountAddress = config.smartAccount as Hex;
  const factoryAddress = config.factory as Hex;

  const bytecode = await publicClient.getCode({ address: accountAddress });
  const accountExists = !!bytecode && bytecode !== "0x";

  if (accountExists) {
    return { sender: accountAddress, accountExists: true };
  }

  const factoryData = encodeFunctionData({
    abi: AccountFactoryArtifact.abi,
    functionName: "createAccount",
    args: [owner],
  });

  const senderCall = await publicClient.call({
    to: factoryAddress,
    data: factoryData,
  });

  if (!senderCall.data) {
    throw new Error("AccountFactory createAccount returned no data");
  }

  const derivedSender = decodeFunctionResult({
    abi: AccountFactoryArtifact.abi,
    functionName: "createAccount",
    data: senderCall.data,
  }) as Hex;

  const derivedBytecode = await publicClient.getCode({ address: derivedSender });
  const derivedExists = !!derivedBytecode && derivedBytecode !== "0x";

  return { sender: derivedSender, accountExists: derivedExists };
}

async function selectRegistrationCallData(params: {
  publicClient: PublicClient;
  sender: Hex;
  entryPointAddress: Hex;
  directCallData: Hex;
  executeCallData: Hex;
}): Promise<Hex> {
  const { publicClient, sender, entryPointAddress, directCallData, executeCallData } = params;

  const testCall = async (data: Hex) => {
    await publicClient.call({
      to: sender,
      data,
      account: entryPointAddress,
    });
  };

  try {
    await testCall(directCallData);
    return directCallData;
  } catch {
    // ignore and try execute(self,...) path
  }

  try {
    await testCall(executeCallData);
    return executeCallData;
  } catch {
    // ignore and throw explicit error below
  }

  throw new Error("Account rejected both session registration modes (direct and execute).");
}
