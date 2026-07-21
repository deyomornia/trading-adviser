// Live commodity market data from Twelve Data (free tier: 800 calls/day).
// Functions take a Twelve Data instrument (e.g. "XAU/USD"). Requires
// TWELVE_DATA_API_KEY; returns null when missing/failed so the caller can fall
// back to SAMPLE data (never mislabels sample as live).

import type { Candle } from "@/data/sampleCandles";

const BASE = "https://api.twelvedata.com";
const REVALIDATE_SECONDS = 900; // 15 min — commodities move slowly, saves quota

export function hasTwelveDataKey(): boolean {
  return Boolean(process.env.TWELVE_DATA_API_KEY);
}

export interface LiveQuote {
  price: number;
  dailyChangePct: number;
}

export async function fetchQuote(instrument: string): Promise<LiveQuote | null> {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!instrument || !key) return null;
  try {
    const url = `${BASE}/quote?symbol=${encodeURIComponent(instrument)}&apikey=${key}`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const j = await res.json();
    if (j.status === "error") return null;
    const price = Number(j.close);
    const dailyChangePct = Number(j.percent_change);
    if (!Number.isFinite(price)) return null;
    return {
      price,
      dailyChangePct: Number.isFinite(dailyChangePct) ? dailyChangePct : 0,
    };
  } catch {
    return null;
  }
}

export async function fetchCandles(
  instrument: string,
  interval = "1day",
  limit = 90
): Promise<Candle[] | null> {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!instrument || !key) return null;
  try {
    const url =
      `${BASE}/time_series?symbol=${encodeURIComponent(instrument)}` +
      `&interval=${encodeURIComponent(interval)}&outputsize=${limit}&apikey=${key}`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const j = await res.json();
    if (j.status === "error" || !Array.isArray(j.values)) return null;
    // Twelve Data returns newest-first; reverse to oldest-first for the engine.
    const candles: Candle[] = j.values
      .map((v: Record<string, string>) => ({
        time: Math.floor(Date.parse(v.datetime) / 1000),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: Number(v.volume ?? 0),
      }))
      .reverse();
    return candles.length ? candles : null;
  } catch {
    return null;
  }
}
