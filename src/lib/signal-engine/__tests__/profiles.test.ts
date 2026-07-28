// Behavior tests for the 9 combination profiles: point tiers land where the
// spec says, buy gates block a Buy Candidate even at score >= 65, avoid rules
// force "Avoid", and the RSI(2) Pullback inversion is asserted explicitly.
//
// Scenarios include sanity assertions on the underlying indicator values, so
// if a synthetic pattern stops landing in its intended zone the test fails
// loudly instead of silently testing the wrong tier.

import { describe, it, expect } from "vitest";
import { scoreWithProfile, buildContext } from "../engine";
import { profileById, PROFILES, type ProfileScoreResult } from "../profiles";
import { rsi, sma, adx, macd } from "../indicators";
import {
  candlesFromCloses,
  trendCloses,
  zigzagCloses,
  acceleratingCloses,
  withDip,
} from "./synthetic";
import type { TradingStyle } from "@/lib/tradingStyle";

function score(
  profileId: string,
  closes: number[],
  opts: { volumes?: number[]; style?: TradingStyle } = {}
): ProfileScoreResult {
  const profile = profileById(profileId)!;
  const style = opts.style ?? profile.styles[0];
  const outcome = scoreWithProfile(candlesFromCloses(closes, opts.volumes), style, profile);
  expect(outcome.status).toBe("scored");
  if (outcome.status !== "scored") throw new Error("unreachable");
  return outcome.result;
}

function pts(r: ProfileScoreResult, key: string): number {
  const c = r.components.find((c) => c.key === key);
  expect(c, `component ${key} missing`).toBeDefined();
  return c!.points;
}

// ── EMA + RSI Confirmation (day) ───────────────────────────────────────────

describe("ema-rsi-day", () => {
  it("healthy zigzag uptrend: strong trend tier + RSI mid-zone → Buy Candidate", () => {
    const closes = zigzagCloses(60, 100, 0.9, 0.45); // net drift, RSI settles ~66
    const r14 = rsi(closes, 14)[closes.length - 1];
    expect(r14).toBeGreaterThanOrEqual(50); // sanity: intended RSI zone
    expect(r14).toBeLessThan(70);

    const r = score("ema-rsi-day", closes);
    expect(pts(r, "trend")).toBe(45); // gap > 1%
    expect(pts(r, "rsi")).toBe(35); // 50–70 zone
    expect(pts(r, "volume")).toBe(4); // flat volume = lowest tier
    expect(r.score).toBe(84);
    expect(r.signal).toBe("Buy Candidate");
  });

  it("overextended run: RSI cap gate blocks the Buy even at a high score", () => {
    const closes = trendCloses(60, 100, 1.2); // straight gains → RSI 100
    const vol = Array(60).fill(1000);
    vol[59] = 1600; // volume spike lifts the score
    const r = score("ema-rsi-day", closes, { volumes: vol });
    expect(pts(r, "rsi")).toBe(5); // > 75 tier
    expect(r.score).toBeGreaterThanOrEqual(65);
    expect(r.buyGates.find((g) => g.key === "rsi-cap")?.passed).toBe(false);
    expect(r.signal).toBe("Wait"); // blocked, not "Buy Candidate"
  });

  it("downtrend: avoid rule fires", () => {
    const r = score("ema-rsi-day", trendCloses(60, 100, -0.8));
    expect(r.avoidsFired.some((a) => a.key === "downtrend")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });

  it("volume tiers: 1.5×+ → 20, 1×+ → 12, flat → 4", () => {
    const closes = zigzagCloses(60, 100, 0.9, 0.45);
    const withLastVol = (v: number) => {
      const vol = Array(60).fill(1000);
      vol[59] = v;
      return score("ema-rsi-day", closes, { volumes: vol });
    };
    expect(pts(withLastVol(1600), "volume")).toBe(20); // 1600/1030 ≈ 1.55×
    expect(pts(withLastVol(1300), "volume")).toBe(12); // 1300/1015 ≈ 1.28×
    expect(pts(withLastVol(1000), "volume")).toBe(4); // exactly 1.0×
  });
});

// ── VWAP + Bollinger (day) ─────────────────────────────────────────────────

describe("vwap-bollinger", () => {
  it("steady climb: above VWAP with room inside the bands → Buy Candidate", () => {
    const closes = trendCloses(60, 100, 0.5);
    const r = score("vwap-bollinger", closes);
    expect(pts(r, "vwap")).toBe(40); // well above the lagging VWAP
    expect(pts(r, "bollinger")).toBe(30); // above middle, below upper (sanity below)
    const hint = r.components.find((c) => c.key === "bollinger")!.hint;
    expect(hint).toContain("room below the upper band");
    expect(r.signal).toBe("Buy Candidate");
  });

  it("steady slide: below VWAP and middle band → avoid fires", () => {
    const r = score("vwap-bollinger", trendCloses(60, 100, -0.5));
    expect(pts(r, "vwap")).toBe(0);
    expect(pts(r, "bollinger")).toBe(0);
    expect(r.avoidsFired.some((a) => a.key === "below-both")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });
});

// ── MACD + RSI (swing) ─────────────────────────────────────────────────────

describe("macd-rsi", () => {
  it("accelerating run: RSI-zone gate blocks the Buy at score >= 65", () => {
    const closes = acceleratingCloses(60, 100, 0.2, 2.0);
    const { macdLine, signalLine, histogram } = macd(closes);
    const last = closes.length - 1;
    expect(macdLine[last]).toBeGreaterThan(signalLine[last]); // sanity
    expect(histogram[last]).toBeGreaterThan(histogram[last - 1]); // rising
    expect(rsi(closes, 14)[last]).toBeGreaterThan(70); // overheated

    const vol = Array(60).fill(1000);
    vol[59] = 1600;
    const r = score("macd-rsi", closes, { volumes: vol });
    expect(pts(r, "macd")).toBe(45); // line above signal + histogram rising
    expect(pts(r, "rsi")).toBe(10); // > 70 tier
    expect(r.score).toBeGreaterThanOrEqual(65);
    expect(r.buyGates.find((g) => g.key === "rsi-zone")?.passed).toBe(false);
    expect(r.signal).toBe("Wait");
  });

  it("fading downtrend: MACD below signal + falling histogram → Avoid", () => {
    // Rise, then roll over with growing ABSOLUTE drops — that keeps the MACD
    // line accelerating away below its signal, so the histogram is falling.
    const closes = trendCloses(40, 100, 1.0);
    let price = closes[closes.length - 1];
    for (let i = 0; i < 20; i++) {
      price -= (i + 1) * 0.5;
      closes.push(price);
    }
    const { macdLine, signalLine, histogram } = macd(closes);
    const last = closes.length - 1;
    expect(macdLine[last]).toBeLessThan(signalLine[last]); // sanity
    expect(histogram[last]).toBeLessThan(histogram[last - 1]); // falling

    const r = score("macd-rsi", closes);
    expect(pts(r, "macd")).toBe(0);
    expect(r.avoidsFired.some((a) => a.key === "macd-fading")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });

  it("mid-zone RSI earns the full 35", () => {
    const closes = zigzagCloses(60, 100, 0.7, 0.5); // gentler drift → RSI in 45–65
    const r14 = rsi(closes, 14)[closes.length - 1];
    expect(r14).toBeGreaterThanOrEqual(45);
    expect(r14).toBeLessThan(65);
    const r = score("macd-rsi", closes);
    expect(pts(r, "rsi")).toBe(35);
  });
});

// ── EMA 20/50 Crossover (swing) ────────────────────────────────────────────

describe("ema-2050", () => {
  it("established uptrend: full trend tier + price above both → Buy Candidate", () => {
    const closes = zigzagCloses(80, 100, 0.9, 0.45);
    const r = score("ema-2050", closes);
    expect(pts(r, "gap")).toBe(55); // > 3%
    expect(pts(r, "price-position")).toBe(25);
    expect(r.signal).toBe("Buy Candidate");
  });

  it("downtrend beyond −2%: avoid fires", () => {
    const r = score("ema-2050", trendCloses(80, 100, -0.6));
    expect(r.avoidsFired.some((a) => a.key === "downtrend")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });
});

// ── MACD + ADX (swing + position) ──────────────────────────────────────────

describe("macd-adx", () => {
  it("strong accelerating trend: full marks on all three components → Buy", () => {
    const closes = acceleratingCloses(80, 100, 0.2, 1.5);
    const candles = candlesFromCloses(closes);
    const a = adx(
      candles.map((c) => c.high),
      candles.map((c) => c.low),
      closes,
      14
    );
    expect(a.adx[79]).toBeGreaterThanOrEqual(30); // sanity: strong trend
    expect(a.plusDI[79] - a.minusDI[79]).toBeGreaterThan(5);

    const r = score("macd-adx", closes);
    expect(pts(r, "macd")).toBe(40);
    expect(pts(r, "adx")).toBe(35);
    expect(pts(r, "di")).toBe(25);
    expect(r.score).toBe(100);
    expect(r.signal).toBe("Buy Candidate");
  });

  it("strong downtrend: −DI in control with high ADX → Avoid", () => {
    const r = score("macd-adx", trendCloses(80, 100, -1.0));
    expect(r.avoidsFired.some((a) => a.key === "strong-downtrend")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });

  it("is offered in both swing and position styles", () => {
    expect(profileById("macd-adx")!.styles).toEqual(["swing", "position"]);
  });
});

// ── RSI(2) Pullback — the INVERTED profile ─────────────────────────────────

describe("rsi2-pullback (inverted logic)", () => {
  it("sharp dip inside a long uptrend scores HIGH → Buy Candidate", () => {
    const closes = withDip(trendCloses(216, 100, 0.3), 4, 2); // 4 bars of −2%
    const last = closes.length - 1;
    expect(rsi(closes, 2)[last]).toBeLessThan(5); // sanity: deeply oversold
    expect(closes[last]).toBeGreaterThan(sma(closes, 200)[last]); // still in uptrend

    const r = score("rsi2-pullback", closes);
    expect(pts(r, "long-trend")).toBe(50);
    expect(pts(r, "oversold")).toBe(35); // low RSI(2) is GOOD here
    expect(pts(r, "pullback")).toBe(15);
    expect(r.score).toBe(100);
    expect(r.signal).toBe("Buy Candidate");
  });

  it("pure strength (no dip) scores LOW — the inversion, asserted", () => {
    const closes = trendCloses(220, 100, 0.3); // relentless gains, RSI(2) = 100
    const r = score("rsi2-pullback", closes);
    expect(pts(r, "oversold")).toBe(0); // high RSI(2) earns nothing
    expect(pts(r, "pullback")).toBe(0);
    expect(r.score).toBe(50); // only the long-term trend filter scores
    expect(r.buyGates.find((g) => g.key === "deep-dip")?.passed).toBe(false);
    expect(r.signal).toBe("Wait");
  });

  it("below the 200-day average: no dips worth buying → Avoid", () => {
    const r = score("rsi2-pullback", trendCloses(220, 100, -0.3));
    expect(r.avoidsFired.some((a) => a.key === "below-200")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });

  it("declares the inversion for the AI and the UI", () => {
    expect(profileById("rsi2-pullback")!.logicNote).toContain("INVERTED");
  });
});

// ── Long-Term Trend Filter (position) ──────────────────────────────────────

describe("trend-filter-40w", () => {
  it("healthy long trend: full trend + momentum tiers → Buy Candidate", () => {
    const closes = trendCloses(60, 100, 1.0);
    const r = score("trend-filter-40w", closes);
    expect(pts(r, "trend")).toBe(50); // > 6% above the 40-week average
    expect(pts(r, "roc")).toBe(30); // 12-week ROC > 10%
    expect(pts(r, "volume")).toBe(12); // steady volume
    expect(r.signal).toBe("Buy Candidate");
  });

  it("well below the 40-week average → Avoid", () => {
    const r = score("trend-filter-40w", trendCloses(60, 100, -1.0));
    expect(r.avoidsFired.some((a) => a.key === "below-40w")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });
});

// ── Golden Cross (position) ────────────────────────────────────────────────

describe("golden-cross", () => {
  it("10-week leading 40-week with price on top → Buy Candidate", () => {
    const closes = trendCloses(60, 100, 1.0);
    const last = closes.length - 1;
    expect(sma(closes, 10)[last]).toBeGreaterThan(sma(closes, 40)[last]); // sanity
    const r = score("golden-cross", closes);
    expect(pts(r, "cross")).toBe(55); // gap > 4%
    expect(pts(r, "price-position")).toBe(25);
    expect(r.signal).toBe("Buy Candidate");
  });

  it("death-cross state → Avoid", () => {
    const r = score("golden-cross", trendCloses(60, 100, -1.0));
    expect(r.avoidsFired.some((a) => a.key === "death-cross")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });
});

// ── MA Distance (position) ─────────────────────────────────────────────────

describe("ma-distance", () => {
  it("stretched healthy trend: full MAD tier, RSI stretched tier → Buy", () => {
    const closes = trendCloses(60, 100, 1.0);
    const r = score("ma-distance", closes);
    expect(pts(r, "mad")).toBe(55); // ratio > 1.06
    expect(pts(r, "rsi")).toBe(10); // weekly RSI 100 = stretched tier
    expect(r.score).toBe(77);
    expect(r.signal).toBe("Buy Candidate"); // gates: MAD > 1.02 ✓, RSI >= 50 ✓
  });

  it("ratio below 0.97 → Avoid", () => {
    const r = score("ma-distance", trendCloses(60, 100, -1.0));
    expect(r.avoidsFired.some((a) => a.key === "mad-low")).toBe(true);
    expect(r.signal).toBe("Avoid");
  });
});

// ── Universal rules across ALL profiles ────────────────────────────────────

describe("universal rules", () => {
  const longUptrend = trendCloses(300, 100, 0.5);

  for (const profile of PROFILES) {
    it(`${profile.id}: one candle short of minCandles → unavailable, never a score`, () => {
      const candles = candlesFromCloses(longUptrend.slice(0, profile.minCandles - 1));
      const outcome = scoreWithProfile(candles, profile.styles[0], profile);
      expect(outcome.status).toBe("unavailable");
    });
  }

  it("the stop-loss hard gate fails when no support level is computable", () => {
    // If the recent lows carry no usable level (all zero), there is no stop
    // to place — the universal gate must report not-passed and block a Buy.
    const closes = trendCloses(80, 100, 1.0);
    const candles = candlesFromCloses(closes).map((c, i) =>
      i >= 60 ? { ...c, low: 0 } : c
    );
    const outcome = scoreWithProfile(candles, "swing", profileById("ema-2050")!);
    expect(outcome.status).toBe("scored");
    if (outcome.status !== "scored") return;
    expect(outcome.result.buyGates.find((g) => g.key === "stop")?.passed).toBe(false);
    expect(outcome.result.signal).not.toBe("Buy Candidate");
  });

  it("every profile scores 0–100 and returns a verdict on ordinary data", () => {
    for (const profile of PROFILES) {
      const closes =
        profile.minCandles > 100 ? trendCloses(260, 100, 0.3) : zigzagCloses(80, 100, 0.6, 0.4);
      const outcome = scoreWithProfile(
        candlesFromCloses(closes),
        profile.styles[0],
        profile
      );
      expect(outcome.status).toBe("scored");
      if (outcome.status !== "scored") continue;
      expect(outcome.result.score).toBeGreaterThanOrEqual(0);
      expect(outcome.result.score).toBeLessThanOrEqual(100);
      expect(["Buy Candidate", "Wait", "Avoid"]).toContain(outcome.result.signal);
      // Explanation and readings exist for the UI on every path.
      expect(outcome.result.explanation.length).toBeGreaterThan(0);
      expect(outcome.result.readings.length).toBeGreaterThan(0);
    }
  });
});
