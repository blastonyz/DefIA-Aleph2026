import { ethers } from "ethers";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { createWallet } from "../lib/network.js";

dotenv.config();
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../dapp/.env") });

const erc20MintableAbi = [
    "function mint(address account, uint256 amount)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
] as const;

const DEFAULT_GMX_COLLATERAL_TOKEN = "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F";
const DEFAULT_GMX_COLLATERAL_AMOUNT = 1000000n;

function resolveExecutorAddress(networkName: string): string {
    if (networkName === "avalancheFuji") {
        return process.env.MOLTBOT_GMX_EXECUTOR ?? "";
    }

    return process.env.MOLTBOT_GMX_EXECUTOR ?? "";
}

function resolveCollateralToken(): string {
    return process.env.MOLTBOT_GMX_COLLATERAL_TOKEN ?? process.env.NEXT_PUBLIC_GMX_COLLATERAL_TOKEN ?? DEFAULT_GMX_COLLATERAL_TOKEN;
}

function resolveCollateralAmount(): bigint {
    const configuredAmount = process.env.MOLTBOT_GMX_COLLATERAL_AMOUNT ?? process.env.NEXT_PUBLIC_GMX_COLLATERAL_AMOUNT;
    return configuredAmount ? BigInt(configuredAmount) : DEFAULT_GMX_COLLATERAL_AMOUNT;
}

async function main() {
    const { name, wallet } = createWallet();
    const executor = resolveExecutorAddress(name);
    if (!executor) {
        throw new Error("MOLTBOT_GMX_EXECUTOR not configured");
    }

    const collateralToken = resolveCollateralToken();
    const amount = resolveCollateralAmount();
    const token = new ethers.Contract(collateralToken, erc20MintableAbi, wallet);

    const [symbol, decimals, beforeBalance] = await Promise.all([
        token.symbol().catch(() => "TOKEN"),
        token.decimals().catch(() => 6),
        token.balanceOf(executor),
    ]);

    console.log("Network:", name);
    console.log("Executor:", executor);
    console.log("Collateral token:", collateralToken);
    console.log("Mint amount raw:", amount.toString());
    console.log("Executor balance before:", ethers.formatUnits(beforeBalance, decimals), symbol);

    const tx = await token.mint(executor, amount);
    console.log("Mint tx:", tx.hash);
    await tx.wait();

    const afterBalance = await token.balanceOf(executor);
    console.log("Executor balance after:", ethers.formatUnits(afterBalance, decimals), symbol);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});