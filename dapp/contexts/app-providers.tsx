"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { useState } from "react";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, WagmiProvider } from "wagmi";
import { arbitrumSepolia, avalancheFuji } from "wagmi/chains";
import { AaProvider } from "@/contexts/aa-context";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "8a670b98943fc13feaebf4def079310b";

const supportedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? avalancheFuji.id);

const supportedChain = supportedChainId === arbitrumSepolia.id ? arbitrumSepolia : avalancheFuji;

const supportedRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ??
  process.env.NEXT_PUBLIC_AVAX_RPC_URL ??
  process.env.NEXT_PUBLIC_ARB_RPC_URL ??
  (supportedChain.id === avalancheFuji.id
    ? "https://api.avax-test.network/ext/bc/C/rpc"
    : "https://sepolia-rollup.arbitrum.io/rpc");

const config = getDefaultConfig({
  appName: "Aleph",
  projectId,
  chains: [supportedChain],
  transports: {
    [supportedChain.id]: http(supportedRpcUrl),
  },
  ssr: false,
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AaProvider>{children}</AaProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}