"use client"

import { useScrollReveal } from "@/hooks/useScrollReveal"

const frictionSteps = [
  { label: "1. Open Zapper", pain: false },
  { label: "2. Choose protocol", pain: false },
  { label: "3. Approve token", pain: true, sig: "signature #1" },
  { label: "4. Confirm gas", pain: true, sig: "signature #2" },
  { label: "5. Execute swap", pain: true, sig: "signature #3" },
  { label: "6. Deposit", pain: true, sig: "signature #4" },
  { label: "7. Stake", pain: true, sig: "signature #5" },
]

const stats = [
  {
    num: "84%",
    desc: "of retail traders using AI tools lost money in 2025",
  },
  {
    num: "$237B",
    desc: "in DeFi TVL inaccessible to users without technical knowledge",
  },
  {
    num: "7×",
    desc: "more steps to do yield than opening a savings account at a bank",
  },
]

export function Problem() {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section
      className="relative overflow-hidden bg-foreground px-6 py-20 md:py-28"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full bg-primary/20 blur-[120px]" />

      <div
        ref={ref}
        className="scroll-reveal relative mx-auto max-w-4xl"
      >
        {/* Label pill */}
        <div className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          The problem
        </div>

        {/* Headline */}
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-white md:text-5xl">
          Retail{" "}
          <span className="text-primary">abandons</span>
          <br />
          DeFi at the third click.
        </h2>

        <p className="mb-10 text-base text-white/60 md:text-lg">
          Signature fatigue is killing DeFi adoption — users face up to 7 steps
          just to open a position.
        </p>

        {/* Friction steps */}
        <div className="mb-12 flex flex-wrap items-start gap-2">
          {frictionSteps.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap border ${
                  step.pain
                    ? "border-red-800 bg-red-900 text-white"
                    : "border-primary/30 bg-white/10 text-white/80"
                }`}
              >
                {step.label}
              </div>
              {step.pain ? (
                <span className="rounded-full bg-red-900 px-2 py-0.5 text-[9px] font-bold text-white">
                  {step.sig}
                </span>
              ) : (
                <span className="text-[9px] text-white/40">normal</span>
              )}
              {/* Arrow — except last */}
              {i < frictionSteps.length - 1 && (
                <span className="hidden" aria-hidden />
              )}
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.num}
              className="rounded-2xl bg-white/8 p-5"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div className="mb-1 font-[family-name:var(--font-display)] text-4xl font-bold leading-none text-primary">
                {s.num}
              </div>
              <p className="text-xs leading-relaxed text-white/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
