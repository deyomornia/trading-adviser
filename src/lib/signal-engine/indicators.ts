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

/**
 * Wilder-smoothed Average True Range (ATR). NaN for the first <period> indexes.
 * True range = max(high−low, |high−prevClose|, |low−prevClose|).
 */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number[] {
  const n = closes.length;
  const result: number[] = Array(n).fill(NaN);
  if (n <= period) return result;

  const tr = (i: number) =>
    i === 0
      ? highs[0] - lows[0]
      : Math.max(
          highs[i] - lows[i],
          Math.abs(highs[i] - closes[i - 1]),
          Math.abs(lows[i] - closes[i - 1])
        );

  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr(i);
  result[period] = sum / period;

  for (let i = period + 1; i < n; i++) {
    result[i] = (result[i - 1] * (period - 1) + tr(i)) / period;
  }
  return result;
}

/** Simple Moving Average (SMA). NaN for the first <period − 1> indexes. */
export function sma(values: number[], period: number): number[] {
  const result: number[] = Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

export interface AdxOutput {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

/**
 * Wilder's ADX with +DI / −DI (period 14 default).
 *   +DM = up-move when it exceeds the down-move (and is > 0), else 0
 *   −DM = down-move when it exceeds the up-move (and is > 0), else 0
 *   DI  = 100 × Wilder-smoothed DM ÷ Wilder-smoothed TR
 *   DX  = 100 × |+DI − −DI| ÷ (+DI + −DI)
 *   ADX = Wilder-smoothed DX (first value at index 2×period − 1)
 * DI values start at index <period>; ADX needs a second warm-up on top.
 */
export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): AdxOutput {
  const n = closes.length;
  const out: AdxOutput = {
    adx: Array(n).fill(NaN),
    plusDI: Array(n).fill(NaN),
    minusDI: Array(n).fill(NaN),
  };
  if (n <= period) return out;

  const tr: number[] = Array(n).fill(0);
  const plusDM: number[] = Array(n).fill(0);
  const minusDM: number[] = Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    const up = highs[i] - highs[i - 1];
    const down = lows[i - 1] - lows[i];
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
  }

  // Wilder's running-total smoothing: first value is a plain sum, then
  // smoothed(i) = smoothed(i−1) − smoothed(i−1)/period + current(i).
  let sTR = 0;
  let sPlus = 0;
  let sMinus = 0;
  for (let i = 1; i <= period; i++) {
    sTR += tr[i];
    sPlus += plusDM[i];
    sMinus += minusDM[i];
  }

  const dx: number[] = Array(n).fill(NaN);
  for (let i = period; i < n; i++) {
    if (i > period) {
      sTR = sTR - sTR / period + tr[i];
      sPlus = sPlus - sPlus / period + plusDM[i];
      sMinus = sMinus - sMinus / period + minusDM[i];
    }
    const pDI = sTR > 0 ? (100 * sPlus) / sTR : 0;
    const mDI = sTR > 0 ? (100 * sMinus) / sTR : 0;
    out.plusDI[i] = pDI;
    out.minusDI[i] = mDI;
    dx[i] = pDI + mDI > 0 ? (100 * Math.abs(pDI - mDI)) / (pDI + mDI) : 0;
  }

  // ADX: average of the first <period> DX values, then Wilder-smoothed.
  const firstAdxAt = 2 * period - 1;
  if (n <= firstAdxAt) return out;
  let sum = 0;
  for (let i = period; i < period + period; i++) sum += dx[i];
  out.adx[firstAdxAt] = sum / period;
  for (let i = firstAdxAt + 1; i < n; i++) {
    out.adx[i] = (out.adx[i - 1] * (period - 1) + dx[i]) / period;
  }
  return out;
}

/**
 * Rolling VWAP over the trailing <window> candles (24 hourly bars ≈ one day).
 * Rolling, not session-anchored — crypto trades 24/7 and has no session.
 *   typical price = (high + low + close) / 3
 *   VWAP = Σ(typical × volume) ÷ Σ(volume) over the window
 * NaN before the window fills or when the window has zero total volume
 * (we never fake a volume-weighted price from volume-less data).
 */
export function rollingVwap(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  window: number
): number[] {
  const n = closes.length;
  const result: number[] = Array(n).fill(NaN);
  if (window <= 0 || n < window) return result;

  let pvSum = 0; // Σ(typical × volume)
  let vSum = 0; // Σ(volume)
  const tpv = (i: number) => {
    const v = Number.isFinite(volumes[i]) ? volumes[i] : 0;
    return { pv: ((highs[i] + lows[i] + closes[i]) / 3) * v, v };
  };

  for (let i = 0; i < n; i++) {
    const cur = tpv(i);
    pvSum += cur.pv;
    vSum += cur.v;
    if (i >= window) {
      const old = tpv(i - window);
      pvSum -= old.pv;
      vSum -= old.v;
    }
    if (i >= window - 1) result[i] = vSum > 0 ? pvSum / vSum : NaN;
  }
  return result;
}

export interface BollingerOutput {
  upper: number[];
  middle: number[];
  lower: number[];
}

/**
 * Bollinger Bands: middle = SMA(period), bands = middle ± mult × σ.
 * σ is the POPULATION standard deviation over the window (divide by N, not
 * N−1) — the convention charting platforms use, so values match TradingView.
 */
export function bollinger(
  values: number[],
  period = 20,
  mult = 2
): BollingerOutput {
  const n = values.length;
  const middle = sma(values, period);
  const upper: number[] = Array(n).fill(NaN);
  const lower: number[] = Array(n).fill(NaN);

  for (let i = period - 1; i < n; i++) {
    const mean = middle[i];
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = values[j] - mean;
      sq += d * d;
    }
    const sd = Math.sqrt(sq / period);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { upper, middle, lower };
}

/** Rate of Change (%): (value ÷ value <period> bars ago − 1) × 100. */
export function roc(values: number[], period: number): number[] {
  const result: number[] = Array(values.length).fill(NaN);
  for (let i = period; i < values.length; i++) {
    const prev = values[i - period];
    if (Number.isFinite(prev) && prev !== 0 && Number.isFinite(values[i])) {
      result[i] = (values[i] / prev - 1) * 100;
    }
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
