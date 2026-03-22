import { ethers } from "ethers";
import * as dotenv from "dotenv";
import GMXPositionExecutorArtifact from "../../artifacts/contracts/GMXPositionExecutor.sol/GMXPositionExecutor.json" with { type: "json" };
import { createWallet } from "../lib/network.js";

dotenv.config();

const FACTORY_ABI = [
    "function createAccount(address owner) external returns (address)",
];

function normalizeAddress(value: string, label: string): string {
    try {
        return ethers.getAddress(value);
    } catch {
        throw new Error(`Invalid ${label}: ${value}`);
    }
}

async function resolveTargetForwarder(provider: ethers.Provider): Promise<string> {
    const explicit = process.env.GMX_FORWARDER?.trim();
    if (explicit) {
        return normalizeAddress(explicit, "GMX_FORWARDER");
    }

    const owner = process.env.GMX_ACCOUNT_OWNER?.trim();
    const factoryAddress =
        process.env.NEXT_PUBLIC_FACTORY_ADDRESS?.trim() ||
        process.env.AVAX_FACTORY_ADDRESS?.trim() ||
        process.env.FACTORY_ADDRESS?.trim();

    if (!owner || !factoryAddress) {
        throw new Error(
            "Provide GMX_FORWARDER directly, or set GMX_ACCOUNT_OWNER + " +
            "NEXT_PUBLIC_FACTORY_ADDRESS / AVAX_FACTORY_ADDRESS / FACTORY_ADDRESS"
        );
    }

    const factory = new ethers.Contract(
        normalizeAddress(factoryAddress, "FACTORY_ADDRESS"),
        FACTORY_ABI,
        provider
    );
    return normalizeAddress(await factory.createAccount(normalizeAddress(owner, "GMX_ACCOUNT_OWNER")), "derived forwarder");
}

async function main() {
    const { name, wallet } = createWallet();

    const executorAddressRaw =
        process.env.NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR?.trim() ||
        process.env.MOLTBOT_GMX_EXECUTOR?.trim();

    if (!executorAddressRaw) {
        throw new Error("NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR or MOLTBOT_GMX_EXECUTOR is required");
    }

    const executorAddress = normalizeAddress(executorAddressRaw, "MOLTBOT_GMX_EXECUTOR");
    const targetForwarder = await resolveTargetForwarder(wallet.provider!);

    const executor = new ethers.Contract(executorAddress, GMXPositionExecutorArtifact.abi, wallet);

    const [ownerAddr, isAllowed] = await Promise.all([
        executor.owner() as Promise<string>,
        executor.allowedForwarders(targetForwarder) as Promise<boolean>,
    ]);

    console.log("Network  :", name);
    console.log("Executor :", executorAddress);
    console.log("Wallet   :", wallet.address);
    console.log("Owner    :", ownerAddr);
    console.log("Forwarder:", targetForwarder, isAllowed ? "(already allowed)" : "(not yet allowed)");

    if (ownerAddr.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error("Connected signer is not executor owner. Use the deployer/owner key.");
    }

    if (isAllowed) {
        console.log("\n⚠️  Forwarder already in allowlist — nothing to do.");
        return;
    }

    console.log("\nAdding forwarder…");
    const tx = await executor.addForwarder(targetForwarder);
    console.log("Tx:", tx.hash);
    await tx.wait();
    console.log("✅ Forwarder added successfully.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
