import { NextRequest, NextResponse } from "next/server";

type CoinGeckoOhlcRaw = [number, number, number, number, number];

const DEFAULT_ID = "ethereum";
const DEFAULT_VS_CURRENCY = "usd";
const DEFAULT_DAYS = "7";

const VALID_DAYS = new Set(["1", "7", "14", "30", "90", "180", "365", "max"]);

function buildOhlcUrl(id: string, vsCurrency: string, days: string): string {
  const baseUrl = (process.env.COINGECKO_BASE?.trim() || "https://api.coingecko.com/api/v3").replace(/\/$/, "");
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days,
  });

  return `${baseUrl}/coins/${encodeURIComponent(id)}/ohlc?${params.toString()}`;
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id") ?? DEFAULT_ID;
    const vsCurrency = request.nextUrl.searchParams.get("vs_currency") ?? DEFAULT_VS_CURRENCY;
    const daysParam = request.nextUrl.searchParams.get("days") ?? DEFAULT_DAYS;
    const days = VALID_DAYS.has(daysParam) ? daysParam : DEFAULT_DAYS;

    const url = buildOhlcUrl(id, vsCurrency, days);
    const apiKey = process.env.COINGECKO_API_KEY?.trim();

    const response = await fetch(url, {
      headers: apiKey ? { "x-cg-pro-api-key": apiKey } : undefined,
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          source: "coingecko",
          error: `CoinGecko request failed: ${response.status}`,
          details: errorText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const raw = (await response.json()) as CoinGeckoOhlcRaw[];

    const data = raw.map(([timestamp, open, high, low, close]) => ({
      timestamp,
      open,
      high,
      low,
      close,
    }));

    return NextResponse.json({
      source: "coingecko",
      type: "ohlc",
      id,
      vsCurrency,
      days,
      data,
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected CoinGecko error";

    return NextResponse.json(
      {
        source: "coingecko",
        error: message,
      },
      { status: 502 }
    );
  }
}
