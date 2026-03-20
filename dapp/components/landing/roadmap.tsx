"use client"

import { Layers, Rocket, Globe, Network } from "lucide-react"

const milestones = [
  {
    quarter: "Q1 2025",
    title: "System Foundation",
    description:
      "Smart contracts, core AI modules, audits, and the initial community go-live.",
    icon: Layers,
    color: "cyan",
  },
  {
    quarter: "Q2 2025",
    title: "Public Launch",
    description:
      "Public token launch, DEX listings, first staking release, and early partnerships.",
    icon: Rocket,
    color: "purple",
  },
  {
    quarter: "Q3 2025",
    title: "Ecosystem Growth",
    description:
      "CEX listings, mobile wallet rollout, cross-chain support, and governance v1.",
    icon: Globe,
    color: "cyan",
  },
  {
    quarter: "Q4 2025",
    title: "Network Expansion",
    description:
      "NFT integration, new DeFi partnerships, layer-2 scaling, and global outreach.",
    icon: Network,
    color: "purple",
  },
]

export function Roadmap() {
  return (
    <section id="roadmap" className="relative overflow-hidden bg-dark-bg py-24 lg:py-32">
      <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-cyan/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Left heading */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground md:text-5xl">
              Scaling an AI <br />
              Driven DeFi{" "}
              <span className="text-gradient-cyan">Ecosystem</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              A phased approach to building the most comprehensive AI-powered
              DeFi infrastructure on Arbitrum and beyond.
            </p>
          </div>

          {/* Right: Timeline cards */}
          <div className="flex flex-col gap-6">
            {milestones.map((m) => {
              const Icon = m.icon
              const isCyan = m.color === "cyan"
              return (
                <div
                  key={m.quarter}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-cyan/20"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-cyan/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          isCyan
                            ? "bg-cyan/10 text-cyan"
                            : "bg-purple/10 text-purple"
                        }`}
                      >
                        <Icon size={22} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
                        {m.quarter} — {m.title}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {m.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
