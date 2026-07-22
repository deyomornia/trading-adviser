// Combines EMA, RSI, MACD into a 0–100 score and a plain-English verdict.
// Hard rules (from project spec):
//   "Buy Candidate" requires: score >= 65 AND uptrend AND valid stop level.
//   If any condition fails the verdict downgrades to "Wait".

import type { Candle } from "@/data/sampleCandles";
import type { TradingStyle } from "@/lib/tradingStyle"; // type-only: no runtime import
import { ema, rsi, macd } from "./indicators";

export type SignalVerdict = "Buy Candidate" | "Wait" | "Avoid";

// Enough candles for EMA-50 + MACD (26+9) to be warmed up before we score.
export const MIN_CANDLES = 55;

// Trend thresholds (EMA-20 vs EMA-50 gap, in %) scale with the timeframe: the
// gap between averages is naturally much smaller on hourly bars than on weekly.
// Without this, "Buy Candidate" was almost impossible on Day and too easy on
// Position. strong/mild/up feed the trend score; buyGate/flatFloor gate the verdict.
interface TrendThresholds {
  strong: number;
  mild: number;
  up: number;
  flatFloor: number; // below this = downtrend (Avoid)
  buyGate: number;   // EMA gap needed to allow "Buy Candidate"
}
const TREND_THRESHOLDS: Record<TradingStyle, TrendThresholds> = {
  day: { strong: 1.0, mild: 0.4, up: 0, flatFloor: -0.7, buyGate: 1.0 },
  swing: { strong: 3, mild: 1, up: 0, flatFloor: -2, buyGate: 3 },
  position: { strong: 6, mild: 2, up: 0, flatFloor: -3, buyGate: 6 },
};

export interface ScoreResult {
  score: number;
  signal: SignalVerdict;
  stopSuggestion: number;
  breakdown: {
    trend: number;    // 0–35
    momentum: number; // 0–35
    macdScore: number; // 0–30
  };
  // Raw indicator readings, so the Asset Detail page can explain the score.
  indicators: {
    lastClose: number;
    ema20: number;
    ema50: number;
    emaDiffPct: number;    // how far EMA-20 is above/below EMA-50
    rsi: number;           // 0–100
    macdHistogram: number; // >0 = momentum building
    trendUp: boolean;
  };
}

// One plain-English explanation point. `tone` drives the colour in the UI.
export interface ExplanationPoint {
  label: string;
  text: string;
  tone: "good" | "neutral" | "bad";
}

export function scoreAsset(candles: Candle[], style: TradingStyle = "swing"): ScoreResult {
  const closes = candles.map((c) => c.close);
  const lows   = candles.map((c) => c.low);

  const ema20  = ema(closes, 20);
  const ema50  = ema(closes, 50);
  const rsiArr = rsi(closes, 14);
  const { macdLine, signalLine, histogram } = macd(closes);

  const last = closes.length - 1;
  const curEma20 = ema20[last];
  const curEma50 = ema50[last];
  const curRsi   = Number.isFinite(rsiArr[last]) ? rsiArr[last] : 50;
  const curMacd  = macdLine[last];
  const curSig   = signalLine[last];
  const curHist  = Number.isFinite(histogram[last]) ? histogram[last] : 0;
  const prevHist = last >= 1 && Number.isFinite(histogram[last - 1]) ? histogram[last - 1] : curHist;

  const t = TREND_THRESHOLDS[style];

  // ── Trend: EMA-20 vs EMA-50 gap % (0–35 pts) ───────────────────────────
  // Guard against a non-finite or ~zero EMA-50 (treat as flat / no trend).
  const emaDiffPct =
    Number.isFinite(curEma20) && Number.isFinite(curEma50) && curEma50 > 0
      ? ((curEma20 - curEma50) / curEma50) * 100
      : 0;
  const trendScore =
    emaDiffPct > t.strong    ? 35 :
    emaDiffPct > t.mild      ? 26 :
    emaDiffPct > t.up        ? 18 :
    emaDiffPct > t.flatFloor ?  8 : 0;

  // ── Momentum: RSI linearly scaled 30→0 pts, 70→35 pts (0–35 pts) ────────
  const momentumScore = Math.max(0, Math.min(35, Math.round((curRsi - 30) * 35 / 40)));

  // ── MACD (0–30 pts) ──────────────────────────────────────────────────────
  const macdOk = Number.isFinite(curMacd) && Number.isFinite(curSig);
  const macdScore =
    macdOk && curMacd > curSig && curHist > 0 && curHist >= prevHist ? 30 :
    macdOk && curMacd > curSig && curHist > 0                        ? 20 :
    macdOk && curMacd > curSig                                       ? 12 :
    curHist > prevHist                                               ?  8 : 0;

  const score = Math.min(100, trendScore + momentumScore + macdScore);

  // Stop suggestion: lowest low of the last 20 candles (recent support)
  const recentLows = lows.slice(-20).filter((l) => Number.isFinite(l) && l > 0);
  const stopSuggestion = recentLows.length ? +Math.min(...recentLows).toFixed(2) : 0;

  const lastClose = closes[last];
  const validStop = stopSuggestion > 0 && stopSuggestion < lastClose;

  // Hard rules — the EMA gap must clear the timeframe's buy gate to be a
  // "Buy Candidate"; a gap below the flat floor is a downtrend → "Avoid".
  let signal: SignalVerdict;
  if (score >= 65 && emaDiffPct > t.buyGate && validStop) {
    signal = "Buy Candidate";
  } else if (score < 40 || emaDiffPct < t.flatFloor) {
    signal = "Avoid";
  } else {
    signal = "Wait";
  }

  return {
    score,
    signal,
    stopSuggestion,
    breakdown: { trend: trendScore, momentum: momentumScore, macdScore },
    indicators: {
      lastClose: +lastClose.toFixed(2),
      ema20: +curEma20.toFixed(2),
      ema50: +curEma50.toFixed(2),
      emaDiffPct: +emaDiffPct.toFixed(2),
      rsi: +curRsi.toFixed(1),
      macdHistogram: +curHist.toFixed(4),
      trendUp: emaDiffPct > 0,
    },
  };
}

// Turns the numbers into calm, plain-English reasons for the Asset Detail page.
// Non-promissory language only ("suggests", "may") — never "guaranteed".
export function explainScore(result: ScoreResult): ExplanationPoint[] {
  const { indicators: ind, signal, stopSuggestion } = result;
  const points: ExplanationPoint[] = [];

  // Trend
  if (ind.emaDiffPct > 3) {
    points.push({
      label: "Trend",
      tone: "good",
      text: "Strong uptrend — the 20-day average sits well above the 50-day average.",
    });
  } else if (ind.emaDiffPct > 0) {
    points.push({
      label: "Trend",
      tone: "neutral",
      text: "Mild uptrend — the short-term average is just above the long-term average.",
    });
  } else if (ind.emaDiffPct > -2) {
    points.push({
      label: "Trend",
      tone: "neutral",
      text: "Roughly flat — the two averages are close together, so there is no clear direction.",
    });
  } else {
    points.push({
      label: "Trend",
      tone: "bad",
      text: "Downtrend — the short-term average is below the long-term average.",
    });
  }

  // Momentum (RSI)
  if (ind.rsi >= 70) {
    points.push({
      label: "Momentum",
      tone: "neutral",
      text: `Momentum is very strong (RSI ${ind.rsi}), which can also mean it is overbought and due a pause.`,
    });
  } else if (ind.rsi >= 55) {
    points.push({
      label: "Momentum",
      tone: "good",
      text: `Healthy upward momentum (RSI ${ind.rsi}).`,
    });
  } else if (ind.rsi >= 45) {
    points.push({
      label: "Momentum",
      tone: "neutral",
      text: `Momentum is neutral (RSI ${ind.rsi}).`,
    });
  } else {
    points.push({
      label: "Momentum",
      tone: "bad",
      text: `Weak momentum (RSI ${ind.rsi}).`,
    });
  }

  // MACD
  if (ind.macdHistogram > 0) {
    points.push({
      label: "MACD",
      tone: "good",
      text: "MACD is positive — recent momentum is building rather than fading.",
    });
  } else {
    points.push({
      label: "MACD",
      tone: "bad",
      text: "MACD is negative — recent momentum is fading.",
    });
  }

  // What the verdict means + risk framing (honours the hard rule about stops)
  if (signal === "Buy Candidate") {
    points.push({
      label: "What this suggests",
      tone: "good",
      text: `The signals line up. If you consider a trade, a stop-loss around ${stopSuggestion} (recent support) keeps risk defined. This is not advice — confirm with your own plan on the Trade Plan page.`,
    });
  } else if (signal === "Wait") {
    points.push({
      label: "What this suggests",
      tone: "neutral",
      text: "The picture is mixed. It may be better to wait for a clearer trend or stronger confirmation before acting.",
    });
  } else {
    points.push({
      label: "What this suggests",
      tone: "bad",
      text: "The trend and momentum are weak. It may be best to avoid this one for now.",
    });
  }

  return points;
}
