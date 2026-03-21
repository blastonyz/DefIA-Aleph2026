"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"

const footerLinks = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Tokenomics", href: "#tokenomics" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Docs", href: "#docs" },
]

export function CtaFooter() {
  return (
    <>
      {/* CTA Section */}
      <section id="cta" className="relative overflow-hidden bg-darker-bg py-24 lg:py-32">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/cta-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-darker-bg via-darker-bg/80 to-darker-bg/60" />
        </div>

        {/* Glow effects */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple/10 blur-[150px]" />
        <div className="pointer-events-none absolute left-1/3 top-1/3 h-[300px] w-[300px] rounded-full bg-cyan/5 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          {/* Small orb */}
          <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-orange-200/20 via-orange-500/20 to-orange-700/20 ring-1 ring-orange-500/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-200 via-orange-500 to-orange-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-darker-bg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            <span className="text-balance">
              Ready to deploy the future of{" "}
              <span className="text-gradient-cyan">intelligent finance?</span>
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Join over 12,000 institutional and retail nodes securing the DefIA
            ecosystem.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-orange-200 via-orange-500 to-orange-700 px-8 py-4 text-sm font-semibold text-accent-foreground transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Nodes
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </a>
            <a
              href="#"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-card/80 px-8 py-4 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-cyan/30"
            >
              <span className="relative z-10">Talk to Sales</span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan/10 to-purple/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-darker-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-orange-200 via-orange-500 to-orange-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-darker-bg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-heading text-lg font-bold tracking-[0.18em] text-foreground">
              DEFIAR
            </span>
          </a>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            {"© 2024 DefIA Intelligence. All rights reserved."}
          </p>
        </div>
      </footer>
    </>
  )
}
