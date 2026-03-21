"use client"

import { useScrollReveal } from "@/hooks/useScrollReveal"

const steps = [
  {
    num: "01",
    icon: "💬",
    title: "Natural input",
    sub: '"I want to earn with my USDC, low risk"',
    bg: "bg-light-tint",
    textTitle: "text-foreground",
    textSub: "text-muted-foreground",
    textNum: "text-foreground/40",
  },
  {
    num: "02",
    icon: "🧠",
    title: "AI interprets",
    sub: "Selects Safe Savings → AAVE on Avalanche",
    bg: "bg-primary",
    textTitle: "text-white",
    textSub: "text-white/80",
    textNum: "text-white/50",
  },
  {
    num: "03",
    icon: "🔑",
    title: "Session Key created",
    sub: "Scoped permissions: $500/day, 7 days, AAVE only",
    bgHex: "#C4440E",
    textTitle: "text-white",
    textSub: "text-white/70",
    textNum: "text-white/50",
  },
  {
    num: "04",
    icon: "✅",
    title: "Invisible execution",
    sub: "Approve + Deposit in 1 UserOperation. The user sees the earnings counter.",
    bgHex: "#7A2A08",
    textTitle: "text-white",
    textSub: "text-white/60",
    textNum: "text-white/50",
  },
]

export function HowItWorks() {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section className="relative overflow-hidden bg-dark-bg px-6 py-20 md:py-28">
      <div className="pointer-events-none absolute right-[8%] top-10 h-[280px] w-[280px] rounded-full bg-primary/15 blur-[120px]" />

      <div ref={ref} className="scroll-reveal relative mx-auto max-w-4xl">
        {/* Label */}
        <div className="mb-3 inline-block rounded-full bg-primary/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          Live demo
        </div>

        {/* Headline */}
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-foreground md:text-5xl">
          One-Click{" "}
          <span className="text-primary">Yield.</span>
        </h2>

        <p className="mb-10 max-w-xl text-base text-muted-foreground md:text-lg">
          Natural language command → smart account → on-chain execution. Zero
          interruptions.
        </p>

        {/* Flow steps */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex sm:contents">
              {/* Step card */}
              <div
                className={`flex flex-1 flex-col items-center rounded-2xl p-5 text-center shadow-md transition-transform duration-300 hover:-translate-y-1 sm:flex-1 ${step.bg ?? ""}`}
                style={step.bgHex ? { background: step.bgHex } : undefined}
              >
                <div className={`mb-2 font-mono text-[11px] ${step.textNum}`}>
                  {step.num}
                </div>
                <div className="mb-3 text-3xl">{step.icon}</div>
                <div
                  className={`mb-1.5 font-[family-name:var(--font-display)] text-sm font-bold leading-tight ${step.textTitle}`}
                >
                  {step.title}
                </div>
                <div className={`text-[11px] leading-relaxed ${step.textSub}`}>
                  {step.sub}
                </div>
              </div>

              {/* Arrow connector between cards */}
              {i < steps.length - 1 && (
                <div className="flex items-center justify-center self-center text-xl font-bold text-primary/60 sm:text-lg">
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat demo */}
        <div className="rounded-2xl p-5 md:p-6" style={{ background: "#7A2A08" }}>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-primary">
            Chat input → On-chain execution
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="rounded-[16px_16px_4px_16px] bg-primary px-4 py-2.5 text-sm italic text-white"
            >
              &ldquo;I want to earn 4% on my savings&rdquo;
            </div>
            <span className="text-xl text-primary/70">→</span>
            <div
              className="rounded-[16px_16px_16px_4px] px-4 py-2.5 text-sm text-white/80"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              Deposited $200 in AAVE Avalanche. You earn ~$8.40/month.{" "}
              <span className="text-green-400">✓ Active</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
