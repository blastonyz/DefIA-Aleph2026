import { ethers } from "ethers";
import EntryPointArtifact from "../node_modules/@account-abstraction/contracts/artifacts/EntryPoint.json" with { type: "json" };
import AccountArtifact from "../artifacts/contracts/Account.sol/Account.json" with { type: "json" };
import AccountFactoryArtifact from "../artifacts/contracts/AccountFactory.sol/AccountFactory.json" with { type: "json" };
import { buildMoltbotExecutionTarget } from "./lib/moltbot-target.js";
import * as dotenv from "dotenv";
dotenv.config();

// ─── Config ────────────────────────────────────────────────────────────────
const ENTRYPOINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS ?? "";
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS ?? "";
const USE_PAYMASTER = (process.env.USE_PAYMASTER ?? "false") === "true";

// ─── Types ──────────────────────────────────────────────────────────────────
type UserOpUnpacked = {
    sender: string;
    nonce: string;
    callData: string;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymaster?: string;
    paymasterData?: string;
    paymasterVerificationGasLimit?: string;
    paymasterPostOpGasLimit?: string;
    factory?: string;
    factoryData?: string;
    signature: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const toHex = (n: bigint | string | number) =>
    "0x" + BigInt(n).toString(16);

const packGas = (high: string, low: string) =>
    "0x" +
    BigInt(high).toString(16).padStart(32, "0") +
    BigInt(low).toString(16).padStart(32, "0");

const normalizeHex = (value?: string | null) => value ?? "0x0";

async function buildAccountExecuteCallData(params: {
    provider: ethers.JsonRpcProvider;
    accountAddress: string;
    accountInterface: ethers.Interface;
    targetContract: string;
    targetValueWei: bigint;
    targetCallData: string;
    operationType: number;
    accountExists: boolean;
}) {
    const {
        provider,
        accountAddress,
        accountInterface,
        targetContract,
        targetValueWei,
        targetCallData,
        operationType,
        accountExists,
    } = params;

    const operationTypeCallData = accountInterface.encodeFunctionData("execute", [
        targetContract,
        targetValueWei,
        targetCallData,
        operationType,
    ]);

    if (!accountExists) {
        return {
            callData: operationTypeCallData,
            executeVariant: "operation-type" as const,
        };
    }

    try {
        await provider.call({
            from: ENTRYPOINT_ADDRESS,
            to: accountAddress,
            data: operationTypeCallData,
        });

        return {
            callData: operationTypeCallData,
            executeVariant: "operation-type" as const,
        };
    } catch {
        const legacyAccountInterface = new ethers.Interface([
            "function execute(address dest, uint256 value, bytes func)",
        ]);

        return {
            callData: legacyAccountInterface.encodeFunctionData("execute", [
                targetContract,
                targetValueWei,
                targetCallData,
            ]),
            executeVariant: "legacy" as const,
        };
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    if (!FACTORY_ADDRESS) throw new Error("FACTORY_ADDRESS not set in .env");

    const provider = new ethers.JsonRpcProvider(
        process.env.ALCHEMY_ARB_RPC_URL ?? "http://localhost:8545"
    );
    const wallet = new ethers.Wallet(
        process.env.ARBITRUM_SEPOLIA_PK ?? process.env.ETH_SEPOLIA_PK ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        provider
    );
    const entryPoint = new ethers.Contract(ENTRYPOINT_ADDRESS, EntryPointArtifact.abi, wallet);
    const factoryInterface = new ethers.Interface(AccountFactoryArtifact.abi);

    // ── 1. Resolve smart account address ──────────────────────────────────
    const factoryData = factoryInterface.encodeFunctionData("createAccount", [wallet.address]);
    const initCode = FACTORY_ADDRESS + factoryData.slice(2);

    let sender: string;
    try {
        await entryPoint.getSenderAddress(initCode);
        throw new Error("getSenderAddress did not revert");
    } catch (ex: any) {
        sender = "0x" + ex.data.slice(-40);
    }
    console.log("✅ Smart account address:", sender);
    console.log("Add to .env => SMART_ACCOUNT_ADDRESS=" + sender);

    const code = await provider.getCode(sender);
    const accountExists = code !== "0x";
    console.log("Account exists:", accountExists);

    const senderDeposit = await entryPoint.balanceOf(sender);
    console.log("EntryPoint deposit (smart account):", ethers.formatEther(senderDeposit), "ETH");
    if (PAYMASTER_ADDRESS && USE_PAYMASTER) {
        const paymasterDeposit = await entryPoint.balanceOf(PAYMASTER_ADDRESS);
        console.log("EntryPoint deposit (paymaster):", ethers.formatEther(paymasterDeposit), "ETH");
        if (paymasterDeposit === 0n) {
            throw new Error(
                "AA31: paymaster deposit is 0. Run scripts/deposit.ts again so it funds both the smart account and the paymaster."
            );
        }
    }

    // ── 2. Build callData for the target operation ─────────────────────────
    const accountInterface = new ethers.Interface(AccountArtifact.abi);

    // ↓↓↓ TODO: Replace with your Aleph contract call ↓↓↓
    // Example: call someContract.someFunction(arg1, arg2)
    // const targetContract = new ethers.Interface(YourContractABI);
    // const innerCallData = targetContract.encodeFunctionData("yourFunction", [arg1, arg2]);
    // const callData = accountInterface.encodeFunctionData("execute", [TARGET_CONTRACT_ADDRESS, 0n, innerCallData]);

    const builtTarget = buildMoltbotExecutionTarget();
    const targetContract = builtTarget.targetContract;
    const targetValueWei = builtTarget.valueWei;
    const targetCallData = builtTarget.targetCallData;

    const executePayload = await buildAccountExecuteCallData({
        provider,
        accountAddress: sender,
        accountInterface,
        targetContract,
        targetValueWei,
        targetCallData,
        operationType: builtTarget.operationType,
        accountExists,
    });
    const callData = executePayload.callData;

    console.log("Execution strategy:", builtTarget.strategyLabel);
    console.log("Operation type:", builtTarget.operationType);
    console.log("Execute ABI variant:", executePayload.executeVariant);
    console.log("Target contract:", targetContract);
    console.log("Target value (wei):", targetValueWei.toString());
    console.log("Target calldata:", targetCallData);

    // ── 3. Get nonce from EntryPoint ──────────────────────────────────────
    const nonce: bigint = accountExists
        ? await entryPoint.getNonce(sender, 0)
        : 0n;

    // ── 4. Base UserOp (zeros for gas estimation) ─────────────────────────
    const userOp: UserOpUnpacked = {
        sender,
        nonce: toHex(nonce),
        callData,
        callGasLimit: "0x0",
        verificationGasLimit: "0x0",
        preVerificationGas: "0x0",
        maxFeePerGas: "0x0",
        maxPriorityFeePerGas: "0x0",
        signature: "0x",
    };

    if (!accountExists) {
        userOp.factory = FACTORY_ADDRESS;
        userOp.factoryData = factoryData;
    }

    if (PAYMASTER_ADDRESS && USE_PAYMASTER) {
        userOp.paymaster = PAYMASTER_ADDRESS;
        userOp.paymasterData = "0x";
        userOp.paymasterVerificationGasLimit = "0x0";
        userOp.paymasterPostOpGasLimit = "0x0";
    }

    // ── 5. Sign initial hash (for gas estimation) ─────────────────────────
    const initCodePacked = accountExists ? "0x" : initCode;
    const userOpPackedForHash = {
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: initCodePacked,
        callData: userOp.callData,
        accountGasLimits: packGas("0x0", "0x0"),
        preVerificationGas: "0x0",
        gasFees: packGas("0x0", "0x0"),
        paymasterAndData: PAYMASTER_ADDRESS && USE_PAYMASTER
            ? PAYMASTER_ADDRESS + "00000000000000000000000000000000" + "00000000000000000000000000000000" + "00"
            : "0x",
        signature: "0x",
    };

    const baseHash: string = await entryPoint.getUserOpHash(userOpPackedForHash);
    userOp.signature = await wallet.signMessage(ethers.getBytes(baseHash));

    // ── 6. Estimate gas via bundler ───────────────────────────────────────
    console.log("\nEstimating gas...");
    const gasEstimate = await provider.send("eth_estimateUserOperationGas", [
        userOp,
        ENTRYPOINT_ADDRESS,
    ]);
    console.log("Gas estimate:", gasEstimate);

    userOp.callGasLimit = gasEstimate.callGasLimit;
    userOp.verificationGasLimit = gasEstimate.verificationGasLimit;
    userOp.preVerificationGas = gasEstimate.preVerificationGas;
    if (PAYMASTER_ADDRESS && USE_PAYMASTER) {
        userOp.paymasterVerificationGasLimit = normalizeHex(gasEstimate.paymasterVerificationGasLimit);
        userOp.paymasterPostOpGasLimit = normalizeHex(gasEstimate.paymasterPostOpGasLimit);
    }

    // ── 7. Get gas prices ─────────────────────────────────────────────────
    const { maxFeePerGas } = await provider.getFeeData();
    const maxPriorityFeePerGas: string = await provider.send("rundler_maxPriorityFeePerGas", []);
    userOp.maxFeePerGas = toHex(maxFeePerGas ?? 0n);
    userOp.maxPriorityFeePerGas = toHex(BigInt(maxPriorityFeePerGas));

    // ── 8. Re-sign with final gas values ──────────────────────────────────
    const paymasterAndData = PAYMASTER_ADDRESS && USE_PAYMASTER
        ? PAYMASTER_ADDRESS +
          BigInt(normalizeHex(userOp.paymasterVerificationGasLimit))
              .toString(16)
              .padStart(32, "0") +
          BigInt(normalizeHex(userOp.paymasterPostOpGasLimit))
              .toString(16)
              .padStart(32, "0") +
          "00"
        : "0x";

    const userOpPackedFinal = {
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: initCodePacked,
        callData: userOp.callData,
        accountGasLimits: packGas(userOp.verificationGasLimit, userOp.callGasLimit),
        preVerificationGas: userOp.preVerificationGas,
        gasFees: packGas(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas),
        paymasterAndData,
        signature: "0x",
    };

    const finalHash: string = await entryPoint.getUserOpHash(userOpPackedFinal);
    userOp.signature = await wallet.signMessage(ethers.getBytes(finalHash));

    if (PAYMASTER_ADDRESS && USE_PAYMASTER) {
        userOp.paymasterVerificationGasLimit = normalizeHex(userOp.paymasterVerificationGasLimit);
        userOp.paymasterPostOpGasLimit = normalizeHex(userOp.paymasterPostOpGasLimit);
    }

    // ── 9. Send UserOperation ─────────────────────────────────────────────
    console.log("\nSending UserOperation...");
    const opHash: string = await provider.send("eth_sendUserOperation", [
        userOp,
        ENTRYPOINT_ADDRESS,
    ]);
    console.log("✅ UserOperation hash:", opHash);
    console.log("Track on Jiffyscan: https://www.jiffyscan.xyz/userOpHash/" + opHash + "?network=arbitrum-sepolia");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
