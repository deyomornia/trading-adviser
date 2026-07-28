// Live before/after identity check — runs ONLY when LIVE_CHECK=1 is set,
// because it hits real provider APIs (Binance / Twelve Data / Yahoo).
//
//   LIVE_CHECK=1 npm test
//
// For each asset × trading style it fetches candles ONCE, then scores the
// same array with the original scorer ("before") and the profile engine
// ("after"). Any difference is a real bug — market movement can't explain it,
// because both engines see identical data.

import { describe, it, expect } from "vitest";
import { liveProvider } from "@/lib/data-providers/live";
import { scoreAsset, MIN_CANDLES } from "../scorer";
import { scoreWithProfile } from "../engine";
import { classicProfile } from "../profiles";
import type { TradingStyle } from "@/lib/tradingStyle";

const STYLES: TradingStyle[] = ["day", "swing", "position"];
// One asset per live source: Binance ×2, Twelve Data (XAU), Yahoo (WTI = CL=F).
const SYMBOLS = ["BTC", "ETH", "XAU", "WTI"];

describe.runIf(process.env.LIVE_CHECK === "1")("Live same-candles identity", () => {
  for (const symbol of SYMBOLS) {
    for (const style of STYLES) {
      it(`${symbol} × ${style}`, async () => {
        const candles = await liveProvider.getCandles(symbol, style);
        expect(candles, `no candles for ${symbol}`).toBeTruthy();
        if (!candles || candles.length < MIN_CANDLES) return;

        const before = scoreAsset(candles, style);
        const outcome = scoreWithProfile(candles, style, classicProfile);
        expect(outcome.status).toBe("scored");
        if (outcome.status !== "scored") return;
        const after = outcome.result;

        // Human-readable row for the before/after table.
        console.log(
          `${symbol.padEnd(4)} ${style.padEnd(8)} candles=${String(candles.length).padEnd(4)} ` +
            `BEFORE score=${before.score} ${before.signal} stop=${before.stopSuggestion} ` +
            `(${before.breakdown.trend}/${before.breakdown.momentum}/${before.breakdown.macdScore}) | ` +
            `AFTER score=${after.score} ${after.signal} stop=${after.stopSuggestion} ` +
            `(${after.components.map((c) => c.points).join("/")})`
        );

        expect(after.score).toBe(before.score);
        expect(after.signal).toBe(before.signal);
        expect(after.stopSuggestion).toBe(before.stopSuggestion);
        expect(after.components.map((c) => c.points)).toEqual([
          before.breakdown.trend,
          before.breakdown.momentum,
          before.breakdown.macdScore,
        ]);
      }, 30_000);
    }
  }
});
