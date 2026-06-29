// 90 days of synthetic OHLCV candles per asset.
// Generated deterministically so signals are stable across reloads.
// All isSample data — never present as live prices.

export interface Candle {
  time: number;  // Unix seconds (daily)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Numerical Recipes LCG — deterministic, no Date.now() dependency
function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function generateCandles(
  basePrice: number,
  trendPct: number,   // daily drift %
  volPct: number,     // daily volatility %
  seed: number,
  days = 90
): Candle[] {
  const rand = makeLcg(seed);
  // Fixed anchor: 2026-06-29 00:00 UTC = 1782777600
  const anchor = 1782777600;
  const candles: Candle[] = [];
  let price = basePrice;

  for (let i = days - 1; i >= 0; i--) {
    const open = price;
    const noise = (rand() - 0.5) * 2 * (volPct / 100);
    const close = Math.max(open * (1 + trendPct / 100 + noise), 0.001);
    const highNoise = rand() * (volPct / 200) * open;
    const lowNoise  = rand() * (volPct / 200) * open;
    const high = Math.max(open, close) + highNoise;
    const low  = Math.min(open, close) - lowNoise;
    const volume = Math.round(basePrice * 500 * (0.5 + rand()));

    candles.push({
      time:   anchor - i * 86400,
      open:   +open.toFixed(2),
      high:   +high.toFixed(2),
      low:    +low.toFixed(2),
      close:  +close.toFixed(2),
      volume,
    });
    price = close;
  }
  return candles;
}

export const sampleCandles: Record<string, Candle[]> = {
  BTC: generateCandles(58000,  0.11, 2.5, 1),   // steady uptrend → Buy Candidate
  ETH: generateCandles( 3000,  0.04, 5.0, 2),   // weak trend, noisy → Wait
  SOL: generateCandles(   72,  0.80, 4.5, 3),   // strong uptrend   → Buy Candidate
  XAU: generateCandles( 2220,  0.06, 0.8, 4),   // mild uptrend     → Wait
  WTI: generateCandles(   92, -0.17, 2.0, 5),   // downtrend        → Avoid
  HG:  generateCandles( 4.45,  0.01, 1.5, 6),   // flat             → Wait
};
