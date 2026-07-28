import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";
import type { DataProvider } from "./provider";
import { sampleAssets } from "@/data/sampleAssets";
import { sampleCandles } from "@/data/sampleCandles";
import {
  scoreWithProfile,
  toSignalDetail,
  classicProfile,
  type ScoringProfile,
} from "@/lib/signal-engine";

// The mock provider serves sample daily data regardless of trading style.
export const mockProvider: DataProvider = {
  name: "mock-sample",
  async getAssets(
    symbols?: string[],
    _style?: unknown,
    profile: ScoringProfile = classicProfile
  ): Promise<Asset[]> {
    const list = symbols?.length
      ? sampleAssets.filter((a) => symbols.includes(a.symbol))
      : sampleAssets;
    return list.map((asset) => {
      const candles = sampleCandles[asset.symbol] ?? null;
      // Sample candles are daily-only. Same honesty rule as the live
      // provider's fallback: non-Classic combinations need live data.
      if (profile.id !== "classic") {
        return {
          ...asset,
          unavailableReason: `${profile.name} needs live market data — only SAMPLE data is available for ${asset.name} right now.`,
          unavailableCode: "sample-only",
        };
      }
      const outcome = scoreWithProfile(candles, "swing", profile, {
        assetName: asset.name,
        sourceLabel: "sample-data",
      });
      if (outcome.status === "unavailable") {
        return { ...asset, unavailableReason: outcome.reason, unavailableCode: outcome.code };
      }
      const r = outcome.result;
      return {
        ...asset,
        score: r.score,
        signal: r.signal,
        stopSuggestion: r.stopSuggestion,
        detail: toSignalDetail(r),
        profileId: r.profileId,
        spark: candles ? candles.slice(-20).map((c) => c.close) : undefined,
      };
    });
  },
  async getCandles(symbol: string): Promise<Candle[] | null> {
    return sampleCandles[symbol] ?? null;
  },
};
