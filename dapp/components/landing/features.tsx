"use client"

import { Shield, Zap, Users, Cpu, BarChart3, RefreshCw } from "lucide-react"

const features = [
  {
    number: "01",
    title: "Ultra Secure",
    description:
      "AI-based anomaly detection stops attacks in real time with military-grade encryption and multi-layer defense.",
    icon: Shield,
  },
  {
    number: "02",
    title: "Lightning Fast",
    description:
      "AI-routing optimizes network congestion for instant transactions, enabling sub-second settlement across chains.",
    icon: Zap,
  },
  {
    number: "03",
    title: "Community Driven",
    description:
      "Transparent governance enhanced with AI analytics for better proposal evaluation and decision-making.",
    icon: Users,
  },
  {
    number: "04",
    title: "AI Signal Engine",
    description:
      "Adaptive models analyze market data across protocols to generate high-confidence trading signals in real time.",
    icon: Cpu,
  },
  {
    number: "05",
    title: "Fork Simulation",
    description:
      "Test any strategy on a full Ethereum fork before risking real assets. Replay, adjust, and optimize with zero cost.",
    icon: RefreshCw,
  },
  {
    number: "06",
    title: "On-Chain Analytics",
    description:
      "Deep insight dashboards powered by AI give you an edge: track whale moves, liquidity shifts, and emerging trends.",
    icon: BarChart3,
  },
]

export function Features() {
  return (
    <section id="features" className="relative bg-darker-bg py-24 lg:py-32">
      {/* Background accents */}
      <div className="pointer-events-none absolute left-0 top-1/3 h-[400px] w-[400px] rounded-full bg-purple/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-1/4 h-[300px] w-[300px] rounded-full bg-cyan/5 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground md:text-5xl">
              Why Choose <br />
              <span className="text-gradient-cyan">DefIA?</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground lg:text-right">
            AI infrastructure designed to deliver a smarter, safer, and more
            adaptive DeFi experience.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.number}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-cyan/20 hover:bg-card/80"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {feature.number}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/10 to-purple/10">
                      <Icon size={20} className="text-cyan" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
