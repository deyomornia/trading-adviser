// The honesty guard: before scoring an asset with a profile, confirm the data
// actually supports it. We never score with missing, thin, or fake data —
// "unavailable with a reason" is always better than a wrong number.

import type { Candle } from "@/data/sampleCandles";
import type { TradingStyle } from "@/lib/tradingStyle";
import type { ScoringProfile } from "./profiles";

export interface AvailabilityMeta {
  assetName?: string; // e.g. "Gold" — makes the reason readable
  sourceLabel?: string; // e.g. "Twelve Data" — name the source, don't blame the asset
}

export type Availability = { ok: true } | { ok: false; reason: string };

export function checkAvailability(
  profile: ScoringProfile,
  candles: Candle[] | null,
  style: TradingStyle,
  meta: AvailabilityMeta = {}
): Availability {
  const name = meta.assetName ?? "this asset";

  if (!candles || candles.length === 0) {
    return { ok: false, reason: `No price history is available for ${name} right now.` };
  }

  if (candles.length < profile.minCandles) {
    return {
      ok: false,
      reason:
        `${profile.name} needs at least ${profile.minCandles} ` +
        `candles of history, but only ${candles.length} are available for ${name}.`,
    };
  }

  if (profile.requires.includes("intraday") && style !== "day") {
    return {
      ok: false,
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
        reason:
          `${profile.name} needs trading-volume data, ` +
          `but ${src} does not report reliable volume for ${name}.`,
      };
    }
  }

  return { ok: true };
}
