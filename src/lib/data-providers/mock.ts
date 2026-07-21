import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";
import type { DataProvider } from "./provider";
import { sampleAssets } from "@/data/sampleAssets";
import { sampleCandles } from "@/data/sampleCandles";
import { scoreAsset } from "@/lib/signal-engine";

// The mock provider serves sample daily data regardless of trading style.
export const mockProvider: DataProvider = {
  name: "mock-sample",
  async getAssets(symbols?: string[]): Promise<Asset[]> {
    const list = symbols?.length
      ? sampleAssets.filter((a) => symbols.includes(a.symbol))
      : sampleAssets;
    return list.map((asset) => {
      const candles = sampleCandles[asset.symbol];
      if (!candles || candles.length < 50) return asset;
      const { score, signal, stopSuggestion, breakdown, indicators } = scoreAsset(candles);
      return {
        ...asset,
        score,
        signal,
        stopSuggestion,
        detail: {
          trendPts: breakdown.trend,
          momentumPts: breakdown.momentum,
          macdPts: breakdown.macdScore,
          emaDiffPct: indicators.emaDiffPct,
          rsi: indicators.rsi,
          macdHistogram: indicators.macdHistogram,
        },
      };
    });
  },
  async getCandles(symbol: string): Promise<Candle[] | null> {
    return sampleCandles[symbol] ?? null;
  },
};
