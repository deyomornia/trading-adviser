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
import {
  scoreWithProfile,
  toSignalDetail,
  classicProfile,
  type ScoringProfile,
} from "@/lib/signal-engine";
import { STYLE_CONFIG, type TradingStyle } from "@/lib/tradingStyle";
import * as binance from "./binance";
import * as twelveData from "./twelve-data";
import * as yahoo from "./yahoo";

// Human-readable feed names for honest "not available" messages.
const SOURCE_LABEL: Record<CatalogAsset["source"], string> = {
  binance: "Binance",
  twelvedata: "Twelve Data",
  yahoo: "Yahoo Finance",
  sample: "sample-data",
};

// Last ~40 closes, downsampled to ≤20 points, for the row sparkline.
function sparkFrom(candles: Candle[]): number[] {
  const closes = candles.slice(-40).map((c) => c.close);
  const step = Math.max(1, Math.ceil(closes.length / 20));
  const out: number[] = [];
  for (let i = 0; i < closes.length; i += step) out.push(closes[i]);
  if (out[out.length - 1] !== closes[closes.length - 1]) out.push(closes[closes.length - 1]);
  return out;
}

function scoreOnto(
  base: Asset,
  candles: Candle[] | null,
  style: TradingStyle,
  profile: ScoringProfile,
  sourceLabel?: string
): Asset {
  const outcome = scoreWithProfile(candles, style, profile, {
    assetName: base.name,
    sourceLabel,
  });
  if (outcome.status === "unavailable") {
    return {
      ...base,
      unavailableReason: outcome.reason,
      unavailableCode: outcome.code,
      spark: candles && candles.length ? sparkFrom(candles) : undefined,
    };
  }
  const r = outcome.result;
  return {
    ...base,
    score: r.score,
    signal: r.signal,
    stopSuggestion: r.stopSuggestion,
    detail: toSignalDetail(r),
    profileId: r.profileId,
    spark: candles && candles.length ? sparkFrom(candles) : undefined,
  };
}

// SAMPLE fallback for one catalog asset. Sample candles are daily-only, so
// they are always scored with Classic on "swing" thresholds — a non-Classic
// profile on sample data would be dishonest, and reports unavailable instead.
function sampleAsset(cat: CatalogAsset, profile: ScoringProfile): Asset {
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
  const candles = sampleCandles[cat.symbol] ?? null;
  if (profile.id !== "classic") {
    return {
      ...base,
      unavailableReason: `${profile.name} needs live market data — only SAMPLE data is available for ${base.name} right now.`,
      unavailableCode: "sample-only",
      spark: candles && candles.length ? sparkFrom(candles) : undefined,
    };
  }
  return scoreOnto(base, candles, "swing", profile, SOURCE_LABEL[cat.source]);
}

async function fetchLive(cat: CatalogAsset, style: TradingStyle, profile: ScoringProfile) {
  const cfg = STYLE_CONFIG[style];
  // A profile may need deeper history than the style's default fetch
  // (e.g. a 200-day average). Classic never sets this, so its inputs —
  // and therefore its scores — are unchanged.
  const limit = profile.fetch?.limit ?? cfg.limit;
  const yahooRange = profile.fetch?.yahooRange?.[style];
  if (cat.source === "binance" && cat.pair) {
    return Promise.all([
      binance.fetchQuote(cat.pair),
      binance.fetchCandles(cat.pair, cfg.binanceInterval, limit),
    ]);
  }
  if (cat.source === "twelvedata" && cat.pair) {
    return Promise.all([
      twelveData.fetchQuote(cat.pair),
      twelveData.fetchCandles(cat.pair, cfg.twelveInterval, limit),
    ]);
  }
  if (cat.source === "yahoo" && cat.pair) {
    // Yahoo maps the style to interval+range itself (range overridable).
    return Promise.all([
      yahoo.fetchQuote(cat.pair),
      yahoo.fetchCandles(cat.pair, style, yahooRange),
    ]);
  }
  return [null, null] as const;
}

async function buildAsset(
  cat: CatalogAsset,
  style: TradingStyle,
  profile: ScoringProfile
): Promise<Asset> {
  const [quote, candles] = await fetchLive(cat, style, profile);
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
    return scoreOnto(live, candles, style, profile, SOURCE_LABEL[cat.source]);
  }
  return sampleAsset(cat, profile);
}

export const liveProvider: DataProvider = {
  name: "live",
  async getAssets(
    symbols?: string[],
    style: TradingStyle = "swing",
    profile: ScoringProfile = classicProfile
  ): Promise<Asset[]> {
    const wanted = (symbols && symbols.length ? symbols : DEFAULT_WATCHLIST)
      .map(catalogBySymbol)
      .filter((c): c is CatalogAsset => Boolean(c));
    const seen = new Set<string>();
    const unique = wanted.filter((c) => (seen.has(c.symbol) ? false : seen.add(c.symbol)));
    return Promise.all(unique.map((c) => buildAsset(c, style, profile)));
  },
  async getCandles(
    symbol: string,
    style: TradingStyle = "swing",
    profile: ScoringProfile = classicProfile
  ): Promise<Candle[] | null> {
    const cat = catalogBySymbol(symbol);
    if (!cat) return sampleCandles[symbol] ?? null;
    const [, candles] = await fetchLive(cat, style, profile);
    if (candles) return candles;
    return sampleCandles[symbol] ?? null;
  },
};

export { assetCatalog };
