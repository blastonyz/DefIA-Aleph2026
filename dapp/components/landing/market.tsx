"use client"

import { useScrollReveal } from "@/hooks/useScrollReveal"

const bigStats = [
  {
    num: "48M",
    title: "Smart Accounts deployed in 2024",
    sub: "7x YoY growth · 87% use Paymaster",
  },
  {
    num: "$29.5B",
    title: "DeFAI sector (AI + DeFi)",
    sub: "from $3.2B in 12 months · +822%",
  },
]

const tam = [
  {
    label: "TAM",
    num: "$237B",
    desc: "Total DeFi TVL",
    highlight: false,
  },
  {
    label: "SAM",
    num: "$5–15B",
    desc: "AI-managed DeFi + AA-enabled",
    highlight: true,
  },
  {
    label: "SOM · Avalanche",
    num: "$50–200M",
    desc: "$2.1B Avalanche TVL · 1.26% global",
    highlight: false,
  },
]

export function Market() {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section className="relative overflow-hidden bg-light-tint px-6 py-20 md:py-28">
      <div className="pointer-events-none absolute left-[15%] top-10 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-10 right-[10%] h-[240px] w-[240px] rounded-full bg-primary/8 blur-[100px]" />

      <div ref={ref} className="scroll-reveal relative mx-auto max-w-4xl">
        {/* Label */}
        <div className="mb-3 inline-block rounded-full bg-primary/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          Market &amp; Traction
        </div>

        {/* Headline */}
        <h2 className="mb-10 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-foreground md:text-5xl">
          The market already{" "}
          <span className="text-primary">chose</span>
          <br />
          Account Abstraction.
        </h2>

        {/* 2 big stat cards */}
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {bigStats.map((s) => (
            <div
              key={s.num}
              className="rounded-2xl p-7 shadow-md"
              style={{ background: "#C4440E" }}
            >
              <div
                className="font-[family-name:var(--font-display)] font-bold leading-none text-primary"
                style={{ fontSize: "clamp(48px,6vw,72px)" }}
              >
                {s.num}
              </div>
              <div className="mt-2 text-[15px] text-white/90">{s.title}</div>
              <div className="mt-2 font-mono text-[12px] text-white/60">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* TAM / SAM / SOM */}
        <div className="grid gap-3 sm:grid-cols-3">
          {tam.map((t) => (
            <div
              key={t.label}
              className={`rounded-2xl p-6 text-center shadow-sm ${
                t.highlight ? "bg-primary" : "bg-muted-tint"
              }`}
            >
              <div
                className={`mb-2 font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-widest ${
                  t.highlight ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                {t.label}
              </div>
              <div
                className={`font-[family-name:var(--font-display)] text-3xl font-bold leading-none ${
                  t.highlight ? "text-white" : "text-foreground"
                }`}
              >
                {t.num}
              </div>
              <div
                className={`mt-2 text-xs ${
                  t.highlight ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                {t.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
