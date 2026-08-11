// Rule-based trade setup builder (long-only). Pure math, no UI.
//
// Derives an EXAMPLE setup from the asset's own data and the user's saved risk
// defaults — never a recommendation, never auto-traded:
//   Entry  = latest close
//   SL1    = entry − 1×ATR(14)          (tight, volatility stop)
//   SL2    = recent swing low (engine's stopSuggestion) when below SL1,
//            otherwise entry − 2×ATR    (wider, structural stop)
//   TP1–3  = entry + 1R / 2R / 3R where R = entry − SL1
//            (TP2 satisfies the app's ≥2:1 reward-to-risk rule by construction)
// A setup is only ELIGIBLE when the verdict is "Buy Candidate" and a position
// can be sized — the app's hard rule, made visible.

import type { Candle } from "@/data/sampleCandles";
import type { SignalVerdict } from "@/lib/signal-engine";
import { atr } from "@/lib/signal-engine/indicators";
import { calculateTradePlan, type TradePlanResult } from "@/lib/risk/calculator";
import type { TradePrefs } from "@/lib/prefs";

export interface TradeSetup {
  eligible: true;
  entry: number;
  sl1: number;
  sl1Pct: number; // % below entry
  sl2: number;
  sl2Pct: number;
  sl2Basis: "swing-low" | "2x-volatility";
  tp1: number;
  tp2: number;
  tp3: number;
  tpPcts: [number, number, number]; // % above entry
  atrValue: number;
  plan: TradePlanResult; // sizing + warnings from the user's own defaults
}

export interface NoSetup {
  eligible: false;
  reasons: string[];
}

// A patient limit-order entry below the current price, with the full setup
// recomputed from its fill price.
export interface LimitEntry {
  key: "shallow" | "deeper";
  label: string;
  basis: string; // plain-English rule behind the level
  entry: number;
  belowMarketPct: number; // how far below the market entry (positive number)
  setup: TradeSetup;
}

export interface EntryPlan {
  market: TradeSetup | NoSetup; // entry at the latest price (current behavior)
  limits: LimitEntry[]; // patient alternatives (empty when market is ineligible)
  skipped: { label: string; reason: string }[]; // levels dropped for honesty
}

function roundPrice(v: number, ref: number): number {
  return +v.toFixed(ref < 1 ? 6 : 2);
}

export function buildTradeSetup(
  candles: Candle[],
  // Structural type: works with any scoring profile's result — the setup only
  // ever depends on the verdict and the engine's universal stop suggestion.
  scoreResult: { signal: SignalVerdict; stopSuggestion: number },
  prefs: TradePrefs,
  // entryOverride: price a LIMIT order would fill at (defaults to the latest
  // close = market entry). All levels derive from the entry, so the same
  // published rules stay true at the override price.
  opts: { entryOverride?: number } = {}
): TradeSetup | NoSetup {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const entry = opts.entryOverride ?? closes[closes.length - 1];

  const atrArr = atr(highs, lows, closes, 14);
  const a = atrArr[atrArr.length - 1];

  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(a) || a <= 0) {
    return { eligible: false, reasons: ["Not enough price history to measure volatility."] };
  }

  if (scoreResult.signal !== "Buy Candidate") {
    const why =
      scoreResult.signal === "Avoid"
        ? "the verdict is Avoid — trend and momentum look weak"
        : "the verdict is Wait — the signals don't currently line up strongly enough";
    return {
      eligible: false,
      reasons: [
        `No setup right now: ${why}.`,
        "A setup appears only when the signals support a Buy Candidate with a valid stop and acceptable reward-to-risk.",
      ],
    };
  }

  // Levels
  let sl1 = entry - a;
  const swing = scoreResult.stopSuggestion;
  let sl2: number;
  let sl2Basis: TradeSetup["sl2Basis"];
  if (swing > 0 && swing < sl1) {
    sl2 = swing;
    sl2Basis = "swing-low";
  } else {
    sl2 = entry - 2 * a;
    sl2Basis = "2x-volatility";
  }
  if (sl2 <= 0 || sl1 <= 0) {
    return { eligible: false, reasons: ["Volatility is too large relative to price to place a sensible stop."] };
  }

  const r = entry - sl1;
  let tp1 = entry + r;
  let tp2 = entry + 2 * r;
  let tp3 = entry + 3 * r;

  // Sizing from the user's own defaults (stop = SL1, target = TP2 → R:R 2:1).
  const plan = calculateTradePlan({
    accountSize: Number(prefs.accountSize),
    riskPercent: Number(prefs.riskPercent),
    entry,
    stopLoss: sl1,
    target: tp2,
    direction: "long",
  });

  if (!plan.canSize) {
    return {
      eligible: false,
      reasons: ["A position can't be sized from your saved defaults — check your account size and risk % in Settings."],
    };
  }

  // Round for display after all math.
  sl1 = roundPrice(sl1, entry);
  sl2 = roundPrice(sl2, entry);
  tp1 = roundPrice(tp1, entry);
  tp2 = roundPrice(tp2, entry);
  tp3 = roundPrice(tp3, entry);

  const pct = (v: number) => +(((v - entry) / entry) * 100).toFixed(2);

  return {
    eligible: true,
    entry: roundPrice(entry, entry),
    sl1,
    sl1Pct: pct(sl1),
    sl2,
    sl2Pct: pct(sl2),
    sl2Basis,
    tp1,
    tp2,
    tp3,
    tpPcts: [pct(tp1), pct(tp2), pct(tp3)],
    atrValue: roundPrice(a, entry),
    plan,
  };
}

// Entry price plan: the market entry PLUS patient limit-order levels below it.
//   Shallow pullback = market − 0.5×ATR   (waits for a small dip)
//   Deeper pullback  = market − 1.0×ATR   (waits for a real dip)
// Honesty rules: a level at or below the recent swing low is dropped — a dip
// that deep would break the very structure the Buy Candidate rests on. Each
// kept level gets the full setup recomputed from its fill price, so SL1/SL2,
// the 1R/2R/3R ladder, and sizing all stay true to the published rules.
export function buildEntryPlan(
  candles: Candle[],
  scoreResult: { signal: SignalVerdict; stopSuggestion: number },
  prefs: TradePrefs
): EntryPlan {
  const market = buildTradeSetup(candles, scoreResult, prefs);
  if (!market.eligible) return { market, limits: [], skipped: [] };

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const atrArr = atr(highs, lows, closes, 14);
  const a = atrArr[atrArr.length - 1];
  const marketEntry = closes[closes.length - 1];
  const swing = scoreResult.stopSuggestion;

  const limits: LimitEntry[] = [];
  const skipped: EntryPlan["skipped"] = [];

  const candidates: { key: LimitEntry["key"]; label: string; basis: string; mult: number }[] = [
    {
      key: "shallow",
      label: "Shallow pullback",
      basis: "0.5× recent volatility (ATR-14) below the current price",
      mult: 0.5,
    },
    {
      key: "deeper",
      label: "Deeper pullback",
      basis: "1× recent volatility (ATR-14) below the current price",
      mult: 1.0,
    },
  ];

  for (const cand of candidates) {
    const entry = roundPrice(marketEntry - cand.mult * a, marketEntry);
    if (!(entry > 0) || (swing > 0 && entry <= swing)) {
      skipped.push({
        label: cand.label,
        reason:
          "This level sits at or below the recent swing low — a pullback that deep would break the support this signal rests on, so no limit order is suggested there.",
      });
      continue;
    }
    const setup = buildTradeSetup(candles, scoreResult, prefs, { entryOverride: entry });
    if (!setup.eligible) {
      skipped.push({ label: cand.label, reason: setup.reasons[0] ?? "Setup not computable at this level." });
      continue;
    }
    limits.push({
      key: cand.key,
      label: cand.label,
      basis: cand.basis,
      entry,
      belowMarketPct: +(((marketEntry - entry) / marketEntry) * 100).toFixed(2),
      setup,
    });
  }

  return { market, limits, skipped };
}
