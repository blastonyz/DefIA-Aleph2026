import { ethers } from "ethers";
import * as dotenv from "dotenv";
import GMXPositionExecutorArtifact from "../../../dapp/lib/contracts/GMXPositionExecutor.json" with { type: "json" };
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
  const explicitForwarder = process.env.GMX_FORWARDER?.trim();
  if (explicitForwarder) {
    return normalizeAddress(explicitForwarder, "GMX_FORWARDER");
  }

  const owner = process.env.GMX_ACCOUNT_OWNER?.trim();
  const factoryAddress =
    process.env.NEXT_PUBLIC_FACTORY_ADDRESS?.trim() ||
    process.env.FACTORY_ADDRESS?.trim();

  if (!owner || !factoryAddress) {
    throw new Error(
      "Set GMX_FORWARDER directly, or set GMX_ACCOUNT_OWNER + NEXT_PUBLIC_FACTORY_ADDRESS/FACTORY_ADDRESS"
    );
  }

  const normalizedOwner = normalizeAddress(owner, "GMX_ACCOUNT_OWNER");
  const normalizedFactory = normalizeAddress(factoryAddress, "FACTORY_ADDRESS");
  const factory = new ethers.Contract(normalizedFactory, FACTORY_ABI, provider);
  const derivedForwarder = (await factory.createAccount(normalizedOwner)) as string;
  return normalizeAddress(derivedForwarder, "derived forwarder");
}

async function main() {
  const { name, wallet, provider } = createWallet();

  const executorAddressRaw =
    process.env.NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR?.trim() ||
    process.env.MOLTBOT_GMX_EXECUTOR?.trim();

  if (!executorAddressRaw) {
    throw new Error("NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR or MOLTBOT_GMX_EXECUTOR is required");
  }

  const executorAddress = normalizeAddress(executorAddressRaw, "MOLTBOT_GMX_EXECUTOR");
  const executor = new ethers.Contract(executorAddress, GMXPositionExecutorArtifact.abi, wallet);

  const targetForwarder = await resolveTargetForwarder(provider);

  const [owner, isAllowed] = await Promise.all([
    executor.owner() as Promise<string>,
    executor.allowedForwarders(targetForwarder) as Promise<boolean>,
  ]);

  console.log("Network  :", name);
  console.log("Executor :", executorAddress);
  console.log("Signer   :", wallet.address);
  console.log("Owner    :", owner);
  console.log("Forwarder:", targetForwarder, isAllowed ? "(already allowed)" : "(not yet allowed)");

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Connected signer is not executor owner. Use deployer/owner key.");
  }

  if (isAllowed) {
    console.log("✅ Forwarder already in allowlist — nothing to do.");
    return;
  }

  const tx = await executor.addForwarder(targetForwarder);
  console.log("addForwarder tx:", tx.hash);
  await tx.wait();
  console.log("✅ Forwarder added to allowlist.");
}

main().catch((error) => {
  console.error("❌ set-forwarder failed:", error);
  process.exitCode = 1;
});
