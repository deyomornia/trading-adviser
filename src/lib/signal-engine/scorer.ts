// Combines EMA, RSI, MACD into a 0–100 score and a plain-English verdict.
// Hard rules (from project spec):
//   "Buy Candidate" requires: score >= 65 AND uptrend AND valid stop level.
//   If any condition fails the verdict downgrades to "Wait".

import type { Candle } from "@/data/sampleCandles";
import { ema, rsi, macd } from "./indicators";

export type SignalVerdict = "Buy Candidate" | "Wait" | "Avoid";

export interface ScoreResult {
  score: number;
  signal: SignalVerdict;
  stopSuggestion: number;
  breakdown: {
    trend: number;    // 0–35
    momentum: number; // 0–35
    macdScore: number; // 0–30
  };
}

export function scoreAsset(candles: Candle[]): ScoreResult {
  const closes = candles.map((c) => c.close);
  const lows   = candles.map((c) => c.low);

  const ema20  = ema(closes, 20);
  const ema50  = ema(closes, 50);
  const rsiArr = rsi(closes, 14);
  const { macdLine, signalLine, histogram } = macd(closes);

  const last = closes.length - 1;
  const curEma20 = ema20[last];
  const curEma50 = ema50[last];
  const curRsi   = rsiArr[last];
  const curMacd  = macdLine[last];
  const curSig   = signalLine[last];
  const curHist  = histogram[last];
  const prevHist = histogram[last - 1];

  // ── Trend: EMA-20 vs EMA-50 (0–35 pts) ─────────────────────────────────
  const emaDiffPct = ((curEma20 - curEma50) / curEma50) * 100;
  const trendScore =
    emaDiffPct > 3  ? 35 :
    emaDiffPct > 1  ? 26 :
    emaDiffPct > 0  ? 18 :
    emaDiffPct > -2 ?  8 : 0;

  // ── Momentum: RSI linearly scaled 30→0 pts, 70→35 pts (0–35 pts) ────────
  const momentumScore = Math.max(0, Math.min(35, Math.round((curRsi - 30) * 35 / 40)));

  // ── MACD (0–30 pts) ──────────────────────────────────────────────────────
  const macdScore =
    curMacd > curSig && curHist > 0 && curHist >= prevHist ? 30 :
    curMacd > curSig && curHist > 0                        ? 20 :
    curMacd > curSig                                       ? 12 :
    curHist > prevHist                                     ?  8 : 0;

  const score = Math.min(100, trendScore + momentumScore + macdScore);

  // Stop suggestion: lowest low of the last 20 candles (recent support)
  const recentLows = lows.slice(-20);
  const stopSuggestion = +Math.min(...recentLows).toFixed(2);

  const lastClose = closes[last];
  const validStop = stopSuggestion > 0 && stopSuggestion < lastClose;

  // Hard rules — EMA gap must be clearly positive (>3%) to call "Buy Candidate".
  // Low-vol assets (gold, copper) can have inflated RSI yet flat trends, so the
  // tighter EMA filter prevents false positives.
  let signal: SignalVerdict;
  if (score >= 65 && emaDiffPct > 3 && validStop) {
    signal = "Buy Candidate";
  } else if (score < 40 || emaDiffPct < -2) {
    signal = "Avoid";
  } else {
    signal = "Wait";
  }

  return {
    score,
    signal,
    stopSuggestion,
    breakdown: { trend: trendScore, momentum: momentumScore, macdScore },
  };
}
