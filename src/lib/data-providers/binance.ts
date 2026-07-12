// Live crypto market data from Binance's PUBLIC market-data API (no key needed).
// Uses data-api.binance.vision, the dedicated public endpoint that holds up
// well from cloud/deploy environments. Results are cached for 5 minutes so we
// don't hammer the API on every page view.

import type { Candle } from "@/data/sampleCandles";

const BASE = "https://data-api.binance.vision/api/v3";
const REVALIDATE_SECONDS = 300;

// Our symbols → Binance trading pairs (all priced in USDT ≈ USD).
const PAIRS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};

export const BINANCE_SYMBOLS = Object.keys(PAIRS);

export function isBinanceSymbol(symbol: string): boolean {
  return symbol in PAIRS;
}

export interface LiveQuote {
  price: number;
  dailyChangePct: number;
}

// Current price + 24h change. Returns null on any failure (caller falls back).
export async function fetchQuote(symbol: string): Promise<LiveQuote | null> {
  const pair = PAIRS[symbol];
  if (!pair) return null;
  try {
    const res = await fetch(`${BASE}/ticker/24hr?symbol=${pair}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const price = Number(j.lastPrice);
    const dailyChangePct = Number(j.priceChangePercent);
    if (!Number.isFinite(price) || !Number.isFinite(dailyChangePct)) return null;
    return { price, dailyChangePct };
  } catch {
    return null;
  }
}

// Last `limit` daily candles, oldest first. Returns null on failure.
export async function fetchCandles(symbol: string, limit = 90): Promise<Candle[] | null> {
  const pair = PAIRS[symbol];
  if (!pair) return null;
  try {
    const res = await fetch(`${BASE}/klines?symbol=${pair}&interval=1d&limit=${limit}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Binance kline row: [openTime(ms), open, high, low, close, volume, ...]
    return rows.map((r: unknown[]) => ({
      time: Math.floor(Number(r[0]) / 1000), // ms → unix seconds
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }));
  } catch {
    return null;
  }
}
