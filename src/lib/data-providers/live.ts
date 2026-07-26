// Live data provider driven by the asset catalog. Fetches candles at the
// timeframe for the chosen trading style (day = hourly, swing = daily,
// position = weekly), and falls back to SAMPLE per-asset if a fetch fails or
// no live feed exists.

import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";
import type { DataProvider } from "./provider";
import { assetCatalog, catalogBySymbol, DEFAULT_WATCHLIST, type CatalogAsset } from "@/data/assetCatalog";
import { sampleAssets } from "@/data/sampleAssets";
import { sampleCandles } from "@/data/sampleCandles";
import { scoreAsset, MIN_CANDLES } from "@/lib/signal-engine";
import { STYLE_CONFIG, type TradingStyle } from "@/lib/tradingStyle";
import * as binance from "./binance";
import * as twelveData from "./twelve-data";

// Last ~40 closes, downsampled to ≤20 points, for the row sparkline.
function sparkFrom(candles: Candle[]): number[] {
  const closes = candles.slice(-40).map((c) => c.close);
  const step = Math.max(1, Math.ceil(closes.length / 20));
  const out: number[] = [];
  for (let i = 0; i < closes.length; i += step) out.push(closes[i]);
  if (out[out.length - 1] !== closes[closes.length - 1]) out.push(closes[closes.length - 1]);
  return out;
}

function scoreOnto(base: Asset, candles: Candle[] | null, style: TradingStyle): Asset {
  if (!candles || candles.length < MIN_CANDLES) return base;
  const { score, signal, stopSuggestion, breakdown, indicators } = scoreAsset(candles, style);
  return {
    ...base,
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
    spark: sparkFrom(candles),
  };
}

// SAMPLE fallback for one catalog asset. Sample candles are daily, so they are
// always scored with the "swing" thresholds regardless of the selected style.
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
  return scoreOnto(base, sampleCandles[cat.symbol] ?? null, "swing");
}

async function fetchLive(cat: CatalogAsset, style: TradingStyle) {
  const cfg = STYLE_CONFIG[style];
  if (cat.source === "binance" && cat.pair) {
    return Promise.all([
      binance.fetchQuote(cat.pair),
      binance.fetchCandles(cat.pair, cfg.binanceInterval, cfg.limit),
    ]);
  }
  if (cat.source === "twelvedata" && cat.pair) {
    return Promise.all([
      twelveData.fetchQuote(cat.pair),
      twelveData.fetchCandles(cat.pair, cfg.twelveInterval, cfg.limit),
    ]);
  }
  return [null, null] as const;
}

async function buildAsset(cat: CatalogAsset, style: TradingStyle): Promise<Asset> {
  const [quote, candles] = await fetchLive(cat, style);
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
    return scoreOnto(live, candles, style);
  }
  return sampleAsset(cat);
}

export const liveProvider: DataProvider = {
  name: "live",
  async getAssets(symbols?: string[], style: TradingStyle = "swing"): Promise<Asset[]> {
    const wanted = (symbols && symbols.length ? symbols : DEFAULT_WATCHLIST)
      .map(catalogBySymbol)
      .filter((c): c is CatalogAsset => Boolean(c));
    const seen = new Set<string>();
    const unique = wanted.filter((c) => (seen.has(c.symbol) ? false : seen.add(c.symbol)));
    return Promise.all(unique.map((c) => buildAsset(c, style)));
  },
  async getCandles(symbol: string, style: TradingStyle = "swing"): Promise<Candle[] | null> {
    const cat = catalogBySymbol(symbol);
    if (!cat) return sampleCandles[symbol] ?? null;
    const [, candles] = await fetchLive(cat, style);
    if (candles) return candles;
    return sampleCandles[symbol] ?? null;
  },
};

export { assetCatalog };
