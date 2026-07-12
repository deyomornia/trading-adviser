// Live data provider: real crypto (Binance) + real commodities (Twelve Data,
// when a key is present), each falling back to SAMPLE per-asset if a fetch
// fails. Asset names/types/currency come from the sample registry; live feeds
// only supply price, daily change, and candles.

import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";
import type { DataProvider } from "./provider";
import { sampleAssets } from "@/data/sampleAssets";
import { sampleCandles } from "@/data/sampleCandles";
import { scoreAsset } from "@/lib/signal-engine";
import * as binance from "./binance";
import * as twelveData from "./twelve-data";

// Pick the right live source for a symbol (or null if none applies).
function sourceFor(symbol: string) {
  if (binance.isBinanceSymbol(symbol)) return binance;
  if (twelveData.isTwelveDataSymbol(symbol)) return twelveData;
  return null;
}

function scoreOnto(base: Asset, candles: Candle[] | null): Asset {
  if (!candles || candles.length < 50) return base;
  const { score, signal, stopSuggestion } = scoreAsset(candles);
  return { ...base, score, signal, stopSuggestion };
}

async function buildAsset(meta: Asset): Promise<Asset> {
  const source = sourceFor(meta.symbol);
  if (source) {
    const [quote, candles] = await Promise.all([
      source.fetchQuote(meta.symbol),
      source.fetchCandles(meta.symbol),
    ]);
    if (quote && candles) {
      // Genuine live data — mark it NOT sample.
      const live: Asset = {
        ...meta,
        price: quote.price,
        dailyChangePct: quote.dailyChangePct,
        isSample: false,
      };
      return scoreOnto(live, candles);
    }
  }
  // Fallback: sample values + sample candles, clearly still labelled SAMPLE.
  return scoreOnto({ ...meta, isSample: true }, sampleCandles[meta.symbol] ?? null);
}

export const liveProvider: DataProvider = {
  name: "live",
  async getAssets(): Promise<Asset[]> {
    return Promise.all(sampleAssets.map(buildAsset));
  },
  async getCandles(symbol: string): Promise<Candle[] | null> {
    const source = sourceFor(symbol);
    if (source) {
      const candles = await source.fetchCandles(symbol);
      if (candles) return candles;
    }
    return sampleCandles[symbol] ?? null;
  },
};
