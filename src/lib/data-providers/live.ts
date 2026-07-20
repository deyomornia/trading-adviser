// Live data provider driven by the asset catalog. For each requested symbol it
// routes to the right feed (Binance / Twelve Data), and falls back to SAMPLE
// per-asset if a fetch fails or no live feed exists.

import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";
import type { DataProvider } from "./provider";
import { assetCatalog, catalogBySymbol, DEFAULT_WATCHLIST, type CatalogAsset } from "@/data/assetCatalog";
import { sampleAssets } from "@/data/sampleAssets";
import { sampleCandles } from "@/data/sampleCandles";
import { scoreAsset } from "@/lib/signal-engine";
import * as binance from "./binance";
import * as twelveData from "./twelve-data";

function scoreOnto(base: Asset, candles: Candle[] | null): Asset {
  if (!candles || candles.length < 50) return base;
  const { score, signal, stopSuggestion } = scoreAsset(candles);
  return { ...base, score, signal, stopSuggestion };
}

// SAMPLE fallback for one catalog asset (uses sample data if we have it).
function sampleAsset(cat: CatalogAsset): Asset {
  const s = sampleAssets.find((a) => a.symbol === cat.symbol);
  const base: Asset = s
    ? { ...s, isSample: true }
    : {
        symbol: cat.symbol,
        name: cat.name,
        type: cat.type,
        price: 0,
        dailyChangePct: 0,
        currency: cat.currency,
        isSample: true,
      };
  return scoreOnto(base, sampleCandles[cat.symbol] ?? null);
}

async function fetchLive(cat: CatalogAsset) {
  if (cat.source === "binance" && cat.pair) {
    return Promise.all([binance.fetchQuote(cat.pair), binance.fetchCandles(cat.pair)]);
  }
  if (cat.source === "twelvedata" && cat.pair) {
    return Promise.all([twelveData.fetchQuote(cat.pair), twelveData.fetchCandles(cat.pair)]);
  }
  return [null, null] as const;
}

async function buildAsset(cat: CatalogAsset): Promise<Asset> {
  const [quote, candles] = await fetchLive(cat);
  if (quote && candles) {
    const live: Asset = {
      symbol: cat.symbol,
      name: cat.name,
      type: cat.type,
      price: quote.price,
      dailyChangePct: quote.dailyChangePct,
      currency: cat.currency,
      isSample: false,
    };
    return scoreOnto(live, candles);
  }
  return sampleAsset(cat);
}

export const liveProvider: DataProvider = {
  name: "live",
  async getAssets(symbols?: string[]): Promise<Asset[]> {
    const wanted = (symbols && symbols.length ? symbols : DEFAULT_WATCHLIST)
      .map(catalogBySymbol)
      .filter((c): c is CatalogAsset => Boolean(c));
    // De-dupe while preserving order.
    const seen = new Set<string>();
    const unique = wanted.filter((c) => (seen.has(c.symbol) ? false : seen.add(c.symbol)));
    return Promise.all(unique.map(buildAsset));
  },
  async getCandles(symbol: string): Promise<Candle[] | null> {
    const cat = catalogBySymbol(symbol);
    if (!cat) return sampleCandles[symbol] ?? null;
    const [, candles] = await fetchLive(cat);
    if (candles) return candles;
    return sampleCandles[symbol] ?? null;
  },
};

// Exposed for callers that want the whole catalog (e.g. the watchlist page).
export { assetCatalog };
