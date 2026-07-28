// The Classic identity guard: the profile-wrapped Classic engine must produce
// EXACTLY the same numbers as the original scorer, for every sample asset and
// every trading style. If this test ever fails, a refactor changed scoring
// behavior — which breaks the "zero score changes for existing users" promise.

import { describe, it, expect } from "vitest";
import { sampleCandles } from "@/data/sampleCandles";
import { scoreAsset, MIN_CANDLES } from "../scorer";
import { scoreWithProfile } from "../engine";
import { classicProfile, PROFILES } from "../profiles";
import type { TradingStyle } from "@/lib/tradingStyle";

const STYLES: TradingStyle[] = ["day", "swing", "position"];
const SYMBOLS = Object.keys(sampleCandles);

describe("Classic profile identity vs original scorer", () => {
  it("has sample data to test against", () => {
    expect(SYMBOLS.length).toBeGreaterThan(0);
  });

  for (const symbol of SYMBOLS) {
    for (const style of STYLES) {
      it(`${symbol} × ${style}: identical score, verdict, stop, breakdown`, () => {
        const candles = sampleCandles[symbol];
        if (candles.length < MIN_CANDLES) return; // scorer would never run

        const before = scoreAsset(candles, style);
        const outcome = scoreWithProfile(candles, style, classicProfile);

        expect(outcome.status).toBe("scored");
        if (outcome.status !== "scored") return;
        const after = outcome.result;

        expect(after.score).toBe(before.score);
        expect(after.signal).toBe(before.signal);
        expect(after.stopSuggestion).toBe(before.stopSuggestion);
        expect(after.lastClose).toBe(before.indicators.lastClose);

        // Dynamic breakdown must carry the exact same points as the old shape.
        const byKey = Object.fromEntries(after.components.map((c) => [c.key, c]));
        expect(byKey.trend.points).toBe(before.breakdown.trend);
        expect(byKey.trend.maxPoints).toBe(35);
        expect(byKey.momentum.points).toBe(before.breakdown.momentum);
        expect(byKey.momentum.maxPoints).toBe(35);
        expect(byKey.macd.points).toBe(before.breakdown.macdScore);
        expect(byKey.macd.maxPoints).toBe(30);
      });
    }
  }

  it("refuses to score with fewer candles than the profile minimum", () => {
    const candles = sampleCandles[SYMBOLS[0]].slice(0, MIN_CANDLES - 1);
    const outcome = scoreWithProfile(candles, "swing", classicProfile);
    expect(outcome.status).toBe("unavailable");
  });
});

describe("Registry shape rules", () => {
  for (const profile of PROFILES) {
    it(`${profile.id}: component maxPoints sum to exactly 100`, () => {
      const total = profile.components.reduce((sum, c) => sum + c.maxPoints, 0);
      expect(total).toBe(100);
    });

    it(`${profile.id}: offered in at least one style`, () => {
      expect(profile.styles.length).toBeGreaterThan(0);
    });
  }
});
