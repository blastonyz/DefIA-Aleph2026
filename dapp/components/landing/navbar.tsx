"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { StartButton } from "@/components/landing/start-button"

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Tokenomics", href: "#tokenomics" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Docs", href: "#docs" },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-darker-bg/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#" className="flex items-center" aria-label="DEFIAR home">
          <svg
            width="120"
            height="16"
            viewBox="0 0 450 59"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="450" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FED7AA" />
                <stop offset="40%" stopColor="#FB923C" />
                <stop offset="70%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
            </defs>
            <path fillRule="evenodd" clipRule="evenodd" d="M49.8574 0C57.2978 9.21361e-06 63.4579 0.793239 68.3369 2.37891C73.2767 3.96457 77.1497 6.12968 79.9551 8.87402C82.8212 11.6183 84.8335 14.7589 85.9922 18.2959C87.2119 21.7721 87.8222 25.4621 87.8223 29.3652C87.8223 33.2074 87.1513 36.9281 85.8096 40.5264C84.5288 44.0636 82.3936 47.2048 79.4053 49.9492C76.478 52.6934 72.5749 54.8886 67.6963 56.5352C62.8783 58.1208 56.9319 58.9141 49.8574 58.9141H0V0H49.8574ZM17.4727 44.5518H49.2168C53.12 44.5518 56.3834 44.185 59.0059 43.4531C61.6889 42.6603 63.7928 41.5935 65.3174 40.252C66.903 38.8493 68.0313 37.2329 68.7021 35.4033C69.434 33.5127 69.7998 31.4998 69.7998 29.3652C69.7998 27.1698 69.434 25.1875 68.7021 23.4189C68.0313 21.5895 66.903 20.0038 65.3174 18.6621C63.7928 17.3205 61.689 16.2836 59.0059 15.5518C56.3834 14.7589 53.12 14.3623 49.2168 14.3623H17.4727V44.5518Z" fill="url(#logo-grad)"/>
            <path d="M169.224 13.8135H111.773V24.791H158.795V34.2139H111.773V45.1006H169.407V58.9141H94.3008V0H169.224V13.8135Z" fill="url(#logo-grad)"/>
            <path d="M251.106 0V13.8135H193.656V25.6152H240.678V38.1475H193.656V58.9141H176.184V0H251.106Z" fill="url(#logo-grad)"/>
            <path d="M275.219 58.9141H257.746V0H275.219V58.9141Z" fill="url(#logo-grad)"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M365.883 58.9141H346.672L340.683 48.0273H304.322L298.37 58.9141H279.25L312.732 0H332.035L365.883 58.9141ZM310.873 36.0439H334.09L322.444 14.8779L310.873 36.0439Z" fill="url(#logo-grad)"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M423.847 0C428.908 3.08842e-05 433.391 0.640228 437.294 1.9209C441.197 3.14065 444.247 5.15356 446.442 7.95898C448.699 10.7644 449.827 14.4543 449.827 19.0283C449.827 22.1384 449.278 24.7302 448.181 26.8037C447.083 28.8773 445.558 30.5244 443.606 31.7441C441.716 32.9639 439.52 33.8784 437.02 34.4883C436.136 34.6823 435.233 34.8517 434.311 35C435.972 35.1541 437.455 35.349 438.758 35.5859C442.112 36.1348 444.521 37.2025 445.984 38.7881C447.448 40.3128 448.181 42.5693 448.181 45.5576V58.9141H430.616V47.3877C430.616 45.3141 430.25 43.7277 429.519 42.6299C428.787 41.5322 427.322 40.7697 425.127 40.3428C423.206 39.9692 420.444 39.7596 416.842 39.7129L415.247 39.7031H385.882V58.9141H368.408V0H423.847ZM385.882 27.3525H423.847C426.469 27.3525 428.543 26.8038 430.067 25.7061C431.592 24.5473 432.354 22.8394 432.354 20.583C432.354 18.4487 431.592 16.8937 430.067 15.918C428.638 14.946 426.726 14.429 424.332 14.3682L423.847 14.3623H385.882V27.3525Z" fill="url(#logo-grad)"/>
          </svg>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <StartButton />
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-darker-bg/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2" onClick={() => setMobileOpen(false)}>
              <StartButton compact />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
