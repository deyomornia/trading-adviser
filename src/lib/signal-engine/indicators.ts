// Pure math — no UI or framework imports.
// All functions return a value per input price, aligned by index.

/**
 * Exponential Moving Average (EMA).
 * Seeded with a Simple Moving Average of the first `period` finite values (the
 * standard warm-up), so the average isn't contaminated by an arbitrary first
 * price. Indexes before the seed are NaN. Tolerates leading NaN inputs (e.g.
 * the MACD line, which is undefined until the slow EMA warms up).
 */
export function ema(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  const k = 2 / (period + 1);

  // First index that has a finite value (skip leading NaN).
  const start = values.findIndex((v) => Number.isFinite(v));
  if (start === -1 || values.length - start < period) return result;

  let sum = 0;
  for (let i = start; i < start + period; i++) sum += values[i];
  result[start + period - 1] = sum / period; // SMA seed

  for (let i = start + period; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/** Wilder RSI (14-period default). Returns NaN for the first <period> indexes. */
export function rsi(prices: number[], period = 14): number[] {
  const result: number[] = Array(prices.length).fill(NaN);
  if (prices.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) avgGain += d;
    else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export interface MacdOutput {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

/** Standard MACD (12, 26, 9). */
export function macd(
  prices: number[],
  fast = 12,
  slow = 26,
  signal = 9
): MacdOutput {
  const fastEma   = ema(prices, fast);
  const slowEma   = ema(prices, slow);
  const macdLine  = fastEma.map((f, i) => f - slowEma[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  return { macdLine, signalLine, histogram };
}
