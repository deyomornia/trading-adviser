// Scoring-profile registry — THE single source of truth for every indicator
// combination the app offers. The engine, the UI breakdowns, the screener,
// the AI prompt, and the /methodology page all read from here; no profile
// number may be hardcoded anywhere else.
//
// Pure TS + pure math only: never import next/headers, providers, or React.

import type { Candle } from "@/data/sampleCandles";
import type { TradingStyle } from "@/lib/tradingStyle"; // type-only
import {
  scoreAsset,
  explainScore,
  TREND_THRESHOLDS,
  MIN_CANDLES,
  type SignalVerdict,
  type ExplanationPoint,
  type ScoreResult,
} from "./scorer";
import { sma, adx, rollingVwap, bollinger, roc } from "./indicators";

export type Tone = "good" | "neutral" | "bad";
export type EvidenceTier = "research-backed" | "practitioner-tested";
export type ProfileRequirement = "volume" | "intraday";

// Everything a component/gate needs to compute, built once per scoring run.
// Indicator accessors are memoized so several components can share results.
export interface IndicatorContext {
  candles: Candle[];
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  last: number; // last index
  style: TradingStyle;
  ema(period: number): number[];
  rsi(period: number): number[];
  macd(): { macdLine: number[]; signalLine: number[]; histogram: number[] };
  atr(period: number): number[];
  // Generic memo for anything else a profile computes more than once.
  memo<T>(key: string, fn: () => T): T;
}

export interface ComponentOutcome {
  points: number;
  hint: string; // one short plain-English line for the popover/breakdown
  tone: Tone;
}

export interface ProfileComponent {
  key: string; // stable id, e.g. "trend"
  name: string; // UI label, e.g. "Trend (EMA 20 vs 50)"
  indicator: string; // e.g. "EMA 20/50 gap" — for the methodology table
  maxPoints: number; // all components of a profile must sum to exactly 100
  // Display-only tier table for the methodology page. Must mirror compute().
  tiers: { rule: string; points: number }[];
  compute(ctx: IndicatorContext): ComponentOutcome;
}

export interface ProfileGate {
  key: string;
  label: string; // plain English, e.g. "EMA-20 above EMA-50 by more than 3%"
  check(ctx: IndicatorContext): { passed: boolean; detail: string };
}

export interface ProfileRule {
  key: string;
  label: string; // fired = instant "Avoid"
  check(ctx: IndicatorContext): { fired: boolean; detail: string };
}

// A line drawn on the price chart (computed server-side, rendered client-side).
export interface OverlaySeries {
  label: string;
  color: string;
  points: { time: number; value: number }[];
}

// ── Engine output shapes (dynamic breakdown — no fixed 35/35/30 anywhere) ──

export interface ComponentResult {
  key: string;
  name: string;
  points: number;
  maxPoints: number;
  hint: string;
  tone: Tone;
}

export interface GateResult {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ProfileScoreResult {
  profileId: string;
  profileName: string;
  score: number; // 0–100
  signal: SignalVerdict;
  stopSuggestion: number; // lowest low of last 20 candles (engine-owned)
  lastClose: number;
  components: ComponentResult[];
  buyGates: GateResult[]; // includes the universal stop-loss gate
  avoidsFired: GateResult[]; // avoid rules that fired (empty = none)
  readings: { label: string; value: string }[]; // raw numbers for the detail page
  explanation: ExplanationPoint[]; // plain-English reasons
}

export interface ScoringProfile {
  id: string;
  name: string;
  styles: TradingStyle[];
  timeframe: string; // "Hourly bars" | "Daily bars" | "Weekly bars"
  description: string; // 1 line for the picker
  evidenceTier: EvidenceTier;
  evidenceNote: string; // 1–2 sentences for the methodology page
  logicNote?: string; // special reading rules (e.g. RSI(2): low is GOOD) — fed to AI + UI
  minCandles: number;
  requires: ProfileRequirement[];
  // Extra history needed beyond the style's default fetch. Absent = default.
  fetch?: { limit: number; yahooRange?: Partial<Record<TradingStyle, string>> };
  components: ProfileComponent[];
  buyGates: ProfileGate[];
  avoidRules: ProfileRule[];
  readings(ctx: IndicatorContext): { label: string; value: string }[];
  overlays(ctx: IndicatorContext): OverlaySeries[];
  // Escape hatch used ONLY by Classic: delegate to the original scorer so its
  // behavior is bit-identical to the pre-profile engine (guarded by tests).
  run?(candles: Candle[], style: TradingStyle): ProfileScoreResult;
}

// ── Classic (DG Default) — the original engine, wrapped unchanged ──────────

// Memoized original-scorer call so classic's components/gates (used for docs
// and tests — run() is the hot path) don't recompute per component.
function classicResult(ctx: IndicatorContext): ScoreResult {
  return ctx.memo("classic:scoreAsset", () => scoreAsset(ctx.candles, ctx.style));
}

function classicTone(points: number, max: number): Tone {
  return points >= max * 0.6 ? "good" : points > 0 ? "neutral" : "bad";
}

function classicHints(r: ScoreResult) {
  const ind = r.indicators;
  return {
    trend:
      ind.emaDiffPct > 0
        ? `Uptrend — 20-avg ${ind.emaDiffPct}% above the 50-avg`
        : `Flat/down — 20-avg ${ind.emaDiffPct}% vs 50-avg`,
    momentum: `RSI ${ind.rsi}`,
    macd:
      ind.macdHistogram > 0
        ? "MACD positive — momentum building"
        : "MACD negative — momentum fading",
  };
}

function classicReadings(r: ScoreResult): { label: string; value: string }[] {
  return [
    { label: "RSI (14)", value: String(r.indicators.rsi) },
    { label: "EMA 20", value: String(r.indicators.ema20) },
    { label: "EMA 50", value: String(r.indicators.ema50) },
    { label: "EMA gap", value: `${r.indicators.emaDiffPct}%` },
  ];
}

// Adapter: original ScoreResult → the dynamic profile shape. The numbers pass
// through untouched; only the packaging changes.
export function runClassic(candles: Candle[], style: TradingStyle): ProfileScoreResult {
  const r = scoreAsset(candles, style);
  const t = TREND_THRESHOLDS[style];
  const hints = classicHints(r);
  const validStop = r.stopSuggestion > 0 && r.stopSuggestion < r.indicators.lastClose;

  return {
    profileId: "classic",
    profileName: "Classic (DG Default)",
    score: r.score,
    signal: r.signal,
    stopSuggestion: r.stopSuggestion,
    lastClose: r.indicators.lastClose,
    components: [
      {
        key: "trend",
        name: "Trend (EMA 20 vs 50)",
        points: r.breakdown.trend,
        maxPoints: 35,
        hint: hints.trend,
        tone: classicTone(r.breakdown.trend, 35),
      },
      {
        key: "momentum",
        name: "Momentum (RSI)",
        points: r.breakdown.momentum,
        maxPoints: 35,
        hint: hints.momentum,
        tone: classicTone(r.breakdown.momentum, 35),
      },
      {
        key: "macd",
        name: "MACD",
        points: r.breakdown.macdScore,
        maxPoints: 30,
        hint: hints.macd,
        tone: classicTone(r.breakdown.macdScore, 30),
      },
    ],
    buyGates: [
      {
        key: "stop",
        label: "A valid stop-loss level below the current price",
        passed: validStop,
        detail: validStop
          ? `Recent support at ${r.stopSuggestion}`
          : "No clear recent support below the price",
      },
      {
        key: "trend-gate",
        label: `EMA-20 above EMA-50 by more than ${t.buyGate}%`,
        passed: r.indicators.emaDiffPct > t.buyGate,
        detail: `Gap is ${r.indicators.emaDiffPct}%`,
      },
    ],
    avoidsFired:
      r.indicators.emaDiffPct < t.flatFloor
        ? [
            {
              key: "downtrend",
              label: `EMA-20 below EMA-50 by more than ${Math.abs(t.flatFloor)}%`,
              passed: false,
              detail: `Gap is ${r.indicators.emaDiffPct}%`,
            },
          ]
        : [],
    readings: classicReadings(r),
    explanation: explainScore(r),
  };
}

export const classicProfile: ScoringProfile = {
  id: "classic",
  name: "Classic (DG Default)",
  styles: ["day", "swing", "position"],
  timeframe: "Hourly / daily / weekly bars (follows your trading style)",
  description:
    "The original DG recipe: EMA 20/50 trend, RSI 14 momentum, and MACD — balanced and steady.",
  evidenceTier: "practitioner-tested",
  evidenceNote:
    "Three of the most widely used indicators, combined with our own weights. This has been the app's engine since launch.",
  minCandles: MIN_CANDLES,
  requires: [],
  components: [
    {
      key: "trend",
      name: "Trend (EMA 20 vs 50)",
      indicator: "EMA 20 vs EMA 50 gap (%)",
      maxPoints: 35,
      // Thresholds scale with the trading style — see TREND_THRESHOLDS.
      tiers: [
        { rule: "Gap above the style's “strong” threshold (1% / 3% / 6%)", points: 35 },
        { rule: "Gap above the “mild” threshold (0.4% / 1% / 2%)", points: 26 },
        { rule: "Gap above zero", points: 18 },
        { rule: "Gap between zero and the downtrend floor (−0.7% / −2% / −3%)", points: 8 },
        { rule: "Below the downtrend floor", points: 0 },
      ],
      compute(ctx) {
        const r = classicResult(ctx);
        return {
          points: r.breakdown.trend,
          hint: classicHints(r).trend,
          tone: classicTone(r.breakdown.trend, 35),
        };
      },
    },
    {
      key: "momentum",
      name: "Momentum (RSI)",
      indicator: "RSI 14",
      maxPoints: 35,
      tiers: [
        { rule: "RSI scaled linearly: 30 → 0 points, 70 → 35 points", points: 35 },
      ],
      compute(ctx) {
        const r = classicResult(ctx);
        return {
          points: r.breakdown.momentum,
          hint: classicHints(r).momentum,
          tone: classicTone(r.breakdown.momentum, 35),
        };
      },
    },
    {
      key: "macd",
      name: "MACD",
      indicator: "MACD 12/26/9",
      maxPoints: 30,
      tiers: [
        { rule: "Line above signal, histogram positive and rising", points: 30 },
        { rule: "Line above signal, histogram positive", points: 20 },
        { rule: "Line above signal", points: 12 },
        { rule: "Histogram improving only", points: 8 },
        { rule: "Otherwise", points: 0 },
      ],
      compute(ctx) {
        const r = classicResult(ctx);
        return {
          points: r.breakdown.macdScore,
          hint: classicHints(r).macd,
          tone: classicTone(r.breakdown.macdScore, 30),
        };
      },
    },
  ],
  buyGates: [
    {
      key: "trend-gate",
      label: "EMA-20 above EMA-50 by more than the style's buy gate (1% / 3% / 6%)",
      check(ctx) {
        const r = classicResult(ctx);
        const t = TREND_THRESHOLDS[ctx.style];
        return {
          passed: r.indicators.emaDiffPct > t.buyGate,
          detail: `Gap is ${r.indicators.emaDiffPct}% (needs > ${t.buyGate}%)`,
        };
      },
    },
  ],
  avoidRules: [
    {
      key: "downtrend",
      label: "EMA-20 below EMA-50 by more than the style's floor (−0.7% / −2% / −3%)",
      check(ctx) {
        const r = classicResult(ctx);
        const t = TREND_THRESHOLDS[ctx.style];
        return {
          fired: r.indicators.emaDiffPct < t.flatFloor,
          detail: `Gap is ${r.indicators.emaDiffPct}%`,
        };
      },
    },
  ],
  readings(ctx) {
    return classicReadings(classicResult(ctx));
  },
  overlays(ctx) {
    const ema20 = ctx.ema(20);
    const ema50 = ctx.ema(50);
    const line = (label: string, color: string, values: number[]) => ({
      label,
      color,
      points: ctx.candles
        .map((c, i) => ({ time: c.time, value: values[i] }))
        .filter((p) => Number.isFinite(p.value)),
    });
    return [line("EMA 20", "#38bdf8", ema20), line("EMA 50", "#a78bfa", ema50)];
  },
  run: runClassic,
};

// ── Shared helpers for the combination profiles ────────────────────────────

const COLORS = {
  sky: "#38bdf8",
  violet: "#a78bfa",
  amber: "#fbbf24",
  emerald: "#34d399",
  rose: "#fb7185",
};

// % that `a` sits above/below `b` (NaN when the base is unusable).
function pctDiff(a: number, b: number): number {
  return Number.isFinite(a) && Number.isFinite(b) && b > 0 ? ((a - b) / b) * 100 : NaN;
}

function fmt(v: number, dp = 2): string {
  return Number.isFinite(v) ? v.toFixed(dp) : "—";
}

function fmtPrice(v: number): string {
  return Number.isFinite(v) ? (Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2)) : "—";
}

function lineSeries(
  ctx: IndicatorContext,
  label: string,
  color: string,
  values: number[]
): OverlaySeries {
  return {
    label,
    color,
    points: ctx.candles
      .map((c, i) => ({ time: c.time, value: values[i] }))
      .filter((p) => Number.isFinite(p.value)),
  };
}

// Current bar's volume vs its 20-bar average (NaN when volume is unusable —
// the availability guard normally prevents that for `requires: volume`).
function volumeRatio(ctx: IndicatorContext): number {
  const avg = ctx.memo("volSma20", () => sma(ctx.volumes, 20))[ctx.last];
  const cur = ctx.volumes[ctx.last];
  return Number.isFinite(avg) && avg > 0 && Number.isFinite(cur) ? cur / avg : NaN;
}

// "Volume vs 20-bar average" component with tiers >1.5× / >1.0× / below.
function volumeVs20Component(points: [number, number, number]): ProfileComponent {
  const [strong, ok, weak] = points;
  return {
    key: "volume",
    name: "Volume confirmation",
    indicator: "Current volume vs 20-bar volume average",
    maxPoints: strong,
    tiers: [
      { rule: "Volume above 1.5× its 20-bar average", points: strong },
      { rule: "Volume above 1.0× its 20-bar average", points: ok },
      { rule: "Volume at or below its average (or no volume data)", points: weak },
    ],
    compute(ctx) {
      const ratio = volumeRatio(ctx);
      if (!Number.isFinite(ratio)) {
        return { points: weak, hint: "No usable volume data", tone: "neutral" };
      }
      const p = ratio > 1.5 ? strong : ratio > 1.0 ? ok : weak;
      return {
        points: p,
        hint: `Volume ${ratio.toFixed(2)}× its 20-bar average`,
        tone: p === strong ? "good" : p === ok ? "neutral" : "bad",
      };
    },
  };
}

// Position-style volume trend: 4-week average vs 20-week average (rising /
// steady / fading) with tiers >1.2× / >0.8× / below.
function volumeTrendComponent(points: [number, number, number]): ProfileComponent {
  const [strong, ok, weak] = points;
  return {
    key: "volume",
    name: "Volume trend",
    indicator: "4-week volume average vs 20-week volume average",
    maxPoints: strong,
    tiers: [
      { rule: "Rising — 4-week average above 1.2× the 20-week average", points: strong },
      { rule: "Steady — above 0.8× the 20-week average", points: ok },
      { rule: "Fading (or no volume data)", points: weak },
    ],
    compute(ctx) {
      const v4 = ctx.memo("volSma4", () => sma(ctx.volumes, 4))[ctx.last];
      const v20 = ctx.memo("volSma20", () => sma(ctx.volumes, 20))[ctx.last];
      const ratio =
        Number.isFinite(v4) && Number.isFinite(v20) && v20 > 0 ? v4 / v20 : NaN;
      if (!Number.isFinite(ratio)) {
        return { points: weak, hint: "No usable volume data", tone: "neutral" };
      }
      const p = ratio > 1.2 ? strong : ratio > 0.8 ? ok : weak;
      return {
        points: p,
        hint: `Recent volume ${ratio.toFixed(2)}× its 20-week average`,
        tone: p === strong ? "good" : p === ok ? "neutral" : "bad",
      };
    },
  };
}

function macdState(ctx: IndicatorContext) {
  const { macdLine, signalLine, histogram } = ctx.macd();
  const line = macdLine[ctx.last];
  const sig = signalLine[ctx.last];
  const hist = Number.isFinite(histogram[ctx.last]) ? histogram[ctx.last] : 0;
  const prevHist =
    ctx.last >= 1 && Number.isFinite(histogram[ctx.last - 1])
      ? histogram[ctx.last - 1]
      : hist;
  return {
    ok: Number.isFinite(line) && Number.isFinite(sig),
    above: Number.isFinite(line) && Number.isFinite(sig) && line > sig,
    rising: hist > prevHist,
    line,
    sig,
    hist,
  };
}

// MACD component shared by "MACD + RSI" (45/30/15) and "MACD + ADX" (40/27/13).
function macdComponent(points: [number, number, number]): ProfileComponent {
  const [full, mid, low] = points;
  return {
    key: "macd",
    name: "MACD (12/26/9)",
    indicator: "MACD line vs signal line + histogram direction",
    maxPoints: full,
    tiers: [
      { rule: "Line above signal AND histogram rising", points: full },
      { rule: "Line above signal, histogram flat or falling", points: mid },
      { rule: "Line below signal but histogram rising", points: low },
      { rule: "Otherwise", points: 0 },
    ],
    compute(ctx) {
      const m = macdState(ctx);
      const p = !m.ok ? 0 : m.above && m.rising ? full : m.above ? mid : m.rising ? low : 0;
      const hint = !m.ok
        ? "MACD not yet warmed up"
        : m.above
        ? `MACD above its signal line — momentum ${m.rising ? "building" : "steady"}`
        : m.rising
        ? "MACD below its signal line, but improving"
        : "MACD below its signal line — momentum fading";
      return { points: p, hint, tone: p >= mid ? "good" : p > 0 ? "neutral" : "bad" };
    },
  };
}

// ── Day style: EMA + RSI Confirmation ──────────────────────────────────────

const emaRsiDay: ScoringProfile = {
  id: "ema-rsi-day",
  name: "EMA + RSI Confirmation",
  styles: ["day"],
  timeframe: "Hourly bars",
  description:
    "A fast EMA 9/21 trend signal, confirmed by RSI so you don't chase a move that is already stretched.",
  evidenceTier: "practitioner-tested",
  evidenceNote:
    "Dual confirmation — a short-term trend signal plus a momentum filter that keeps you out when the move is already overextended. A widely used intraday pattern; our point weights are our own.",
  minCandles: 55,
  requires: ["volume"],
  components: [
    {
      key: "trend",
      name: "Trend (EMA 9 vs 21)",
      indicator: "EMA 9 vs EMA 21 gap (%)",
      maxPoints: 45,
      tiers: [
        { rule: "EMA-9 above EMA-21 by more than 1%", points: 45 },
        { rule: "Above by more than 0.5%", points: 34 },
        { rule: "Above by more than 0.15%", points: 22 },
        { rule: "Above by any amount", points: 10 },
        { rule: "At or below EMA-21", points: 0 },
      ],
      compute(ctx) {
        const gap = pctDiff(ctx.ema(9)[ctx.last], ctx.ema(21)[ctx.last]);
        const p = !Number.isFinite(gap)
          ? 0
          : gap > 1 ? 45 : gap > 0.5 ? 34 : gap > 0.15 ? 22 : gap > 0 ? 10 : 0;
        return {
          points: p,
          hint: Number.isFinite(gap)
            ? `EMA-9 is ${fmt(gap)}% ${gap >= 0 ? "above" : "below"} EMA-21`
            : "EMAs not yet warmed up",
          tone: p >= 34 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    {
      key: "rsi",
      name: "RSI 14 zone",
      indicator: "RSI 14",
      maxPoints: 35,
      tiers: [
        { rule: "RSI 50–70 (healthy momentum)", points: 35 },
        { rule: "RSI 40–50 (building)", points: 22 },
        { rule: "RSI 70–75 (strong but stretched)", points: 15 },
        { rule: "RSI above 75 (overextended)", points: 5 },
        { rule: "RSI below 40 (weak)", points: 0 },
      ],
      compute(ctx) {
        const r = ctx.rsi(14)[ctx.last];
        const p = !Number.isFinite(r)
          ? 0
          : r > 75 ? 5 : r >= 70 ? 15 : r >= 50 ? 35 : r >= 40 ? 22 : 0;
        return {
          points: p,
          hint: Number.isFinite(r) ? `RSI ${fmt(r, 1)}` : "RSI not yet warmed up",
          tone: p === 35 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    volumeVs20Component([20, 12, 4]),
  ],
  buyGates: [
    {
      key: "trend-gate",
      label: "EMA-9 above EMA-21 by more than 0.3%",
      check(ctx) {
        const gap = pctDiff(ctx.ema(9)[ctx.last], ctx.ema(21)[ctx.last]);
        return {
          passed: Number.isFinite(gap) && gap > 0.3,
          detail: `Gap is ${fmt(gap)}% (needs > 0.3%)`,
        };
      },
    },
    {
      key: "rsi-cap",
      label: "RSI at or below 75 (blocks chasing an overextended move)",
      check(ctx) {
        const r = ctx.rsi(14)[ctx.last];
        return {
          passed: Number.isFinite(r) && r <= 75,
          detail: `RSI is ${fmt(r, 1)}`,
        };
      },
    },
  ],
  avoidRules: [
    {
      key: "downtrend",
      label: "EMA-9 below EMA-21 by more than 0.7%",
      check(ctx) {
        const gap = pctDiff(ctx.ema(9)[ctx.last], ctx.ema(21)[ctx.last]);
        return {
          fired: Number.isFinite(gap) && gap < -0.7,
          detail: `Gap is ${fmt(gap)}%`,
        };
      },
    },
  ],
  readings(ctx) {
    const gap = pctDiff(ctx.ema(9)[ctx.last], ctx.ema(21)[ctx.last]);
    return [
      { label: "EMA 9", value: fmtPrice(ctx.ema(9)[ctx.last]) },
      { label: "EMA 21", value: fmtPrice(ctx.ema(21)[ctx.last]) },
      { label: "EMA gap", value: `${fmt(gap)}%` },
      { label: "RSI (14)", value: fmt(ctx.rsi(14)[ctx.last], 1) },
      { label: "Volume vs 20-bar avg", value: `${fmt(volumeRatio(ctx))}×` },
    ];
  },
  overlays(ctx) {
    return [
      lineSeries(ctx, "EMA 9", COLORS.sky, ctx.ema(9)),
      lineSeries(ctx, "EMA 21", COLORS.violet, ctx.ema(21)),
    ];
  },
};

// ── Day style: VWAP + Bollinger ────────────────────────────────────────────

function vwapState(ctx: IndicatorContext) {
  const vwap = ctx.memo("vwap24", () =>
    rollingVwap(ctx.highs, ctx.lows, ctx.closes, ctx.volumes, 24)
  )[ctx.last];
  const bands = ctx.memo("boll20", () => bollinger(ctx.closes, 20, 2));
  return {
    vwap,
    upper: bands.upper[ctx.last],
    middle: bands.middle[ctx.last],
    lower: bands.lower[ctx.last],
    close: ctx.closes[ctx.last],
  };
}

const vwapBollinger: ScoringProfile = {
  id: "vwap-bollinger",
  name: "VWAP + Bollinger",
  styles: ["day"],
  timeframe: "Hourly bars",
  description:
    "Is price trading above its volume-weighted average, with room left inside the Bollinger Bands?",
  evidenceTier: "practitioner-tested",
  evidenceNote:
    "A popular intraday combination. Honest note: results are known to be sensitive to the exact setup and market conditions — treat this one as a lens, not a verdict.",
  minCandles: 55,
  requires: ["volume", "intraday"],
  components: [
    {
      key: "vwap",
      name: "Price vs 24-hour VWAP",
      indicator: "Rolling 24-hour volume-weighted average price",
      maxPoints: 40,
      tiers: [
        { rule: "More than 1% above VWAP", points: 40 },
        { rule: "0–1% above VWAP", points: 28 },
        { rule: "Within 0.5% below VWAP", points: 10 },
        { rule: "Further below", points: 0 },
      ],
      compute(ctx) {
        const s = vwapState(ctx);
        const diff = pctDiff(s.close, s.vwap);
        const p = !Number.isFinite(diff)
          ? 0
          : diff > 1 ? 40 : diff > 0 ? 28 : diff > -0.5 ? 10 : 0;
        return {
          points: p,
          hint: Number.isFinite(diff)
            ? `Price is ${fmt(diff)}% ${diff >= 0 ? "above" : "below"} the 24h VWAP`
            : "VWAP unavailable (no volume in the window)",
          tone: p >= 28 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    {
      key: "bollinger",
      name: "Bollinger position",
      indicator: "Price vs Bollinger Bands (20, 2)",
      maxPoints: 30,
      tiers: [
        { rule: "Above the middle band, below the upper band", points: 30 },
        { rule: "At/above the upper band with volume above 1.5× average", points: 24 },
        { rule: "At/above the upper band without that volume, or more than 1% above it (overextended)", points: 10 },
        { rule: "Below the middle band", points: 0 },
      ],
      compute(ctx) {
        const s = vwapState(ctx);
        const vol = volumeRatio(ctx);
        let p = 0;
        let hint = "Bands not yet warmed up";
        if (Number.isFinite(s.middle) && Number.isFinite(s.upper)) {
          if (s.close < s.middle) {
            p = 0;
            hint = "Price is below the middle band — no upside positioning";
          } else if (s.close > s.upper * 1.01) {
            p = 10;
            hint = "Price is stretched more than 1% above the upper band";
          } else if (s.close >= s.upper) {
            p = Number.isFinite(vol) && vol > 1.5 ? 24 : 10;
            hint =
              Number.isFinite(vol) && vol > 1.5
                ? "Riding the upper band on strong volume"
                : "At the upper band without volume support — stretched";
          } else {
            p = 30;
            hint = "Above the middle band with room below the upper band";
          }
        }
        return { points: p, hint, tone: p >= 24 ? "good" : p > 0 ? "neutral" : "bad" };
      },
    },
    volumeVs20Component([30, 18, 6]),
  ],
  buyGates: [
    {
      key: "above-vwap",
      label: "Price above the 24-hour VWAP",
      check(ctx) {
        const s = vwapState(ctx);
        return {
          passed: Number.isFinite(s.vwap) && s.close > s.vwap,
          detail: `Price ${fmtPrice(s.close)} vs VWAP ${fmtPrice(s.vwap)}`,
        };
      },
    },
    {
      key: "not-overextended",
      label: "Price not more than 1% above the upper Bollinger Band",
      check(ctx) {
        const s = vwapState(ctx);
        return {
          passed: Number.isFinite(s.upper) && s.close <= s.upper * 1.01,
          detail: `Price ${fmtPrice(s.close)} vs upper band ${fmtPrice(s.upper)}`,
        };
      },
    },
  ],
  avoidRules: [
    {
      key: "below-both",
      label: "Price more than 1% below VWAP and below the middle band",
      check(ctx) {
        const s = vwapState(ctx);
        const diff = pctDiff(s.close, s.vwap);
        return {
          fired:
            Number.isFinite(diff) && diff < -1 &&
            Number.isFinite(s.middle) && s.close < s.middle,
          detail: `Price is ${fmt(diff)}% vs VWAP`,
        };
      },
    },
  ],
  readings(ctx) {
    const s = vwapState(ctx);
    return [
      { label: "24h VWAP", value: fmtPrice(s.vwap) },
      { label: "Price vs VWAP", value: `${fmt(pctDiff(s.close, s.vwap))}%` },
      { label: "Upper band", value: fmtPrice(s.upper) },
      { label: "Middle band", value: fmtPrice(s.middle) },
      { label: "Volume vs 20-bar avg", value: `${fmt(volumeRatio(ctx))}×` },
    ];
  },
  overlays(ctx) {
    const vwap = ctx.memo("vwap24", () =>
      rollingVwap(ctx.highs, ctx.lows, ctx.closes, ctx.volumes, 24)
    );
    const bands = ctx.memo("boll20", () => bollinger(ctx.closes, 20, 2));
    return [
      lineSeries(ctx, "VWAP 24h", COLORS.amber, vwap),
      lineSeries(ctx, "Boll upper", COLORS.violet, bands.upper),
      lineSeries(ctx, "Boll mid", COLORS.sky, bands.middle),
      lineSeries(ctx, "Boll lower", COLORS.violet, bands.lower),
    ];
  },
};

// ── Swing style: MACD + RSI ────────────────────────────────────────────────

const macdRsi: ScoringProfile = {
  id: "macd-rsi",
  name: "MACD + RSI",
  styles: ["swing"],
  timeframe: "Daily bars",
  description:
    "MACD momentum with an RSI sanity check — rewards building momentum that isn't overheated yet.",
  evidenceTier: "practitioner-tested",
  evidenceNote:
    "Two of the most-watched momentum tools cross-checking each other. A common swing-trading pairing; our point weights are our own.",
  minCandles: 55,
  requires: [],
  components: [
    macdComponent([45, 30, 15]),
    {
      key: "rsi",
      name: "RSI 14 zone",
      indicator: "RSI 14",
      maxPoints: 35,
      tiers: [
        { rule: "RSI 45–65 (room to run)", points: 35 },
        { rule: "RSI 65–70 (strong)", points: 28 },
        { rule: "RSI 35–45 (early)", points: 15 },
        { rule: "RSI above 70 (overheated)", points: 10 },
        { rule: "RSI below 35 (weak)", points: 0 },
      ],
      compute(ctx) {
        const r = ctx.rsi(14)[ctx.last];
        const p = !Number.isFinite(r)
          ? 0
          : r > 70 ? 10 : r >= 65 ? 28 : r >= 45 ? 35 : r >= 35 ? 15 : 0;
        return {
          points: p,
          hint: Number.isFinite(r) ? `RSI ${fmt(r, 1)}` : "RSI not yet warmed up",
          tone: p >= 28 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    volumeVs20Component([20, 12, 4]),
  ],
  buyGates: [
    {
      key: "macd-above",
      label: "MACD line above its signal line",
      check(ctx) {
        const m = macdState(ctx);
        return { passed: m.above, detail: `MACD ${fmt(m.line, 4)} vs signal ${fmt(m.sig, 4)}` };
      },
    },
    {
      key: "rsi-zone",
      label: "RSI between 45 and 70",
      check(ctx) {
        const r = ctx.rsi(14)[ctx.last];
        return {
          passed: Number.isFinite(r) && r >= 45 && r <= 70,
          detail: `RSI is ${fmt(r, 1)}`,
        };
      },
    },
  ],
  avoidRules: [
    {
      key: "macd-fading",
      label: "MACD below its signal line with a falling histogram",
      check(ctx) {
        const m = macdState(ctx);
        return {
          fired: m.ok && !m.above && !m.rising,
          detail: "Momentum is below trend and still fading",
        };
      },
    },
  ],
  readings(ctx) {
    const m = macdState(ctx);
    return [
      { label: "MACD line", value: fmt(m.line, 4) },
      { label: "Signal line", value: fmt(m.sig, 4) },
      { label: "Histogram", value: fmt(m.hist, 4) },
      { label: "RSI (14)", value: fmt(ctx.rsi(14)[ctx.last], 1) },
      { label: "Volume vs 20-bar avg", value: `${fmt(volumeRatio(ctx))}×` },
    ];
  },
  overlays(ctx) {
    return [
      lineSeries(ctx, "EMA 12", COLORS.sky, ctx.ema(12)),
      lineSeries(ctx, "EMA 26", COLORS.violet, ctx.ema(26)),
    ];
  },
};

// ── Swing style: EMA 20/50 Crossover ───────────────────────────────────────

const ema2050: ScoringProfile = {
  id: "ema-2050",
  name: "EMA 20/50 Crossover",
  styles: ["swing"],
  timeframe: "Daily bars",
  description:
    "The classic trend-following read: how decisively the 20-day average leads the 50-day, with price above both.",
  evidenceTier: "practitioner-tested",
  evidenceNote:
    "A pure trend-following recipe built on the same averages as Classic, but weighted almost entirely on trend. Trend rules shine in sustained moves and chop sideways markets.",
  minCandles: 55,
  requires: [],
  components: [
    {
      key: "gap",
      name: "Trend (EMA 20 vs 50)",
      indicator: "EMA 20 vs EMA 50 gap (%)",
      maxPoints: 55,
      tiers: [
        { rule: "EMA-20 above EMA-50 by more than 3%", points: 55 },
        { rule: "Above by 1.5–3%", points: 40 },
        { rule: "Above by 0–1.5%", points: 22 },
        { rule: "At or below EMA-50", points: 0 },
      ],
      compute(ctx) {
        const gap = pctDiff(ctx.ema(20)[ctx.last], ctx.ema(50)[ctx.last]);
        const p = !Number.isFinite(gap) ? 0 : gap > 3 ? 55 : gap >= 1.5 ? 40 : gap > 0 ? 22 : 0;
        return {
          points: p,
          hint: Number.isFinite(gap)
            ? `EMA-20 is ${fmt(gap)}% ${gap >= 0 ? "above" : "below"} EMA-50`
            : "EMAs not yet warmed up",
          tone: p >= 40 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    {
      key: "price-position",
      name: "Price vs both EMAs",
      indicator: "Close vs EMA 20 and EMA 50",
      maxPoints: 25,
      tiers: [
        { rule: "Price above both averages", points: 25 },
        { rule: "Above EMA-50 only", points: 12 },
        { rule: "Below both", points: 0 },
      ],
      compute(ctx) {
        const close = ctx.closes[ctx.last];
        const e20 = ctx.ema(20)[ctx.last];
        const e50 = ctx.ema(50)[ctx.last];
        const aboveBoth = close > e20 && close > e50;
        const above50 = close > e50;
        const p = aboveBoth ? 25 : above50 ? 12 : 0;
        return {
          points: p,
          hint: aboveBoth
            ? "Price is above both averages"
            : above50
            ? "Price is above the 50-day average only"
            : "Price is below both averages",
          tone: p === 25 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    volumeVs20Component([20, 12, 4]),
  ],
  buyGates: [
    {
      key: "gap-gate",
      label: "EMA-20 above EMA-50 by more than 3%",
      check(ctx) {
        const gap = pctDiff(ctx.ema(20)[ctx.last], ctx.ema(50)[ctx.last]);
        return { passed: Number.isFinite(gap) && gap > 3, detail: `Gap is ${fmt(gap)}% (needs > 3%)` };
      },
    },
    {
      key: "above-both",
      label: "Price above both averages",
      check(ctx) {
        const close = ctx.closes[ctx.last];
        const passed = close > ctx.ema(20)[ctx.last] && close > ctx.ema(50)[ctx.last];
        return { passed, detail: passed ? "Price leads both averages" : "Price is not above both averages" };
      },
    },
  ],
  avoidRules: [
    {
      key: "downtrend",
      label: "EMA-20 below EMA-50 by more than 2%",
      check(ctx) {
        const gap = pctDiff(ctx.ema(20)[ctx.last], ctx.ema(50)[ctx.last]);
        return { fired: Number.isFinite(gap) && gap < -2, detail: `Gap is ${fmt(gap)}%` };
      },
    },
  ],
  readings(ctx) {
    const gap = pctDiff(ctx.ema(20)[ctx.last], ctx.ema(50)[ctx.last]);
    return [
      { label: "EMA 20", value: fmtPrice(ctx.ema(20)[ctx.last]) },
      { label: "EMA 50", value: fmtPrice(ctx.ema(50)[ctx.last]) },
      { label: "EMA gap", value: `${fmt(gap)}%` },
      { label: "Volume vs 20-bar avg", value: `${fmt(volumeRatio(ctx))}×` },
    ];
  },
  overlays(ctx) {
    return [
      lineSeries(ctx, "EMA 20", COLORS.sky, ctx.ema(20)),
      lineSeries(ctx, "EMA 50", COLORS.violet, ctx.ema(50)),
    ];
  },
};

// ── Swing + Position: MACD + ADX ───────────────────────────────────────────

function adxState(ctx: IndicatorContext) {
  const out = ctx.memo("adx14", () => adx(ctx.highs, ctx.lows, ctx.closes, 14));
  return {
    adx: out.adx[ctx.last],
    plusDI: out.plusDI[ctx.last],
    minusDI: out.minusDI[ctx.last],
  };
}

const macdAdx: ScoringProfile = {
  id: "macd-adx",
  name: "MACD + ADX",
  styles: ["swing", "position"],
  timeframe: "Daily or weekly bars (follows your trading style)",
  description:
    "MACD says which way momentum points; ADX says whether the trend is strong enough to trust it.",
  evidenceTier: "research-backed",
  evidenceNote:
    "MACD/ADX combinations have been tested in academic settings, including out-of-sample Bitcoin studies. As always: tested is not guaranteed, and our point weights are our own.",
  minCandles: 60,
  requires: [],
  components: [
    macdComponent([40, 27, 13]),
    {
      key: "adx",
      name: "Trend strength (ADX 14)",
      indicator: "ADX 14",
      maxPoints: 35,
      tiers: [
        { rule: "ADX 30 or higher (strong trend)", points: 35 },
        { rule: "ADX 25–30", points: 28 },
        { rule: "ADX 20–25", points: 18 },
        { rule: "ADX 15–20 (weak)", points: 8 },
        { rule: "ADX below 15 (no trend)", points: 0 },
      ],
      compute(ctx) {
        const a = adxState(ctx).adx;
        const p = !Number.isFinite(a)
          ? 0
          : a >= 30 ? 35 : a >= 25 ? 28 : a >= 20 ? 18 : a >= 15 ? 8 : 0;
        return {
          points: p,
          hint: Number.isFinite(a)
            ? `ADX ${fmt(a, 1)} — ${a >= 25 ? "a trend worth respecting" : a >= 20 ? "a developing trend" : "little trend to lean on"}`
            : "ADX not yet warmed up",
          tone: p >= 28 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    {
      key: "di",
      name: "Direction (+DI vs −DI)",
      indicator: "+DI vs −DI (14)",
      maxPoints: 25,
      tiers: [
        { rule: "+DI exceeds −DI by more than 5 points", points: 25 },
        { rule: "+DI above −DI", points: 15 },
        { rule: "−DI in control", points: 0 },
      ],
      compute(ctx) {
        const s = adxState(ctx);
        const ok = Number.isFinite(s.plusDI) && Number.isFinite(s.minusDI);
        const p = !ok ? 0 : s.plusDI - s.minusDI > 5 ? 25 : s.plusDI > s.minusDI ? 15 : 0;
        return {
          points: p,
          hint: ok
            ? `+DI ${fmt(s.plusDI, 1)} vs −DI ${fmt(s.minusDI, 1)}`
            : "Direction lines not yet warmed up",
          tone: p === 25 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
  ],
  buyGates: [
    {
      key: "macd-above",
      label: "MACD line above its signal line",
      check(ctx) {
        const m = macdState(ctx);
        return { passed: m.above, detail: `MACD ${fmt(m.line, 4)} vs signal ${fmt(m.sig, 4)}` };
      },
    },
    {
      key: "adx-floor",
      label: "ADX at least 20 (a trend actually exists)",
      check(ctx) {
        const a = adxState(ctx).adx;
        return { passed: Number.isFinite(a) && a >= 20, detail: `ADX is ${fmt(a, 1)}` };
      },
    },
    {
      key: "di-direction",
      label: "+DI above −DI (the trend points up)",
      check(ctx) {
        const s = adxState(ctx);
        return {
          passed:
            Number.isFinite(s.plusDI) && Number.isFinite(s.minusDI) && s.plusDI > s.minusDI,
          detail: `+DI ${fmt(s.plusDI, 1)} vs −DI ${fmt(s.minusDI, 1)}`,
        };
      },
    },
  ],
  avoidRules: [
    {
      key: "strong-downtrend",
      label: "−DI above +DI while ADX is 25 or higher (a strong downtrend)",
      check(ctx) {
        const s = adxState(ctx);
        return {
          fired:
            Number.isFinite(s.adx) && s.adx >= 25 &&
            Number.isFinite(s.minusDI) && Number.isFinite(s.plusDI) &&
            s.minusDI > s.plusDI,
          detail: `ADX ${fmt(s.adx, 1)} with −DI in control`,
        };
      },
    },
  ],
  readings(ctx) {
    const m = macdState(ctx);
    const s = adxState(ctx);
    return [
      { label: "MACD histogram", value: fmt(m.hist, 4) },
      { label: "ADX (14)", value: fmt(s.adx, 1) },
      { label: "+DI", value: fmt(s.plusDI, 1) },
      { label: "−DI", value: fmt(s.minusDI, 1) },
    ];
  },
  overlays(ctx) {
    return [
      lineSeries(ctx, "EMA 12", COLORS.sky, ctx.ema(12)),
      lineSeries(ctx, "EMA 26", COLORS.violet, ctx.ema(26)),
    ];
  },
};

// ── Swing style: RSI(2) Pullback (Connors) ─────────────────────────────────

function rsi2State(ctx: IndicatorContext) {
  return {
    sma200: ctx.memo("sma200", () => sma(ctx.closes, 200))[ctx.last],
    sma5: ctx.memo("sma5", () => sma(ctx.closes, 5))[ctx.last],
    rsi2: ctx.rsi(2)[ctx.last],
    close: ctx.closes[ctx.last],
  };
}

const rsi2Pullback: ScoringProfile = {
  id: "rsi2-pullback",
  name: "RSI(2) Pullback (Connors)",
  styles: ["swing"],
  timeframe: "Daily bars",
  description:
    "Buys short-term weakness inside a long-term uptrend — a high score means a healthy trend on a sharp dip, not broad strength.",
  evidenceTier: "research-backed",
  evidenceNote:
    "A documented short-term mean-reversion approach (Larry Connors). Unlike every other combination here, deeply oversold short-term momentum is a POSITIVE — the signal is “strong trend, brief dip”, not “everything is strong right now”.",
  logicNote:
    "This combination is INVERTED versus the others: a very low RSI(2) inside a long-term uptrend is a positive signal (a dip worth watching), not weakness. Never describe low RSI(2) as bearish here.",
  minCandles: 210,
  requires: [],
  fetch: { limit: 260, yahooRange: { swing: "2y" } },
  components: [
    {
      key: "long-trend",
      name: "Long-term trend (price vs 200-day average)",
      indicator: "Close vs SMA 200",
      maxPoints: 50,
      tiers: [
        { rule: "Price more than 5% above the 200-day average", points: 50 },
        { rule: "0–5% above", points: 38 },
        { rule: "Below the 200-day average", points: 0 },
      ],
      compute(ctx) {
        const s = rsi2State(ctx);
        const diff = pctDiff(s.close, s.sma200);
        const p = !Number.isFinite(diff) ? 0 : diff > 5 ? 50 : diff > 0 ? 38 : 0;
        return {
          points: p,
          hint: Number.isFinite(diff)
            ? `Price is ${fmt(diff)}% ${diff >= 0 ? "above" : "below"} the 200-day average`
            : "200-day average not yet warmed up",
          tone: p >= 38 ? "good" : "bad",
        };
      },
    },
    {
      key: "oversold",
      name: "Short-term dip (RSI 2)",
      indicator: "RSI 2 — deeply oversold is GOOD here",
      maxPoints: 35,
      tiers: [
        { rule: "RSI(2) below 5 (deep dip)", points: 35 },
        { rule: "Below 10", points: 27 },
        { rule: "Below 25", points: 12 },
        { rule: "25 or higher (no meaningful dip)", points: 0 },
      ],
      compute(ctx) {
        const r = rsi2State(ctx).rsi2;
        const p = !Number.isFinite(r) ? 0 : r < 5 ? 35 : r < 10 ? 27 : r < 25 ? 12 : 0;
        return {
          points: p,
          hint: Number.isFinite(r)
            ? p > 0
              ? `RSI(2) at ${fmt(r, 1)} — a short-term dip, which this combination looks for`
              : `RSI(2) at ${fmt(r, 1)} — no meaningful dip to buy`
            : "RSI(2) not yet warmed up",
          tone: p >= 27 ? "good" : p > 0 ? "neutral" : "neutral",
        };
      },
    },
    {
      key: "pullback",
      name: "Pullback position (price vs 5-day average)",
      indicator: "Close vs SMA 5",
      maxPoints: 15,
      tiers: [
        { rule: "Price below its 5-day average (pulled back)", points: 15 },
        { rule: "At or above it", points: 0 },
      ],
      compute(ctx) {
        const s = rsi2State(ctx);
        const below = Number.isFinite(s.sma5) && s.close < s.sma5;
        return {
          points: below ? 15 : 0,
          hint: below
            ? "Price sits below its 5-day average — the pullback is live"
            : "Price is not below its 5-day average",
          tone: below ? "good" : "neutral",
        };
      },
    },
  ],
  buyGates: [
    {
      key: "long-uptrend",
      label: "Price above its 200-day average (the long-term trend is up)",
      check(ctx) {
        const s = rsi2State(ctx);
        return {
          passed: Number.isFinite(s.sma200) && s.close > s.sma200,
          detail: `Price ${fmtPrice(s.close)} vs 200-day average ${fmtPrice(s.sma200)}`,
        };
      },
    },
    {
      key: "deep-dip",
      label: "RSI(2) below 10 (a genuine short-term dip)",
      check(ctx) {
        const r = rsi2State(ctx).rsi2;
        return { passed: Number.isFinite(r) && r < 10, detail: `RSI(2) is ${fmt(r, 1)}` };
      },
    },
  ],
  avoidRules: [
    {
      key: "below-200",
      label: "Price below its 200-day average (no uptrend to buy dips in)",
      check(ctx) {
        const s = rsi2State(ctx);
        return {
          fired: Number.isFinite(s.sma200) && s.close < s.sma200,
          detail: `Price is below the 200-day average`,
        };
      },
    },
  ],
  readings(ctx) {
    const s = rsi2State(ctx);
    return [
      { label: "200-day average", value: fmtPrice(s.sma200) },
      { label: "Price vs 200-day", value: `${fmt(pctDiff(s.close, s.sma200))}%` },
      { label: "5-day average", value: fmtPrice(s.sma5) },
      { label: "RSI (2)", value: fmt(s.rsi2, 1) },
    ];
  },
  overlays(ctx) {
    return [
      lineSeries(ctx, "SMA 200", COLORS.violet, ctx.memo("sma200arr", () => sma(ctx.closes, 200))),
      lineSeries(ctx, "SMA 5", COLORS.sky, ctx.memo("sma5arr", () => sma(ctx.closes, 5))),
    ];
  },
};

// ── Position style: Long-Term Trend Filter (40-week MA) ────────────────────

const trendFilter40w: ScoringProfile = {
  id: "trend-filter-40w",
  name: "Long-Term Trend Filter (40-week MA)",
  styles: ["position"],
  timeframe: "Weekly bars",
  description:
    "The patient investor's question: is price comfortably above its 40-week average, and still gaining ground?",
  evidenceTier: "research-backed",
  evidenceNote:
    "The 200-day (≈40-week) filter has historically cut drawdowns versus buy-and-hold across asset classes in published studies. It trades some upside for downside protection.",
  minCandles: 45,
  requires: [],
  components: [
    {
      key: "trend",
      name: "Price vs 40-week average",
      indicator: "Close vs SMA 40 (weekly)",
      maxPoints: 50,
      tiers: [
        { rule: "More than 6% above the 40-week average", points: 50 },
        { rule: "2–6% above", points: 36 },
        { rule: "0–2% above", points: 18 },
        { rule: "Below it", points: 0 },
      ],
      compute(ctx) {
        const s40 = ctx.memo("sma40", () => sma(ctx.closes, 40))[ctx.last];
        const diff = pctDiff(ctx.closes[ctx.last], s40);
        const p = !Number.isFinite(diff) ? 0 : diff > 6 ? 50 : diff >= 2 ? 36 : diff > 0 ? 18 : 0;
        return {
          points: p,
          hint: Number.isFinite(diff)
            ? `Price is ${fmt(diff)}% ${diff >= 0 ? "above" : "below"} the 40-week average`
            : "40-week average not yet warmed up",
          tone: p >= 36 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    {
      key: "roc",
      name: "12-week momentum (ROC)",
      indicator: "12-week rate of change (%)",
      maxPoints: 30,
      tiers: [
        { rule: "Up more than 10% over 12 weeks", points: 30 },
        { rule: "Up 3–10%", points: 20 },
        { rule: "Up 0–3%", points: 10 },
        { rule: "Flat or down", points: 0 },
      ],
      compute(ctx) {
        const r = ctx.memo("roc12", () => roc(ctx.closes, 12))[ctx.last];
        const p = !Number.isFinite(r) ? 0 : r > 10 ? 30 : r >= 3 ? 20 : r > 0 ? 10 : 0;
        return {
          points: p,
          hint: Number.isFinite(r) ? `${fmt(r, 1)}% over the last 12 weeks` : "Not enough history",
          tone: p >= 20 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    volumeTrendComponent([20, 12, 4]),
  ],
  buyGates: [
    {
      key: "above-40w",
      label: "Price above the 40-week average by more than 2%",
      check(ctx) {
        const s40 = ctx.memo("sma40", () => sma(ctx.closes, 40))[ctx.last];
        const diff = pctDiff(ctx.closes[ctx.last], s40);
        return { passed: Number.isFinite(diff) && diff > 2, detail: `Price is ${fmt(diff)}% vs the average (needs > 2%)` };
      },
    },
    {
      key: "roc-positive",
      label: "12-week momentum positive",
      check(ctx) {
        const r = ctx.memo("roc12", () => roc(ctx.closes, 12))[ctx.last];
        return { passed: Number.isFinite(r) && r > 0, detail: `12-week change is ${fmt(r, 1)}%` };
      },
    },
  ],
  avoidRules: [
    {
      key: "below-40w",
      label: "Price below the 40-week average by more than 3%",
      check(ctx) {
        const s40 = ctx.memo("sma40", () => sma(ctx.closes, 40))[ctx.last];
        const diff = pctDiff(ctx.closes[ctx.last], s40);
        return { fired: Number.isFinite(diff) && diff < -3, detail: `Price is ${fmt(diff)}% vs the average` };
      },
    },
  ],
  readings(ctx) {
    const s40 = ctx.memo("sma40", () => sma(ctx.closes, 40))[ctx.last];
    return [
      { label: "40-week average", value: fmtPrice(s40) },
      { label: "Price vs 40-week", value: `${fmt(pctDiff(ctx.closes[ctx.last], s40))}%` },
      { label: "12-week change", value: `${fmt(ctx.memo("roc12", () => roc(ctx.closes, 12))[ctx.last], 1)}%` },
    ];
  },
  overlays(ctx) {
    return [lineSeries(ctx, "SMA 40w", COLORS.violet, ctx.memo("sma40arr", () => sma(ctx.closes, 40)))];
  },
};

// ── Position style: Golden Cross (10/40-week) + Volume ─────────────────────

function crossState(ctx: IndicatorContext) {
  return {
    sma10: ctx.memo("sma10", () => sma(ctx.closes, 10))[ctx.last],
    sma40: ctx.memo("sma40", () => sma(ctx.closes, 40))[ctx.last],
    close: ctx.closes[ctx.last],
  };
}

const goldenCross: ScoringProfile = {
  id: "golden-cross",
  name: "Golden Cross (10/40-week) + Volume",
  styles: ["position"],
  timeframe: "Weekly bars",
  description:
    "The famous long-term crossover: the 10-week average leading the 40-week, backed by volume.",
  evidenceTier: "research-backed",
  evidenceNote:
    "Moving-average crossover rules have a long research literature. Honest note: they tend to underperform buy-and-hold in strong bull runs — their value is downside protection, not extra upside.",
  minCandles: 45,
  requires: [],
  components: [
    {
      key: "cross",
      name: "10-week vs 40-week average",
      indicator: "SMA 10 vs SMA 40 gap (%, weekly)",
      maxPoints: 55,
      tiers: [
        { rule: "10-week above the 40-week by more than 4%", points: 55 },
        { rule: "Above by 1–4%", points: 40 },
        { rule: "Above by 0–1%", points: 20 },
        { rule: "Below (death-cross state)", points: 0 },
      ],
      compute(ctx) {
        const s = crossState(ctx);
        const gap = pctDiff(s.sma10, s.sma40);
        const p = !Number.isFinite(gap) ? 0 : gap > 4 ? 55 : gap >= 1 ? 40 : gap > 0 ? 20 : 0;
        return {
          points: p,
          hint: Number.isFinite(gap)
            ? `10-week average is ${fmt(gap)}% ${gap >= 0 ? "above" : "below"} the 40-week`
            : "Averages not yet warmed up",
          tone: p >= 40 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    {
      key: "price-position",
      name: "Price vs both averages",
      indicator: "Close vs SMA 10 and SMA 40",
      maxPoints: 25,
      tiers: [
        { rule: "Price above both averages", points: 25 },
        { rule: "Above the 40-week only", points: 12 },
        { rule: "Below both", points: 0 },
      ],
      compute(ctx) {
        const s = crossState(ctx);
        const aboveBoth = s.close > s.sma10 && s.close > s.sma40;
        const above40 = s.close > s.sma40;
        const p = aboveBoth ? 25 : above40 ? 12 : 0;
        return {
          points: p,
          hint: aboveBoth
            ? "Price is above both averages"
            : above40
            ? "Price is above the 40-week average only"
            : "Price is below both averages",
          tone: p === 25 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    volumeTrendComponent([20, 12, 4]),
  ],
  buyGates: [
    {
      key: "cross-up",
      label: "10-week average above the 40-week average",
      check(ctx) {
        const s = crossState(ctx);
        const passed = Number.isFinite(s.sma10) && Number.isFinite(s.sma40) && s.sma10 > s.sma40;
        return { passed, detail: `10w ${fmtPrice(s.sma10)} vs 40w ${fmtPrice(s.sma40)}` };
      },
    },
    {
      key: "above-both",
      label: "Price above both averages",
      check(ctx) {
        const s = crossState(ctx);
        const passed = s.close > s.sma10 && s.close > s.sma40;
        return { passed, detail: passed ? "Price leads both averages" : "Price is not above both averages" };
      },
    },
  ],
  avoidRules: [
    {
      key: "death-cross",
      label: "10-week average below the 40-week (death-cross state)",
      check(ctx) {
        const s = crossState(ctx);
        return {
          fired: Number.isFinite(s.sma10) && Number.isFinite(s.sma40) && s.sma10 < s.sma40,
          detail: "The long-term averages point down",
        };
      },
    },
  ],
  readings(ctx) {
    const s = crossState(ctx);
    return [
      { label: "10-week average", value: fmtPrice(s.sma10) },
      { label: "40-week average", value: fmtPrice(s.sma40) },
      { label: "Gap", value: `${fmt(pctDiff(s.sma10, s.sma40))}%` },
    ];
  },
  overlays(ctx) {
    return [
      lineSeries(ctx, "SMA 10w", COLORS.sky, ctx.memo("sma10arr", () => sma(ctx.closes, 10))),
      lineSeries(ctx, "SMA 40w", COLORS.violet, ctx.memo("sma40arr", () => sma(ctx.closes, 40))),
    ];
  },
};

// ── Position style: MA Distance ────────────────────────────────────────────

function madState(ctx: IndicatorContext) {
  const s4 = ctx.memo("sma4", () => sma(ctx.closes, 4))[ctx.last];
  const s40 = ctx.memo("sma40", () => sma(ctx.closes, 40))[ctx.last];
  return {
    mad: Number.isFinite(s4) && Number.isFinite(s40) && s40 > 0 ? s4 / s40 : NaN,
    s4,
    s40,
  };
}

const maDistance: ScoringProfile = {
  id: "ma-distance",
  name: "MA Distance",
  styles: ["position"],
  timeframe: "Weekly bars",
  description:
    "Measures how far the 4-week average has traveled above the 40-week — distance as a proxy for trend health.",
  evidenceTier: "research-backed",
  evidenceNote:
    "Recent academic work studies the distance between short- and long-term moving averages as a return predictor. The exact ratio cut-offs here are our own launch heuristics.",
  minCandles: 45,
  requires: [],
  components: [
    {
      key: "mad",
      name: "MA distance (4w ÷ 40w)",
      indicator: "SMA 4 ÷ SMA 40 ratio (weekly)",
      maxPoints: 55,
      tiers: [
        { rule: "Ratio above 1.06", points: 55 },
        { rule: "1.02–1.06", points: 40 },
        { rule: "1.00–1.02", points: 20 },
        { rule: "Below 1.00", points: 0 },
      ],
      compute(ctx) {
        const m = madState(ctx).mad;
        const p = !Number.isFinite(m) ? 0 : m > 1.06 ? 55 : m >= 1.02 ? 40 : m >= 1.0 ? 20 : 0;
        return {
          points: p,
          hint: Number.isFinite(m)
            ? `4-week ÷ 40-week ratio is ${m.toFixed(3)}`
            : "Averages not yet warmed up",
          tone: p >= 40 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    {
      key: "rsi",
      name: "Weekly RSI 14",
      indicator: "RSI 14 (weekly)",
      maxPoints: 25,
      tiers: [
        { rule: "RSI 50–70", points: 25 },
        { rule: "RSI 45–50", points: 15 },
        { rule: "RSI above 70 (stretched)", points: 10 },
        { rule: "RSI below 45", points: 0 },
      ],
      compute(ctx) {
        const r = ctx.rsi(14)[ctx.last];
        const p = !Number.isFinite(r) ? 0 : r > 70 ? 10 : r >= 50 ? 25 : r >= 45 ? 15 : 0;
        return {
          points: p,
          hint: Number.isFinite(r) ? `Weekly RSI ${fmt(r, 1)}` : "RSI not yet warmed up",
          tone: p === 25 ? "good" : p > 0 ? "neutral" : "bad",
        };
      },
    },
    volumeTrendComponent([20, 12, 4]),
  ],
  buyGates: [
    {
      key: "mad-gate",
      label: "MA distance ratio above 1.02",
      check(ctx) {
        const m = madState(ctx).mad;
        return { passed: Number.isFinite(m) && m > 1.02, detail: `Ratio is ${Number.isFinite(m) ? m.toFixed(3) : "—"} (needs > 1.02)` };
      },
    },
    {
      key: "rsi-floor",
      label: "Weekly RSI at least 50",
      check(ctx) {
        const r = ctx.rsi(14)[ctx.last];
        return { passed: Number.isFinite(r) && r >= 50, detail: `Weekly RSI is ${fmt(r, 1)}` };
      },
    },
  ],
  avoidRules: [
    {
      key: "mad-low",
      label: "MA distance ratio below 0.97",
      check(ctx) {
        const m = madState(ctx).mad;
        return { fired: Number.isFinite(m) && m < 0.97, detail: `Ratio is ${Number.isFinite(m) ? m.toFixed(3) : "—"}` };
      },
    },
  ],
  readings(ctx) {
    const s = madState(ctx);
    return [
      { label: "4-week average", value: fmtPrice(s.s4) },
      { label: "40-week average", value: fmtPrice(s.s40) },
      { label: "MAD ratio", value: Number.isFinite(s.mad) ? s.mad.toFixed(3) : "—" },
      { label: "Weekly RSI (14)", value: fmt(ctx.rsi(14)[ctx.last], 1) },
    ];
  },
  overlays(ctx) {
    return [
      lineSeries(ctx, "SMA 4w", COLORS.sky, ctx.memo("sma4arr", () => sma(ctx.closes, 4))),
      lineSeries(ctx, "SMA 40w", COLORS.violet, ctx.memo("sma40arr", () => sma(ctx.closes, 40))),
    ];
  },
};

// ── Registry ───────────────────────────────────────────────────────────────

export const PROFILES: ScoringProfile[] = [
  classicProfile,
  emaRsiDay,
  vwapBollinger,
  macdRsi,
  ema2050,
  macdAdx,
  rsi2Pullback,
  trendFilter40w,
  goldenCross,
  maDistance,
];

export const DEFAULT_PROFILE_ID = "classic";

export function profileById(id: string): ScoringProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}

// Profiles offered for a style, Classic always first.
export function profilesForStyle(style: TradingStyle): ScoringProfile[] {
  return PROFILES.filter((p) => p.styles.includes(style));
}
