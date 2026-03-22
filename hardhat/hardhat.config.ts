import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

const privateKey = process.env.ARBITRUM_SEPOLIA_PK || "";
const fujiPrivateKey = process.env.AVALANCHE_FUJI_PK || privateKey;

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.RPC_URL ?? "http://localhost:8545",
      accounts: [privateKey],
    },
    arbitrum: {
      type: "http",
      chainType: "op",
      url: process.env.ALCHEMY_ARB_RPC_URL ?? "http://localhost:8545",
      accounts: [privateKey],
    },
    avalancheFuji: {
      type: "http",
      chainType: "l1",
      url: process.env.AVAX_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [fujiPrivateKey],
    },
  },
});
