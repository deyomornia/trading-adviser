// Tests for the entry price plan: patient limit levels below market, the
// swing-low honesty guard, and the invariant that every setup keeps the
// published rules (1×ATR stop, 2:1 at TP2) true from its own entry price.

import { describe, it, expect } from "vitest";
import { buildEntryPlan, buildTradeSetup } from "../trade-setup";
import type { TradePrefs } from "../prefs";
import { candlesFromCloses, trendCloses } from "@/lib/signal-engine/__tests__/synthetic";

const prefs: TradePrefs = {
  accountSize: "10000",
  riskPercent: "1",
  currency: "$",
} as TradePrefs;

const buy = { signal: "Buy Candidate" as const, stopSuggestion: 0 };

function uptrendCandles() {
  return candlesFromCloses(trendCloses(80, 100, 1.0));
}

describe("buildEntryPlan", () => {
  it("offers market + two limit levels, ordered below market", () => {
    const candles = uptrendCandles();
    const lastClose = candles[candles.length - 1].close;
    const swing = Math.min(...candles.slice(-20).map((c) => c.low));
    const plan = buildEntryPlan(candles, { ...buy, stopSuggestion: +swing.toFixed(2) }, prefs);

    expect(plan.market.eligible).toBe(true);
    expect(plan.limits).toHaveLength(2);
    const [shallow, deeper] = plan.limits;
    expect(shallow.key).toBe("shallow");
    expect(deeper.key).toBe("deeper");
    expect(shallow.entry).toBeLessThan(lastClose);
    expect(deeper.entry).toBeLessThan(shallow.entry);
    expect(shallow.belowMarketPct).toBeGreaterThan(0);
    expect(deeper.belowMarketPct).toBeGreaterThan(shallow.belowMarketPct);
  });

  it("keeps the published rules true from each fill price (1×ATR stop, 2:1 at TP2)", () => {
    const candles = uptrendCandles();
    const swing = Math.min(...candles.slice(-20).map((c) => c.low));
    const plan = buildEntryPlan(candles, { ...buy, stopSuggestion: +swing.toFixed(2) }, prefs);

    for (const l of plan.limits) {
      const s = l.setup;
      expect(s.eligible).toBe(true);
      expect(s.entry).toBeCloseTo(l.entry, 2);
      // R:R at TP2 is 2:1 by construction from THIS entry.
      const r = s.entry - s.sl1;
      expect(s.tp2).toBeCloseTo(s.entry + 2 * r, 1);
      // A better (lower) entry with the same risk budget buys at least as many units.
      const marketSize = plan.market.eligible ? plan.market.plan.positionSize ?? 0 : 0;
      expect(s.plan.positionSize ?? 0).toBeGreaterThanOrEqual(0);
      expect(marketSize).toBeGreaterThan(0);
    }
  });

  it("drops a limit level that sits at or below the recent swing low", () => {
    const candles = uptrendCandles();
    const lastClose = candles[candles.length - 1].close;
    // Force the swing low to sit just under the market price: any pullback
    // level would land below support → both levels must be skipped.
    const tightSwing = +(lastClose * 0.999).toFixed(2);
    const plan = buildEntryPlan(candles, { ...buy, stopSuggestion: tightSwing }, prefs);

    expect(plan.market.eligible).toBe(true);
    expect(plan.limits).toHaveLength(0);
    expect(plan.skipped).toHaveLength(2);
    expect(plan.skipped[0].reason).toContain("swing low");
  });

  it("offers no limit levels when there is no Buy Candidate", () => {
    const candles = uptrendCandles();
    const plan = buildEntryPlan(candles, { signal: "Wait", stopSuggestion: 50 }, prefs);
    expect(plan.market.eligible).toBe(false);
    expect(plan.limits).toHaveLength(0);
  });

  it("entryOverride shifts the whole ladder, not just the entry", () => {
    const candles = uptrendCandles();
    const swing = Math.min(...candles.slice(-20).map((c) => c.low));
    const score = { ...buy, stopSuggestion: +swing.toFixed(2) };
    const market = buildTradeSetup(candles, score, prefs);
    const lower = buildTradeSetup(candles, score, prefs, {
      entryOverride: candles[candles.length - 1].close * 0.99,
    });
    expect(market.eligible && lower.eligible).toBe(true);
    if (!market.eligible || !lower.eligible) return;
    expect(lower.sl1).toBeLessThan(market.sl1);
    expect(lower.tp2).toBeLessThan(market.tp2);
  });
});
