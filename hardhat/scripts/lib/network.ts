import { ethers } from "ethers";

type NetworkConfig = {
    name: string;
    rpcUrl: string;
    privateKey: string;
};

function resolveNetworkConfig(): NetworkConfig {
    const networkArgIndex = process.argv.findIndex((arg) => arg === "--network");
    const networkName =
        (networkArgIndex >= 0 ? process.argv[networkArgIndex + 1] : undefined) ??
        process.env.HARDHAT_NETWORK ??
        "arbitrum";

    if (networkName === "avalancheFuji") {
        return {
            name: networkName,
            rpcUrl: process.env.AVAX_RPC_URL ?? "http://localhost:8545",
            privateKey:
                process.env.AVALANCHE_FUJI_PK ??
                process.env.ARBITRUM_SEPOLIA_PK ??
                process.env.ETH_SEPOLIA_PK ??
                "",
        };
    }

    return {
        name: networkName,
        rpcUrl: process.env.ALCHEMY_ARB_RPC_URL ?? process.env.RPC_URL ?? "http://localhost:8545",
        privateKey:
            process.env.ARBITRUM_SEPOLIA_PK ??
            process.env.ETH_SEPOLIA_PK ??
            process.env.AVALANCHE_FUJI_PK ??
            "",
    };
}

export function createWallet() {
    const config = resolveNetworkConfig();
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    return { ...config, provider, wallet };
}