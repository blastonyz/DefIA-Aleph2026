import { ethers } from "ethers";
import GMXPositionExecutorArtifact from "../../artifacts/contracts/GMXPositionExecutor.sol/GMXPositionExecutor.json" with { type: "json" };
import * as dotenv from "dotenv";
import { createWallet } from "../lib/network.js";

dotenv.config();

// Avalanche Fuji GMX v2 addresses (from deployed executor gmxRouter / gmxRouterSpender)
const GMX_FUJI_EXCHANGE_ROUTER = "0x0a458C96Ac0B2a130DA4BdF1aAdD4cb7Be036d11";
const GMX_FUJI_ROUTER_SPENDER  = "0x5e7d61e4C52123ADF651961e4833aCc349b61491";

function normalizeAddress(value: string, label: string): string {
    try {
        return ethers.getAddress(value);
    } catch {
        throw new Error(`Invalid ${label}: ${value}`);
    }
}

async function main() {
    console.log("🚀 Deploying GMXPositionExecutor v2 (multi-forwarder) to Avalanche Fuji…\n");

    const { wallet } = createWallet();

    console.log("Deploying from:", wallet.address);
    const balance = await wallet.provider!.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "AVAX\n");

    if (balance === 0n) {
        console.error("❌ Wallet has no AVAX. Fund it at https://faucet.avax.network/ and retry.");
        process.exitCode = 1;
        return;
    }

    // Resolve initial forwarder (optional)
    const initialForwarder = normalizeAddress(
        process.env.AVAX_SMART_ACCOUNT_ADDRESS?.trim() ||
        process.env.SMART_ACCOUNT_ADDRESS?.trim() ||
        ethers.ZeroAddress,
        "initialForwarder"
    );

    console.log("GMX Exchange Router:", GMX_FUJI_EXCHANGE_ROUTER);
    console.log("GMX Router Spender :", GMX_FUJI_ROUTER_SPENDER);
    console.log("Initial Forwarder  :", initialForwarder === ethers.ZeroAddress ? "(none)" : initialForwarder);
    console.log();

    const Factory = new ethers.ContractFactory(
        GMXPositionExecutorArtifact.abi,
        GMXPositionExecutorArtifact.bytecode,
        wallet
    );

    const executor = await Factory.deploy(
        GMX_FUJI_EXCHANGE_ROUTER,
        GMX_FUJI_ROUTER_SPENDER,
        initialForwarder
    );
    await executor.waitForDeployment();
    const executorAddress = await executor.getAddress();

    console.log("✅ GMXPositionExecutor v2:", executorAddress);
    console.log("\n📝 Next steps:");
    console.log("  1. Update dapp/.env:");
    console.log(`       NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR=${executorAddress}`);
    console.log("  2. Update hardhat/.env:");
    console.log(`       MOLTBOT_GMX_EXECUTOR=${executorAddress}`);
    console.log("  3. Run set-order-config to configure the executor");
    console.log("  4. Add more forwarders:");
    console.log("       npm run add:gmx-forwarder:fuji");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
