"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type CandlestickData,
  type IChartApi,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts";

type OhlcPoint = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type OhlcResponse = {
  id: string;
  days: string;
  vsCurrency: string;
  data: OhlcPoint[];
  error?: string;
};

const PAIRS = [
  { id: "ethereum", label: "ETH" },
  { id: "bitcoin", label: "BTC" },
  { id: "avalanche-2", label: "AVAX" },
] as const;

export function OhlcChart() {
  const [asset, setAsset] = useState<(typeof PAIRS)[number]["id"]>("ethereum");
  const [days, setDays] = useState("7");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [points, setPoints] = useState<CandlestickData[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const selectedAsset = useMemo(() => PAIRS.find((pair) => pair.id === asset), [asset]);

  useEffect(() => {
    let isCancelled = false;

    const loadOhlc = async () => {
      setIsLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          type: "ohlc",
          id: asset,
          vs_currency: "usd",
          days,
        });

        const response = await fetch(`/api/prices/coingecko?${query.toString()}`);
        const json = (await response.json()) as OhlcResponse;

        if (!response.ok) {
          throw new Error(json.error ?? "Could not load OHLC");
        }

        const parsed = json.data.map((point) => ({
          time: Math.floor(point.timestamp / 1000) as CandlestickData["time"],
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
        }));

        if (!isCancelled) {
          setPoints(parsed);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(requestError instanceof Error ? requestError.message : "Error loading chart");
          setPoints([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadOhlc();

    return () => {
      isCancelled = true;
    };
  }, [asset, days]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 375,
      layout: {
        background: { type: ColorType.Solid, color: "#FFFFFF" },
        textColor: "#7a5649",
      },
      grid: {
        vertLines: { color: "rgba(164, 55, 0, 0.08)" },
        horzLines: { color: "rgba(164, 55, 0, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(164, 55, 0, 0.18)",
      },
      timeScale: {
        borderColor: "rgba(164, 55, 0, 0.18)",
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
      borderVisible: false,
    });

    series.setData(points);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
      chart.timeScale().fitContent();
    });

    resizeObserver.observe(container);
    chartRef.current = chart;

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [points]);

  return (
    <div className="mt-6 rounded-lg border border-border/50 bg-darker-bg p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">OHLC Market Data</p>
        <div className="flex items-center gap-2">
          <select
            value={asset}
            onChange={(event) => setAsset(event.target.value as (typeof PAIRS)[number]["id"])}
            className="rounded-md border border-border/50 bg-dark-bg px-2 py-1 text-xs text-foreground"
          >
            {PAIRS.map((pair) => (
              <option key={pair.id} value={pair.id}>
                {pair.label}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className="rounded-md border border-border/50 bg-dark-bg px-2 py-1 text-xs text-foreground"
          >
            <option value="1">1D</option>
            <option value="7">7D</option>
            <option value="30">30D</option>
            <option value="90">90D</option>
          </select>
        </div>
      </div>

      {isLoading ? <p className="mb-3 text-sm text-muted-foreground">Loading candles...</p> : null}
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div ref={containerRef} className="w-full overflow-hidden rounded-md border border-border/40" />

      <p className="mt-3 text-xs text-muted-foreground">
        Source: CoinGecko ({selectedAsset?.label ?? "N/A"} / USD)
      </p>
    </div>
  );
}
