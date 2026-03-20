import { ethers } from "ethers";
import GMXPositionExecutorArtifact from "../../artifacts/contracts/GMXPositionExecutor.sol/GMXPositionExecutor.json" with { type: "json" };
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    console.log("🚀 Deploying GMXPositionExecutor...\n");

    const provider = new ethers.JsonRpcProvider(
        process.env.ALCHEMY_ARB_RPC_URL ?? "http://localhost:8545"
    );
    const wallet = new ethers.Wallet(
        process.env.ARBITRUM_SEPOLIA_PK || "",
        provider
    );

    console.log("Deploying from:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH\n");

    // Get smart account address
    const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS;
    if (!smartAccountAddress) {
        console.error("❌ SMART_ACCOUNT_ADDRESS not set in .env");
        console.error("   Deploy AA contracts first: npm run deploy:account");
        process.exitCode = 1;
        return;
    }

    console.log("Smart Account Address:", smartAccountAddress);
    console.log();

    // Deploy GMXPositionExecutor
    console.log("Deploying GMXPositionExecutor...");
    const GMXPositionExecutorFactory = new ethers.ContractFactory(
        GMXPositionExecutorArtifact.abi,
        GMXPositionExecutorArtifact.bytecode,
        wallet
    );
    const gmxExecutor = await GMXPositionExecutorFactory.deploy();
    await gmxExecutor.waitForDeployment();
    const gmxExecutorAddress = await gmxExecutor.getAddress();
    console.log("✅ GMXPositionExecutor:", gmxExecutorAddress);

    console.log("\n📝 Summary:");
    console.log("  Smart Account:      ", smartAccountAddress);
    console.log("  GMXPositionExecutor:", gmxExecutorAddress);
    console.log("\n✅ Executor deployed successfully");
    console.log("\n👉 Update your .env with:");
    console.log(`  MOLTBOT_GMX_EXECUTOR=${gmxExecutorAddress}`);
    console.log("\n👉 Then execute user operations: npm run execute");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
