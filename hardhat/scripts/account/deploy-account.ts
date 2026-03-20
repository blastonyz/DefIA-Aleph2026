import { ethers } from "ethers";
import AccountFactoryArtifact from "../../artifacts/contracts/AccountFactory.sol/AccountFactory.json" with { type: "json" };
import PaymasterArtifact from "../../artifacts/contracts/Paymaster.sol/Paymaster.json" with { type: "json" };
import * as dotenv from "dotenv";
dotenv.config();

const ENTRYPOINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

async function main() {
    console.log("🚀 Deploying Account Abstraction infrastructure...\n");

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

    // 1. Deploy Paymaster
    console.log("1. Deploying Paymaster...");
    const PaymasterFactory = new ethers.ContractFactory(
        PaymasterArtifact.abi,
        PaymasterArtifact.bytecode,
        wallet
    );
    const paymaster = await PaymasterFactory.deploy();
    await paymaster.waitForDeployment();
    const paymasterAddress = await paymaster.getAddress();
    console.log("✅ Paymaster:", paymasterAddress);

    // 2. Deploy AccountFactory
    console.log("\n2. Deploying AccountFactory...");
    const AccountFactoryFactory = new ethers.ContractFactory(
        AccountFactoryArtifact.abi,
        AccountFactoryArtifact.bytecode,
        wallet
    );
    const accountFactory = await AccountFactoryFactory.deploy();
    await accountFactory.waitForDeployment();
    const accountFactoryAddress = await accountFactory.getAddress();
    console.log("✅ AccountFactory:", accountFactoryAddress);

    console.log("\n📝 Summary:");
    console.log("  EntryPoint:     ", ENTRYPOINT_ADDRESS);
    console.log("  Paymaster:      ", paymasterAddress);
    console.log("  AccountFactory: ", accountFactoryAddress);
    console.log("\n✅ All AA contracts deployed successfully");
    console.log("\n👉 Update your .env with:");
    console.log(`  PAYMASTER_ADDRESS=${paymasterAddress}`);
    console.log(`  FACTORY_ADDRESS=${accountFactoryAddress}`);
    console.log("\n👉 Then deploy executor: npm run deploy:gmx-executor");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
