import type { Candle } from "@/data/sampleCandles";

// Defensive cleanup for candles from any live feed: drop rows with non-finite
// values, sort oldest-first by time, and de-dupe by time. Lightweight Charts
// throws on unsorted/duplicate times, and NaN OHLC would silently poison the
// indicators — this keeps both safe.
export function cleanCandles(candles: Candle[]): Candle[] {
  const finite = candles.filter(
    (c) =>
      Number.isFinite(c.time) &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close)
  );
  finite.sort((a, b) => a.time - b.time);

  const out: Candle[] = [];
  for (const c of finite) {
    const prev = out[out.length - 1];
    if (prev && prev.time === c.time) out[out.length - 1] = c; // keep the latest
    else out.push(c);
  }
  return out;
}
