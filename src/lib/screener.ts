// "Top Opportunities" screener: scores every live-capable asset in the catalog
// for the chosen trading style and returns the highest-scoring ones.
//
// Honesty rule: only assets with real LIVE data are ranked. Anything that fell
// back to SAMPLE (missing key, failed fetch, sample-only source) is excluded —
// we never recommend from placeholder data.

import { unstable_cache } from "next/cache";
import type { Asset } from "@/types";
import type { TradingStyle } from "@/lib/tradingStyle";
import { assetCatalog } from "@/data/assetCatalog";
import { liveProvider } from "@/lib/data-providers/live";
import { classicProfile, type ScoringProfile } from "@/lib/signal-engine";

export const SCREENER_LIMIT = 15;

async function scan(
  style: TradingStyle,
  profile: ScoringProfile,
  limit: number
): Promise<Asset[]> {
  // Every catalog asset that has a live feed at all (excludes sample-only).
  const symbols = assetCatalog.filter((a) => a.source !== "sample").map((a) => a.symbol);

  const assets = await liveProvider.getAssets(symbols, style, profile);

  return assets
    .filter((a) => !a.isSample && a.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

// Cached per style + profile for 5 minutes so the ~45-asset fan-out runs at
// most once per combination per window (the underlying fetches also cache).
export async function getTopOpportunities(
  style: TradingStyle,
  profile: ScoringProfile = classicProfile,
  limit = SCREENER_LIMIT
): Promise<Asset[]> {
  const cached = unstable_cache(
    () => scan(style, profile, limit),
    ["top-opportunities", style, profile.id, String(limit)],
    { revalidate: 300 }
  );
  return cached();
}
