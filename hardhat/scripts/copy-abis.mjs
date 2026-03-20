import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsToCopy = ["Account", "AccountFactory", "Paymaster", "GMXPositionExecutor"];
const artifactsRoot = path.resolve(__dirname, "../artifacts/contracts");
const dappContractsRoot = path.resolve(__dirname, "../../dapp/lib/contracts");

for (const contractName of contractsToCopy) {
  const artifactPath = path.join(
    artifactsRoot,
    `${contractName}.sol`,
    `${contractName}.json`
  );
  const targetPath = path.join(dappContractsRoot, `${contractName}.json`);

  if (!fs.existsSync(artifactPath)) {
    console.warn(`Skipping ${contractName}: artifact not found at ${artifactPath}`);
    continue;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(artifactPath, targetPath);
  console.log(`Copied ${contractName} artifact to ${targetPath}`);
}

const entryPointArtifactPath = path.resolve(
  __dirname,
  "../node_modules/@account-abstraction/contracts/artifacts/EntryPoint.json"
);
const entryPointTargetPath = path.join(dappContractsRoot, "EntryPoint.json");

if (fs.existsSync(entryPointArtifactPath)) {
  fs.mkdirSync(path.dirname(entryPointTargetPath), { recursive: true });
  fs.copyFileSync(entryPointArtifactPath, entryPointTargetPath);
  console.log(`Copied EntryPoint artifact to ${entryPointTargetPath}`);
} else {
  console.warn(`Skipping EntryPoint: artifact not found at ${entryPointArtifactPath}`);
}