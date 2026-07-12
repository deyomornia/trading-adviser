import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";
import type { DataProvider } from "./provider";
import { sampleAssets } from "@/data/sampleAssets";
import { sampleCandles } from "@/data/sampleCandles";
import { scoreAsset } from "@/lib/signal-engine";

export const mockProvider: DataProvider = {
  name: "mock-sample",
  async getAssets(): Promise<Asset[]> {
    return sampleAssets.map((asset) => {
      const candles = sampleCandles[asset.symbol];
      if (!candles || candles.length < 50) return asset;
      const { score, signal, stopSuggestion } = scoreAsset(candles);
      return { ...asset, score, signal, stopSuggestion };
    });
  },
  async getCandles(symbol: string): Promise<Candle[] | null> {
    return sampleCandles[symbol] ?? null;
  },
};
