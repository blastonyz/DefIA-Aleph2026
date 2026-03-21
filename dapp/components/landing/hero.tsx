"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import LiquidSphere from "@/components/ui/LiquidSphere"

export function Hero() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative min-h-screen overflow-hidden bg-darker-bg pt-24">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-navy/20 blur-[150px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-purple/10 blur-[120px]" />
        <div className="absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full bg-cyan/5 blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Left side - Content */}
          <div className="flex flex-col items-start">
            {/* Badge */}
            <div
              className={`mb-8 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-4 py-1.5 transition-all duration-700 ${
                mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
              <span className="font-mono text-xs uppercase tracking-wider text-cyan">
                Network Status: Live Intelligence
              </span>
            </div>

            {/* Heading */}
            <h1
              className={`font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] text-foreground transition-all delay-100 duration-700 sm:text-5xl md:text-6xl lg:text-7xl ${
                mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              Decentralized
              <br />
              <span className="text-gradient-cyan">Intelligence</span>
              <br />
              Architecture
            </h1>

            {/* Subtitle */}
            <p
              className={`mt-6 max-w-md text-base leading-relaxed text-muted-foreground transition-all delay-200 duration-700 ${
                mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Experience the next evolution of DeFi management. Autonomous agents
              optimizing your portfolio across liquid markets in real-time.
            </p>

            {/* CTAs with gradient buttons */}
            <div
              className={`mt-10 flex flex-col gap-4 sm:flex-row transition-all delay-300 duration-700 ${
                mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <a
                href="#cta"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-orange-200 via-orange-500 to-orange-700 px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Launch Terminal
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </a>
              <a
                href="#docs"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-card/50 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-cyan/30"
              >
                <span className="relative z-10">View Documentation</span>
                {/* Gradient border on hover */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan/10 to-purple/10 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </div>
          </div>

          {/* Right side - Mesh Globe */}
          <div
            className={`flex items-center justify-center transition-all delay-200 duration-1000 ${
              mounted ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            <div className="relative">
              {/* Outer glow rings */}
              <div className="absolute -inset-12 rounded-full border border-cyan/10" />
              <div className="absolute -inset-20 rounded-full border border-purple/10" />
              {/* Glow halos behind the sphere */}
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-purple/10 blur-[60px]" />
              <div className="pointer-events-none absolute inset-[-20px] -z-10 rounded-full bg-cyan/5 blur-[90px]" />
              <LiquidSphere />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-dark-bg to-transparent" />
    </section>
  )
}
