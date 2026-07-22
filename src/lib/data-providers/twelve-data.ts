// Live commodity market data from Twelve Data (free tier: 800 calls/day).
// Functions take a Twelve Data instrument (e.g. "XAU/USD"). Requires
// TWELVE_DATA_API_KEY; returns null when missing/failed so the caller can fall
// back to SAMPLE data (never mislabels sample as live).

import type { Candle } from "@/data/sampleCandles";
import { cleanCandles } from "./util";

const BASE = "https://api.twelvedata.com";

// Twelve Data returns "2026-06-29" (daily) or "2026-06-29 14:00:00" (intraday,
// space-separated, no timezone). Normalize to an ISO UTC timestamp so parsing
// is consistent across engines and timeframes.
function parseTime(datetime: string): number {
  const iso = datetime.includes(" ") ? datetime.replace(" ", "T") + "Z" : datetime + "T00:00:00Z";
  return Math.floor(Date.parse(iso) / 1000);
}
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
    // Twelve Data returns newest-first; cleanCandles sorts oldest-first for us.
    const candles: Candle[] = j.values.map((v: Record<string, string>) => ({
      time: parseTime(v.datetime),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume ?? 0),
    }));
    const clean = cleanCandles(candles);
    return clean.length ? clean : null;
  } catch {
    return null;
  }
}
