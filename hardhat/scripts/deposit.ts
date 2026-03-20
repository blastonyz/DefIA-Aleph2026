import { ethers } from "ethers";
import EntryPointArtifact from "../node_modules/@account-abstraction/contracts/artifacts/EntryPoint.json" with { type: "json" };
import AccountFactoryArtifact from "../artifacts/contracts/AccountFactory.sol/AccountFactory.json" with { type: "json" };
import * as dotenv from "dotenv";
dotenv.config();

const ENTRYPOINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS ?? "";
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS ?? "";
const SMART_ACCOUNT_ADDRESS = process.env.SMART_ACCOUNT_ADDRESS ?? "";
const USE_PAYMASTER = (process.env.USE_PAYMASTER ?? "true") === "true";

async function main() {
    if (!SMART_ACCOUNT_ADDRESS && !FACTORY_ADDRESS) {
        throw new Error("Set SMART_ACCOUNT_ADDRESS or FACTORY_ADDRESS in .env");
    }

    const provider = new ethers.JsonRpcProvider(
        process.env.ALCHEMY_ARB_RPC_URL ?? "http://localhost:8545"
    );
    const wallet = new ethers.Wallet(
        process.env.ARBITRUM_SEPOLIA_PK ?? process.env.ETH_SEPOLIA_PK ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        provider
    );

    const targetSmartAccount = SMART_ACCOUNT_ADDRESS || await resolveSmartAccountAddress(provider, wallet.address);
    console.log("Resolved smart account:", targetSmartAccount);
    console.log("Configured paymaster:", PAYMASTER_ADDRESS || "not set");

    const balance = await provider.getBalance(wallet.address);
    console.log("Wallet balance:", ethers.formatEther(balance), "ETH");

    const entryPoint = new ethers.Contract(ENTRYPOINT_ADDRESS, EntryPointArtifact.abi, wallet);

    const depositAmount = process.env.DEPOSIT_AMOUNT ?? "0.01";
    const amountWei = ethers.parseEther(depositAmount);

    const depositToAddress = async (label: string, address: string) => {
        const currentDeposit = await entryPoint.balanceOf(address);
        console.log(`Current ${label} EntryPoint deposit:`, ethers.formatEther(currentDeposit), "ETH");
        const tx = await entryPoint.depositTo(address, { value: amountWei });
        console.log(`Tx sent (${label}):`, tx.hash);
        const receipt = await tx.wait();
        console.log(`✅ Deposited ${depositAmount} ETH to ${label} - block:`, receipt.blockNumber);
        const newDeposit = await entryPoint.balanceOf(address);
        console.log(`New ${label} EntryPoint deposit:`, ethers.formatEther(newDeposit), "ETH");
    };

    await depositToAddress("smart account", targetSmartAccount);

    if (PAYMASTER_ADDRESS && USE_PAYMASTER) {
        await depositToAddress("paymaster", PAYMASTER_ADDRESS);
    }
}

async function resolveSmartAccountAddress(provider: ethers.Provider, ownerAddress: string): Promise<string> {
    const factory = new ethers.Contract(FACTORY_ADDRESS, AccountFactoryArtifact.abi, provider);
    const smartAccount: string = await factory.createAccount.staticCall(ownerAddress);
    return smartAccount;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
