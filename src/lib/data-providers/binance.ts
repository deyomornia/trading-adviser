// Live crypto market data from Binance's PUBLIC market-data API (no key needed).
// Functions take a Binance pair (e.g. "BTCUSDT"); the catalog maps our symbols
// to pairs. Results cached 5 min so we don't hammer the API on every view.

import type { Candle } from "@/data/sampleCandles";

const BASE = "https://data-api.binance.vision/api/v3";
const REVALIDATE_SECONDS = 300;

export interface LiveQuote {
  price: number;
  dailyChangePct: number;
}

// Current price + 24h change for a pair. Null on any failure.
export async function fetchQuote(pair: string): Promise<LiveQuote | null> {
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

// Last `limit` candles at the given interval (oldest first). Null on failure.
export async function fetchCandles(
  pair: string,
  interval = "1d",
  limit = 90
): Promise<Candle[] | null> {
  if (!pair) return null;
  try {
    const res = await fetch(`${BASE}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    // Binance kline row: [openTime(ms), open, high, low, close, volume, ...]
    return rows.map((r: unknown[]) => ({
      time: Math.floor(Number(r[0]) / 1000),
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
