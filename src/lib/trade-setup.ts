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
import type { ScoreResult } from "@/lib/signal-engine";
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

function roundPrice(v: number, ref: number): number {
  return +v.toFixed(ref < 1 ? 6 : 2);
}

export function buildTradeSetup(
  candles: Candle[],
  scoreResult: ScoreResult,
  prefs: TradePrefs
): TradeSetup | NoSetup {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const entry = closes[closes.length - 1];

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
