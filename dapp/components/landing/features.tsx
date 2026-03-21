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

      <div ref={ref} className="scroll-reveal relative mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <h2 className="mb-10 text-center font-heading text-3xl font-bold text-foreground md:text-[40px] lg:text-left">
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

          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="mx-auto max-w-[270px] rounded-[36px] bg-primary p-2.5 shadow-[0_32px_80px_rgba(196,68,14,0.35)]">
              <div className="min-h-[420px] rounded-[28px] bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-heading text-sm font-extrabold text-foreground">DefIA</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-light-tint text-[10px] font-bold text-dark-accent">
                    ML
                  </div>
                </div>

                <p className="mb-3 font-heading text-sm font-extrabold leading-tight text-foreground">
                  Hola, ¿qué querés
                  <br />
                  hacer hoy?
                </p>

                <div className="mb-3 rounded-2xl bg-dark-accent p-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted">Balance total</p>
                  <p className="font-heading text-[28px] font-extrabold leading-none text-primary-foreground">$2,450.80</p>
                  <p className="mt-1 text-[11px] font-semibold text-primary">▲ Ganaste $2.80 hoy</p>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="row-span-2 rounded-xl bg-primary p-3">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-light-tint/80">Autopilot</p>
                    <div className="my-2 h-9 w-9 rounded-full bg-dark-accent" />
                    <p className="font-heading text-sm font-extrabold text-primary-foreground">Activo</p>
                    <p className="mt-1 text-[9px] text-light-tint/80">6 días</p>
                  </div>
                  <div className="rounded-xl bg-light-tint p-3">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-dark-accent/70">Hoy</p>
                    <p className="font-heading text-lg font-extrabold text-foreground">+$0.03</p>
                  </div>
                  <div className="rounded-xl bg-muted-tint p-3">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-dark-accent/70">Estrategia</p>
                    <p className="font-heading text-[11px] font-extrabold text-foreground">Ahorro Seguro</p>
                  </div>
                </div>

                <p className="mb-1.5 font-heading text-[11px] font-bold text-foreground">Elegí una estrategia</p>

                <div className="mb-1.5 flex items-center justify-between rounded-xl border-l-[3px] border-green-500 bg-light-tint px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-heading text-[11px] font-bold text-foreground">Ahorro Seguro</span>
                  </div>
                  <span className="font-heading text-[13px] font-extrabold text-green-600">+4.2%</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border-l-[3px] border-amber-500 bg-muted-tint px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-heading text-[11px] font-bold text-foreground">Crecimiento</span>
                  </div>
                  <span className="font-heading text-[13px] font-extrabold text-amber-600">+8.1%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
