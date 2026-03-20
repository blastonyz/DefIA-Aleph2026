export function CodePreview() {
  return (
    <section className="relative overflow-hidden bg-dark-bg py-24 lg:py-32">
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-navy/20 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left content */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple/20 bg-purple/5 px-3 py-1">
              <span className="text-xs font-medium text-purple">
                Developer First
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground md:text-5xl">
              DeFi Strategies <br />
              <span className="text-gradient-cyan">Built by AI Agents</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Deploy intelligent agents that scan markets, simulate strategies
              on forks, and execute trades — all orchestrated through a clean,
              composable SDK.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-cyan" />
                <span className="text-sm text-muted-foreground">Arbitrum Native</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-purple" />
                <span className="text-sm text-muted-foreground">Fork Simulation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-cyan" />
                <span className="text-sm text-muted-foreground">Auto-Rebalance</span>
              </div>
            </div>
          </div>

          {/* Right: Code block */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-cyan/5 to-purple/5 blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-darker-bg">
              {/* Title bar */}
              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  agent.config.ts
                </span>
              </div>
              {/* Code content */}
              <div className="overflow-x-auto p-5">
                <pre className="font-mono text-sm leading-7">
                  <code>
                    <span className="text-muted-foreground">{"1  "}</span>
                    <span className="text-foreground/50">{"{"}</span>{"\n"}
                    <span className="text-muted-foreground">{"2  "}</span>
                    {"  "}
                    <span className="text-purple">const</span>{" "}
                    <span className="text-foreground">agent</span>{" "}
                    <span className="text-foreground/50">=</span>{" "}
                    <span className="text-cyan">new</span>{" "}
                    <span className="text-cyan">DefiAgent</span>
                    <span className="text-foreground/50">{"({"}</span>{"\n"}
                    <span className="text-muted-foreground">{"3  "}</span>
                    {"    "}
                    <span className="text-cyan">network</span>
                    <span className="text-foreground/50">:</span>{" "}
                    <span className="text-green-400">{'"Arbitrum"'}</span>
                    <span className="text-foreground/50">,</span>{"\n"}
                    <span className="text-muted-foreground">{"4  "}</span>
                    {"    "}
                    <span className="text-cyan">riskLevel</span>
                    <span className="text-foreground/50">:</span>{" "}
                    <span className="text-green-400">{'"moderate"'}</span>
                    <span className="text-foreground/50">,</span>{"\n"}
                    <span className="text-muted-foreground">{"5  "}</span>
                    {"    "}
                    <span className="text-cyan">autoRebalance</span>
                    <span className="text-foreground/50">:</span>{" "}
                    <span className="text-purple">true</span>
                    <span className="text-foreground/50">,</span>{"\n"}
                    <span className="text-muted-foreground">{"6  "}</span>
                    {"  "}
                    <span className="text-foreground/50">{"});"}</span>{"\n"}
                    <span className="text-muted-foreground">{"7  "}</span>{"\n"}
                    <span className="text-muted-foreground">{"8  "}</span>
                    {"  "}
                    <span className="text-purple">await</span>{" "}
                    <span className="text-foreground">agent</span>
                    <span className="text-foreground/50">.</span>
                    <span className="text-cyan">scanMarkets</span>
                    <span className="text-foreground/50">{"();"}</span>{"\n"}
                    <span className="text-muted-foreground">{"9  "}</span>
                    {"  "}
                    <span className="text-purple">await</span>{" "}
                    <span className="text-foreground">agent</span>
                    <span className="text-foreground/50">.</span>
                    <span className="text-cyan">simulate</span>
                    <span className="text-foreground/50">{"();"}</span>{"\n"}
                    <span className="text-muted-foreground">{"10 "}</span>
                    {"  "}
                    <span className="text-purple">await</span>{" "}
                    <span className="text-foreground">agent</span>
                    <span className="text-foreground/50">.</span>
                    <span className="text-cyan">execute</span>
                    <span className="text-foreground/50">{"();"}</span>{"\n"}
                    <span className="text-muted-foreground">{"11 "}</span>
                    <span className="text-foreground/50">{"}"}</span>
                  </code>
                </pre>
              </div>
            </div>

            {/* Signal badge floating */}
            <div className="absolute -right-2 -top-2 rounded-xl border border-cyan/20 bg-card px-3 py-2 shadow-lg md:-right-4 md:-top-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-cyan" />
                <span className="font-mono text-xs text-cyan">
                  AI Signal · 78%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
