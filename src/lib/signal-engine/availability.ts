// The honesty guard: before scoring an asset with a profile, confirm the data
// actually supports it. We never score with missing, thin, or fake data —
// "unavailable with a reason" is always better than a wrong number.
//
// Provider volume survey (verified with real API calls, 2026-07-28):
//   Binance klines (crypto)     — volume present on every bar, all intervals.
//   Twelve Data XAU/USD (Gold)  — volume is null (spot feed) → volume-based
//                                 profiles are honestly unavailable for Gold.
//   Yahoo futures (CL=F etc.)   — daily bars ~99% carry volume (fine);
//                                 hourly bars only ~70% do → day-style volume
//                                 profiles fail the 90% check below (correct).
//   Yahoo 1d × range=2y         — ~500 clean candles → deep-history profiles
//                                 (RSI(2) Pullback needs 260) are covered.
// The runtime check below stays authoritative either way — it looks at the
// candles we actually received, not at what a provider promises.

import type { Candle } from "@/data/sampleCandles";
import type { TradingStyle } from "@/lib/tradingStyle";
import type { ScoringProfile } from "./profiles";

export interface AvailabilityMeta {
  assetName?: string; // e.g. "Gold" — makes the reason readable
  sourceLabel?: string; // e.g. "Twelve Data" — name the source, don't blame the asset
}

// Machine-readable category, so the screener can aggregate skip reasons.
export type AvailabilityCode =
  | "no-history"
  | "short-history"
  | "needs-intraday"
  | "no-volume"
  | "sample-only";

export type Availability =
  | { ok: true }
  | { ok: false; code: AvailabilityCode; reason: string };

export function checkAvailability(
  profile: ScoringProfile,
  candles: Candle[] | null,
  style: TradingStyle,
  meta: AvailabilityMeta = {}
): Availability {
  const name = meta.assetName ?? "this asset";

  if (!candles || candles.length === 0) {
    return {
      ok: false,
      code: "no-history",
      reason: `No price history is available for ${name} right now.`,
    };
  }

  if (candles.length < profile.minCandles) {
    return {
      ok: false,
      code: "short-history",
      reason:
        `${profile.name} needs at least ${profile.minCandles} ` +
        `candles of history, but only ${candles.length} are available for ${name}.`,
    };
  }

  if (profile.requires.includes("intraday") && style !== "day") {
    return {
      ok: false,
      code: "needs-intraday",
      reason: `${profile.name} works on hourly bars only — switch to the Day trading style to use it.`,
    };
  }

  if (profile.requires.includes("volume")) {
    // Check the data we actually received, not what the provider promises:
    // at least ~90% of the most recent candles must carry real volume.
    const recent = candles.slice(-profile.minCandles);
    const withVolume = recent.filter((c) => Number.isFinite(c.volume) && c.volume > 0).length;
    if (withVolume < recent.length * 0.9) {
      const src = meta.sourceLabel ? `the ${meta.sourceLabel} feed` : "this data source";
      return {
        ok: false,
        code: "no-volume",
        reason:
          `${profile.name} needs trading-volume data, ` +
          `but ${src} does not report reliable volume for ${name}.`,
      };
    }
  }

  return { ok: true };
}
