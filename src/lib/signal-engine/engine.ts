// The profile-driven scoring engine. Profiles (src/lib/signal-engine/profiles.ts)
// say WHAT to measure and how many points each part is worth; this engine owns
// the universal rules no profile may bypass:
//
//   1. Never score with missing/insufficient data (availability guard first).
//   2. Stop-loss hard gate: a Buy Candidate needs a valid stop level
//      (lowest low of the last 20 candles, below the current price).
//   3. Verdict bands: score >= 65 AND every gate passes -> "Buy Candidate";
//      score < 40 OR any avoid rule fires -> "Avoid"; otherwise "Wait".
//   4. Long-only. No shorts, no leverage.

import type { Candle } from "@/data/sampleCandles";
import type { TradingStyle } from "@/lib/tradingStyle";
import { ema, rsi, macd, atr } from "./indicators";
import type { SignalVerdict, ExplanationPoint } from "./scorer";
import type {
  ScoringProfile,
  IndicatorContext,
  ProfileScoreResult,
  ComponentResult,
  GateResult,
} from "./profiles";
import {
  checkAvailability,
  type AvailabilityMeta,
  type AvailabilityCode,
} from "./availability";

export type ScoreOutcome =
  | { status: "scored"; result: ProfileScoreResult }
  | { status: "unavailable"; code: AvailabilityCode; reason: string };

// Build the memoized indicator context a profile's components/gates read from.
export function buildContext(candles: Candle[], style: TradingStyle): IndicatorContext {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);
  const cache = new Map<string, unknown>();

  function memo<T>(key: string, fn: () => T): T {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key) as T;
  }

  return {
    candles,
    closes,
    highs,
    lows,
    volumes,
    last: candles.length - 1,
    style,
    ema: (period) => memo(`ema:${period}`, () => ema(closes, period)),
    rsi: (period) => memo(`rsi:${period}`, () => rsi(closes, period)),
    macd: () => memo("macd", () => macd(closes)),
    atr: (period) => memo(`atr:${period}`, () => atr(highs, lows, closes, period)),
    memo,
  };
}

// Engine-owned stop suggestion: lowest low of the last 20 candles (recent
// support). Identical to the original scorer's rule.
function stopFromCandles(lows: number[]): number {
  const recentLows = lows.slice(-20).filter((l) => Number.isFinite(l) && l > 0);
  return recentLows.length ? +Math.min(...recentLows).toFixed(2) : 0;
}

const VERDICT_TEXT: Record<SignalVerdict, (stop: number) => ExplanationPoint> = {
  "Buy Candidate": (stop) => ({
    label: "What this suggests",
    tone: "good",
    text: `The signals line up. If you consider a trade, a stop-loss around ${stop} (recent support) keeps risk defined. This is not advice — confirm with your own plan on the Trade Plan page.`,
  }),
  Wait: () => ({
    label: "What this suggests",
    tone: "neutral",
    text: "The picture is mixed. It may be better to wait for a clearer trend or stronger confirmation before acting.",
  }),
  Avoid: () => ({
    label: "What this suggests",
    tone: "bad",
    text: "The signals are weak for this combination. It may be best to avoid this one for now.",
  }),
};

export function scoreWithProfile(
  candles: Candle[] | null,
  style: TradingStyle,
  profile: ScoringProfile,
  meta: AvailabilityMeta = {}
): ScoreOutcome {
  // Universal rule 1: honest data first.
  const avail = checkAvailability(profile, candles, style, meta);
  if (!avail.ok) return { status: "unavailable", code: avail.code, reason: avail.reason };
  const ok = candles as Candle[];

  // Classic's escape hatch: delegate to the original scorer, bit for bit.
  if (profile.run) {
    return { status: "scored", result: profile.run(ok, style) };
  }

  const ctx = buildContext(ok, style);

  // Components (each clamped to its own maximum; total clamped to 100).
  const components: ComponentResult[] = profile.components.map((c) => {
    const out = c.compute(ctx);
    const points = Math.max(0, Math.min(c.maxPoints, Math.round(out.points)));
    return { key: c.key, name: c.name, points, maxPoints: c.maxPoints, hint: out.hint, tone: out.tone };
  });
  const score = Math.min(100, components.reduce((sum, c) => sum + c.points, 0));

  // Universal rule 2: the stop-loss hard gate, prepended to the profile's gates.
  const lastClose = ctx.closes[ctx.last];
  const stopSuggestion = stopFromCandles(ctx.lows);
  const validStop = stopSuggestion > 0 && stopSuggestion < lastClose;
  const buyGates: GateResult[] = [
    {
      key: "stop",
      label: "A valid stop-loss level below the current price",
      passed: validStop,
      detail: validStop
        ? `Recent support at ${stopSuggestion}`
        : "No clear recent support below the price",
    },
    ...profile.buyGates.map((g) => {
      const r = g.check(ctx);
      return { key: g.key, label: g.label, passed: r.passed, detail: r.detail };
    }),
  ];

  const avoidsFired: GateResult[] = profile.avoidRules
    .map((rule) => ({ rule, r: rule.check(ctx) }))
    .filter(({ r }) => r.fired)
    .map(({ rule, r }) => ({ key: rule.key, label: rule.label, passed: false, detail: r.detail }));

  // Universal rule 3: the verdict bands.
  let signal: SignalVerdict;
  if (score >= 65 && buyGates.every((g) => g.passed)) {
    signal = "Buy Candidate";
  } else if (score < 40 || avoidsFired.length > 0) {
    signal = "Avoid";
  } else {
    signal = "Wait";
  }

  // Plain-English reasons: one line per component + what the verdict means.
  const explanation: ExplanationPoint[] = [
    ...components.map((c) => ({ label: c.name, text: c.hint, tone: c.tone })),
    VERDICT_TEXT[signal](stopSuggestion),
  ];

  return {
    status: "scored",
    result: {
      profileId: profile.id,
      profileName: profile.name,
      score,
      signal,
      stopSuggestion,
      lastClose: +lastClose.toFixed(2),
      components,
      buyGates,
      avoidsFired,
      readings: profile.readings(ctx),
      explanation,
    },
  };
}
