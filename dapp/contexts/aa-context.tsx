"use client";

import { createContext, useContext, useMemo } from "react";
import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { avalancheFuji } from "wagmi/chains";

export type TradeAction = "long" | "short" | "close";
export type ActionSource = "manual" | "auto";

type AaContextValue = {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  isSupportedChain: boolean;
  selectedAction: TradeAction;
  actionSource: ActionSource;
  agentReasoning: string;
  setManualAction: (action: TradeAction) => void;
  setAutoAction: (action: TradeAction, reasoning: string) => void;
  contracts: {
    entryPoint: string;
    factory: string;
    paymaster: string;
    smartAccount: string;
    executor: string;
  };
};

const AaContext = createContext<AaContextValue | undefined>(undefined);
const SUPPORTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? avalancheFuji.id);

function getAddress(value: string | undefined, fallback = "0x0000000000000000000000000000000000000000") {
  return value && value.length > 0 ? value : fallback;
}

export function AaProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [selectedAction, setSelectedAction] = useState<TradeAction>("long");
  const [actionSource, setActionSource] = useState<ActionSource>("manual");
  const [agentReasoning, setAgentReasoning] = useState("");

  const setManualAction = (action: TradeAction) => {
    setSelectedAction(action);
    setActionSource("manual");
    setAgentReasoning("");
  };

  const setAutoAction = (action: TradeAction, reasoning: string) => {
    setSelectedAction(action);
    setActionSource("auto");
    setAgentReasoning(reasoning);
  };

  const value = useMemo<AaContextValue>(
    () => ({
      isConnected,
      address,
      chainId,
      isSupportedChain: chainId === SUPPORTED_CHAIN_ID,
      selectedAction,
      actionSource,
      agentReasoning,
      setManualAction,
      setAutoAction,
      contracts: {
        entryPoint: getAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS),
        factory: getAddress(process.env.NEXT_PUBLIC_FACTORY_ADDRESS),
        paymaster: getAddress(process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS),
        smartAccount: getAddress(process.env.NEXT_PUBLIC_SMART_ACCOUNT_ADDRESS),
        executor: getAddress(process.env.NEXT_PUBLIC_MOLTBOT_GMX_EXECUTOR),
      },
    }),
    [address, chainId, isConnected, selectedAction, actionSource, agentReasoning]
  );

  return <AaContext.Provider value={value}>{children}</AaContext.Provider>;
}

export function useAa() {
  const context = useContext(AaContext);
  if (!context) {
    throw new Error("useAa must be used inside AaProvider");
  }
  return context;
}
