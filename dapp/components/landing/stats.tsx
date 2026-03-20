"use client"

import { useEffect, useRef, useState } from "react"

const stats = [
  { value: "$2.4B", label: "AI-Optimized Market Cap", suffix: "" },
  { value: "150K+", label: "Auto AI-Verified Wallets", suffix: "" },
  { value: "<1s", label: "Predictive Transaction Routing", suffix: "" },
  { value: "0.001%", label: "AI-Managed Fee Efficiency", suffix: "" },
]

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center gap-2 transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground md:text-4xl">
        {value}
      </span>
      <span className="text-center text-xs text-muted-foreground md:text-sm">
        {label}
      </span>
    </div>
  )
}

export function Stats() {
  return (
    <section className="relative border-y border-border/50 bg-dark-bg">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent" />

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4 md:py-20">
        {stats.map((stat) => (
          <AnimatedStat key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple/40 to-transparent" />
    </section>
  )
}
