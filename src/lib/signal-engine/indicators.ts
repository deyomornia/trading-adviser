// Pure math — no UI or framework imports.
// All functions return a value per input price, aligned by index.

/** Exponential Moving Average (EMA). */
export function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = new Array(prices.length);
  result[0] = prices[0];
  for (let i = 1; i < prices.length; i++) {
    result[i] = prices[i] * k + result[i - 1] * (1 - k);
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
