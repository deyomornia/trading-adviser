// Trading style → candle timeframe. Lets the same signal engine speak to
// day traders (hourly bars), swing traders (daily), and position traders
// (weekly). The user's choice is stored in a browser cookie (no DB needed).

import { cookies } from "next/headers";

export type TradingStyle = "day" | "swing" | "position";

export const STYLES: TradingStyle[] = ["day", "swing", "position"];

export interface StyleConfig {
  label: string;
  blurb: string;
  holding: string;           // typical holding time
  bars: string;              // which candles the signals use
  who: string;               // who this style suits
  binanceInterval: string;   // Binance kline interval
  twelveInterval: string;    // Twelve Data interval
  limit: number;             // how many candles to pull
  unit: string;              // for the chart heading ("hours"/"days"/"weeks")
  intraday: boolean;         // show time on the chart axis
}

export const STYLE_CONFIG: Record<TradingStyle, StyleConfig> = {
  day: {
    label: "Day",
    blurb: "Hourly bars — for trades held minutes to hours.",
    holding: "Minutes to hours — usually closed the same day",
    bars: "Hourly candles",
    who: "Active traders who watch the market through the day and want quick in-and-out moves.",
    binanceInterval: "1h",
    twelveInterval: "1h",
    limit: 168, // ~1 week of hourly candles
    unit: "hours",
    intraday: true,
  },
  swing: {
    label: "Swing",
    blurb: "Daily bars — for trades held days to weeks.",
    holding: "A few days to a few weeks",
    bars: "Daily candles",
    who: "Traders who check in once a day and aim to catch medium-sized moves.",
    binanceInterval: "1d",
    twelveInterval: "1day",
    limit: 120,
    unit: "days",
    intraday: false,
  },
  position: {
    label: "Position",
    blurb: "Weekly bars — for trades held weeks to months.",
    holding: "Weeks to months (sometimes longer)",
    bars: "Weekly candles",
    who: "Longer-term traders who want to ride big trends and rarely trade.",
    binanceInterval: "1w",
    twelveInterval: "1week",
    limit: 120,
    unit: "weeks",
    intraday: false,
  },
};

export function isTradingStyle(v: unknown): v is TradingStyle {
  return v === "day" || v === "swing" || v === "position";
}

// Read the user's chosen style from the cookie (defaults to swing).
export async function getTradingStyle(): Promise<TradingStyle> {
  const store = await cookies();
  const v = store.get("trading_style")?.value;
  return isTradingStyle(v) ? v : "swing";
}
