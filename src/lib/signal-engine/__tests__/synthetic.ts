// Synthetic candle builders for profile tests. Deterministic — no randomness,
// so every test failure is reproducible.

import type { Candle } from "@/data/sampleCandles";

export function candlesFromCloses(closes: number[], volumes?: number[]): Candle[] {
  return closes.map((close, i) => {
    const open = i === 0 ? close : closes[i - 1];
    return {
      time: 1_700_000_000 + i * 86_400,
      open,
      high: Math.max(open, close) * 1.002,
      low: Math.min(open, close) * 0.998,
      close,
      volume: volumes ? volumes[i] : 1000,
    };
  });
}

/** Steady geometric drift: +pctPerBar% every bar. */
export function trendCloses(n: number, start: number, pctPerBar: number): number[] {
  const out: number[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    out.push(price);
    price *= 1 + pctPerBar / 100;
  }
  return out;
}

/** Alternating up/down bars with a net drift (RSI settles mid-range). */
export function zigzagCloses(
  n: number,
  start: number,
  upPct: number,
  downPct: number
): number[] {
  const out: number[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    out.push(price);
    price *= i % 2 === 0 ? 1 + upPct / 100 : 1 - downPct / 100;
  }
  return out;
}

/** Gains that grow every bar — keeps the MACD histogram rising at the end. */
export function acceleratingCloses(
  n: number,
  start: number,
  fromPct: number,
  toPct: number
): number[] {
  const out: number[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    out.push(price);
    const pct = fromPct + ((toPct - fromPct) * i) / (n - 1);
    price *= 1 + pct / 100;
  }
  return out;
}

/** Append a sharp multi-bar dip (for the RSI(2) pullback scenario). */
export function withDip(closes: number[], dipBars: number, dipPctPerBar: number): number[] {
  const out = [...closes];
  let price = out[out.length - 1];
  for (let i = 0; i < dipBars; i++) {
    price *= 1 - dipPctPerBar / 100;
    out.push(price);
  }
  return out;
}
