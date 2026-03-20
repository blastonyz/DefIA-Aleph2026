"use client"

const segments = [
  { label: "Public Sale", pct: 50, color: "#7C4DFF" },
  { label: "Staking Rewards", pct: 25, color: "#00E5FF" },
  { label: "Visits", pct: 15, color: "#0B3D91" },
  { label: "Liquidity", pct: 10, color: "#f472b6" },
]

function DonutChart() {
  const total = segments.reduce((s, seg) => s + seg.pct, 0)
  const radius = 90
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative mx-auto h-[280px] w-[280px] sm:h-[320px] sm:w-[320px]">
      <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90">
        {segments.map((seg) => {
          const dashLength = (seg.pct / total) * circumference
          const dashGap = circumference - dashLength
          const currentOffset = offset
          offset += dashLength

          return (
            <circle
              key={seg.label}
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="28"
              strokeDasharray={`${dashLength} ${dashGap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              className="transition-all duration-700"
            />
          )
        })}
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
          100%
        </span>
        <span className="text-xs text-muted-foreground">Total Supply</span>
      </div>
    </div>
  )
}

export function Tokenomics() {
  return (
    <section id="tokenomics" className="relative bg-darker-bg py-24 lg:py-32">
      <div className="pointer-events-none absolute right-1/4 top-0 h-[400px] w-[400px] rounded-full bg-purple/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground md:text-5xl">
            <span className="text-gradient-cyan">DefIA</span> Tokenomics
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Fair distribution supervised by autonomous AI models designed for
            longevity, stability, and ecosystem sustainability.
          </p>
        </div>

        {/* Legend pills */}
        <div className="mb-12 flex flex-wrap items-center justify-center gap-4">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-sm text-foreground">{seg.label}</span>
            </div>
          ))}
        </div>

        {/* Chart + labels */}
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-center lg:gap-20">
          <DonutChart />

          <div className="grid grid-cols-2 gap-6">
            {segments.map((seg) => (
              <div key={seg.label} className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {seg.label}
                </span>
                <span
                  className="font-[family-name:var(--font-display)] text-2xl font-bold"
                  style={{ color: seg.color }}
                >
                  ({seg.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
