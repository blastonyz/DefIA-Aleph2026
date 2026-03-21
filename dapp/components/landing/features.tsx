"use client"

import { Eye, Lock, Shield, XCircle } from "lucide-react"
import { useScrollReveal } from "@/hooks/useScrollReveal"

const cells = [
  {
    Icon: Shield,
    title: "Non-custodial",
    body: "DEFIAR never touches your funds. Everything runs from your smart account.",
    bg: "bg-light-tint",
  },
  {
    Icon: Lock,
    title: "Limits set by you",
    body: "Autopilot can only do what you approved.",
    bg: "bg-muted-tint",
  },
  {
    Icon: Eye,
    title: "100% transparent",
    body: "Every move verifiable on Snowtrace.",
    bg: "bg-muted-tint",
  },
  {
    Icon: XCircle,
    title: "Cancel anytime",
    body: "One tap to pause or revoke all permissions.",
    bg: "bg-light-tint",
  },
]

export function Features() {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section id="security" className="relative overflow-hidden bg-darker-bg px-6 py-20 md:py-28">
      <div className="pointer-events-none absolute left-[12%] top-10 h-[260px] w-[260px] rounded-full bg-cyan/10 blur-[110px]" />
      <div className="pointer-events-none absolute right-[10%] bottom-10 h-[260px] w-[260px] rounded-full bg-purple/10 blur-[110px]" />

      <div ref={ref} className="scroll-reveal relative mx-auto max-w-[720px]">
        <h2 className="mb-10 text-center font-heading text-3xl font-bold text-foreground md:text-[40px]">
          Your money, always yours.
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cells.map((cell, index) => (
            <div
              key={cell.title}
              className={`${cell.bg} animate-fade-up rounded-[1.5rem] border border-border/50 p-6 shadow-[0_20px_50px_rgba(160,82,45,0.12)]`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <cell.Icon size={32} className="mb-3 text-dark-accent" />
              <h3 className="font-heading text-lg font-bold text-foreground">
                {cell.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-dark-accent">
                {cell.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
