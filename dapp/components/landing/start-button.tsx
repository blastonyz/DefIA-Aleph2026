"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

type StartButtonProps = {
  compact?: boolean;
};

export function StartButton({ compact = false }: StartButtonProps) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && !!account && !!chain;

        if (!ready) {
          return null;
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 via-cyan to-emerald-400 px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <span className="relative z-10">Empezar</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="rounded-full border border-red-400/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300"
            >
              Red incorrecta
            </button>
          );
        }

        return (
          <button
            onClick={openAccountModal}
            type="button"
            className="rounded-full border border-border/60 bg-secondary/60 px-4 py-2 text-sm font-semibold text-foreground"
          >
            {compact ? account.displayName : `Wallet: ${account.displayName}`}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
