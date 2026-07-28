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

// ── Registry ───────────────────────────────────────────────────────────────

export const PROFILES: ScoringProfile[] = [classicProfile];

export const DEFAULT_PROFILE_ID = "classic";

export function profileById(id: string): ScoringProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}

// Profiles offered for a style, Classic always first.
export function profilesForStyle(style: TradingStyle): ScoringProfile[] {
  return PROFILES.filter((p) => p.styles.includes(style));
}
