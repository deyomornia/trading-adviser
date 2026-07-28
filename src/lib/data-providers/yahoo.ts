// Live commodity market data from Yahoo Finance's public chart endpoint
// (futures symbols like CL=F crude, HG=F copper, SI=F silver, NG=F gas).
// No key needed. NOTE: this feed is unofficial — on any failure every function
// returns null and the asset falls back to the honest SAMPLE label, so wrong
// data is never shown and the app never breaks.

import type { Candle } from "@/data/sampleCandles";
import type { TradingStyle } from "@/lib/tradingStyle";
import { cleanCandles } from "./util";

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA = { "User-Agent": "Mozilla/5.0" };

// Yahoo wants interval+range pairs; sized so every style clears MIN_CANDLES.
const STYLE_PARAMS: Record<TradingStyle, { interval: string; range: string }> = {
  day: { interval: "60m", range: "1mo" },
  swing: { interval: "1d", range: "9mo" },
  position: { interval: "1wk", range: "3y" },
};

interface YahooResult {
  meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: (number | null)[];
      high?: (number | null)[];
      low?: (number | null)[];
      close?: (number | null)[];
      volume?: (number | null)[];
    }>;
  };
}

async function fetchChart(
  pair: string,
  interval: string,
  range: string,
  revalidate: number
): Promise<YahooResult | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(pair)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, { headers: UA, next: { revalidate } });
    if (!res.ok) return null;
    const j: { chart?: { result?: YahooResult[] } } = await res.json();
    return j.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

export interface LiveQuote {
  price: number;
  dailyChangePct: number;
}

export async function fetchQuote(pair: string): Promise<LiveQuote | null> {
  if (!pair) return null;
  const r = await fetchChart(pair, "1d", "5d", 300);
  const price = r?.meta?.regularMarketPrice;
  const prev = r?.meta?.chartPreviousClose;
  if (!Number.isFinite(price)) return null;
  const dailyChangePct =
    Number.isFinite(prev) && (prev as number) > 0
      ? ((price as number) / (prev as number) - 1) * 100
      : 0;
  return { price: price as number, dailyChangePct: +dailyChangePct.toFixed(2) };
}

export async function fetchCandles(
  pair: string,
  style: TradingStyle,
  rangeOverride?: string // deeper history for profiles that need it (e.g. "2y")
): Promise<Candle[] | null> {
  if (!pair) return null;
  const p = STYLE_PARAMS[style];
  const r = await fetchChart(pair, p.interval, rangeOverride ?? p.range, 900);
  const ts = r?.timestamp;
  const q = r?.indicators?.quote?.[0];
  if (!ts || !q?.close) return null;

  // Zip arrays; Yahoo pads market gaps with nulls — cleanCandles drops them.
  const candles: Candle[] = ts.map((t, i) => ({
    time: t,
    open: Number(q.open?.[i]),
    high: Number(q.high?.[i]),
    low: Number(q.low?.[i]),
    close: Number(q.close?.[i]),
    volume: Number(q.volume?.[i] ?? 0),
  }));
  const clean = cleanCandles(candles);
  return clean.length >= 5 ? clean : null;
}
