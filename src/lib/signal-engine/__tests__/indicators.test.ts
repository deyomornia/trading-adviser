// Reference tests for the indicator math. Fixtures are small enough to verify
// by hand or in a spreadsheet — expected values are derived in the comments.

import { describe, it, expect } from "vitest";
import { sma, rsi, adx, rollingVwap, bollinger, roc } from "../indicators";

describe("sma", () => {
  it("computes the plain average over the window", () => {
    // [1,2,3,4,5] period 3 → windows: (1+2+3)/3=2, (2+3+4)/3=3, (3+4+5)/3=4
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([NaN, NaN, 2, 3, 4]);
  });

  it("is NaN before the window fills and keeps input length", () => {
    const out = sma([10, 20], 5);
    expect(out).toHaveLength(2);
    expect(out.every((v) => Number.isNaN(v))).toBe(true);
  });

  it("of a constant series is the constant", () => {
    const out = sma(Array(10).fill(7), 4);
    expect(out.slice(3).every((v) => v === 7)).toBe(true);
  });
});

describe("rsi(2) — the short period the RSI(2) Pullback profile uses", () => {
  it("matches hand-computed Wilder values", () => {
    // prices:  10, 11, 10.5, 10.6, 10.2, 10.1
    // deltas:      +1, −0.5, +0.1, −0.4, −0.1
    // seed (i=2): avgGain=(1+0)/2=0.5  avgLoss=(0+0.5)/2=0.25
    //   RSI = 100 − 100/(1+0.5/0.25)          = 66.667
    // i=3: avgGain=(0.5+0.1)/2=0.3  avgLoss=0.25/2=0.125
    //   RSI = 100 − 100/(1+2.4)               = 70.588
    // i=4: avgGain=0.3/2=0.15  avgLoss=(0.125+0.4)/2=0.2625
    //   RSI = 100 − 100/(1+0.15/0.2625)       = 36.364
    // i=5: avgGain=0.15/2=0.075  avgLoss=(0.2625+0.1)/2=0.18125
    //   RSI = 100 − 100/(1+0.075/0.18125)     = 29.268
    const out = rsi([10, 11, 10.5, 10.6, 10.2, 10.1], 2);
    expect(out[0]).toBeNaN();
    expect(out[1]).toBeNaN();
    expect(out[2]).toBeCloseTo(66.667, 2);
    expect(out[3]).toBeCloseTo(70.588, 2);
    expect(out[4]).toBeCloseTo(36.364, 2);
    expect(out[5]).toBeCloseTo(29.268, 2);
  });

  it("pins to 100 on straight gains and near 0 on straight losses", () => {
    const up = rsi([1, 2, 3, 4, 5, 6], 2);
    expect(up[5]).toBe(100);
    const down = rsi([6, 5, 4, 3, 2, 1], 2);
    expect(down[5]).toBe(0);
  });
});

describe("roc", () => {
  it("computes percent change vs <period> bars ago", () => {
    // 100→110 = +10%, 110→121 = +10%; over 2 bars: 100→121 = +21%
    expect(roc([100, 110, 121], 1)[1]).toBeCloseTo(10, 10);
    expect(roc([100, 110, 121], 1)[2]).toBeCloseTo(10, 10);
    expect(roc([100, 110, 121], 2)[2]).toBeCloseTo(21, 10);
    expect(roc([100, 110, 121], 2)[1]).toBeNaN();
  });

  it("is NaN when the reference value is zero (no fake infinities)", () => {
    expect(roc([0, 10], 1)[1]).toBeNaN();
  });
});

describe("bollinger", () => {
  it("matches the classic population-σ example", () => {
    // [2,4,4,4,5,5,7,9] period 8: mean = 40/8 = 5,
    // squared devs = 9+1+1+1+0+0+4+16 = 32 → population σ = √(32/8) = 2
    // upper = 5 + 2×2 = 9, lower = 5 − 2×2 = 1
    const { upper, middle, lower } = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    expect(middle[7]).toBeCloseTo(5, 10);
    expect(upper[7]).toBeCloseTo(9, 10);
    expect(lower[7]).toBeCloseTo(1, 10);
  });

  it("orders upper > middle > lower when prices vary, all equal when flat", () => {
    const varying = bollinger([1, 2, 3, 4, 5, 6], 3);
    for (let i = 2; i < 6; i++) {
      expect(varying.upper[i]).toBeGreaterThan(varying.middle[i]);
      expect(varying.middle[i]).toBeGreaterThan(varying.lower[i]);
    }
    const flat = bollinger(Array(5).fill(10), 3);
    expect(flat.upper[4]).toBe(10);
    expect(flat.middle[4]).toBe(10);
    expect(flat.lower[4]).toBe(10);
  });
});

describe("rollingVwap", () => {
  const highs = [12, 16, 22, 14];
  const lows = [8, 10, 14, 10];
  const closes = [10, 13, 16, 12];
  const volumes = [100, 200, 300, 400];
  // typical prices: (12+8+10)/3=10, (16+10+13)/3=13, (22+14+16)/3=17.333, 12

  it("matches the hand-computed volume-weighted value", () => {
    // window 3 at i=2: (10×100 + 13×200 + 17.333×300) / 600
    //                = (1000 + 2600 + 5200) / 600 = 8800/600 = 14.6667
    const out = rollingVwap(highs, lows, closes, volumes, 3);
    expect(out[0]).toBeNaN();
    expect(out[1]).toBeNaN();
    expect(out[2]).toBeCloseTo(14.6667, 3);
    // window slides: i=3 uses bars 1..3 → (2600+5200+12×400)/900 = 12600/900 = 14
    expect(out[3]).toBeCloseTo(14, 10);
  });

  it("stays within the window's low..high range", () => {
    const out = rollingVwap(highs, lows, closes, volumes, 3);
    expect(out[2]).toBeGreaterThanOrEqual(Math.min(...lows.slice(0, 3)));
    expect(out[2]).toBeLessThanOrEqual(Math.max(...highs.slice(0, 3)));
  });

  it("is NaN when the window has zero volume — never a fake price", () => {
    const out = rollingVwap(highs, lows, closes, [0, 0, 0, 0], 3);
    expect(out[2]).toBeNaN();
    expect(out[3]).toBeNaN();
  });
});

describe("adx", () => {
  const PERIOD = 14;

  // A perfectly steady uptrend is analytically exact: every bar moves up by 1
  // with a constant 1-point range. +DM = 1, −DM = 0, TR = 1.5 every bar, so
  // +DI = 100×(Σ+DM/ΣTR) = 100/1.5 = 66.67 always, −DI = 0, DX = 100 → ADX = 100.
  function steadyUptrend(n: number) {
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    for (let i = 0; i < n; i++) {
      highs.push(i + 1);
      lows.push(i);
      closes.push(i + 0.5);
    }
    return { highs, lows, closes };
  }

  it("steady uptrend: +DI = 66.67, −DI = 0, ADX = 100 (exact)", () => {
    const { highs, lows, closes } = steadyUptrend(40);
    const out = adx(highs, lows, closes, PERIOD);
    const i = 39;
    expect(out.plusDI[i]).toBeCloseTo(66.667, 2);
    expect(out.minusDI[i]).toBeCloseTo(0, 10);
    expect(out.adx[i]).toBeCloseTo(100, 5);
  });

  it("steady downtrend mirrors: −DI = 66.67, +DI = 0, ADX = 100", () => {
    const { highs, lows, closes } = steadyUptrend(40);
    const rev = {
      highs: highs.map((v) => 1000 - v),
      lows: lows.map((v) => 1000 - v),
      closes: closes.map((v) => 1000 - v),
    };
    // note: mirroring swaps highs/lows, so re-order per bar
    const h = rev.lows; // 1000 − low is the larger value
    const l = rev.highs;
    const out = adx(h, l, rev.closes, PERIOD);
    const i = 39;
    expect(out.minusDI[i]).toBeCloseTo(66.667, 2);
    expect(out.plusDI[i]).toBeCloseTo(0, 10);
    expect(out.adx[i]).toBeCloseTo(100, 5);
  });

  it("warm-up: DI starts at index <period>, ADX at index <2×period − 1>", () => {
    const { highs, lows, closes } = steadyUptrend(40);
    const out = adx(highs, lows, closes, PERIOD);
    expect(out.plusDI[PERIOD - 1]).toBeNaN();
    expect(out.plusDI[PERIOD]).not.toBeNaN();
    expect(out.adx[2 * PERIOD - 2]).toBeNaN();
    expect(out.adx[2 * PERIOD - 1]).not.toBeNaN();
  });

  it("directionless chop keeps ADX low", () => {
    // Price ping-pongs in a fixed band — no directional movement to smooth.
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    for (let i = 0; i < 60; i++) {
      const up = i % 2 === 0;
      highs.push(up ? 102 : 101);
      lows.push(up ? 100 : 99);
      closes.push(up ? 101.5 : 99.5);
    }
    const out = adx(highs, lows, closes, PERIOD);
    expect(out.adx[59]).toBeLessThan(25);
  });

  it("trend reversal: ADX falls after the trend breaks, DIs cross", () => {
    const up = steadyUptrend(40);
    // 40 rising bars, then 40 falling bars of the same size.
    const highs = [...up.highs];
    const lows = [...up.lows];
    const closes = [...up.closes];
    for (let i = 0; i < 40; i++) {
      const base = 40 - i;
      highs.push(base);
      lows.push(base - 1);
      closes.push(base - 0.5);
    }
    const out = adx(highs, lows, closes, PERIOD);
    expect(out.adx[75]).toBeLessThan(out.adx[39]); // strength dipped on reversal
    expect(out.minusDI[75]).toBeGreaterThan(out.plusDI[75]); // direction flipped
    // Bounds hold everywhere the values exist.
    for (let i = 0; i < 80; i++) {
      if (!Number.isNaN(out.adx[i])) {
        expect(out.adx[i]).toBeGreaterThanOrEqual(0);
        expect(out.adx[i]).toBeLessThanOrEqual(100);
      }
    }
  });

  it("keeps input length on all three outputs", () => {
    const { highs, lows, closes } = steadyUptrend(20);
    const out = adx(highs, lows, closes, PERIOD);
    expect(out.adx).toHaveLength(20);
    expect(out.plusDI).toHaveLength(20);
    expect(out.minusDI).toHaveLength(20);
  });
});
