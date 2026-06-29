// Shared definitions so every part of the app agrees on what things are.

// v1 asset classes. "stock" (PSE) is added in a later phase.
export type AssetType = "crypto" | "commodity";

export interface Asset {
  symbol: string;          // e.g. "BTC"
  name: string;            // e.g. "Bitcoin"
  type: AssetType;
  price: number;           // latest price
  dailyChangePct: number;  // percent change for the day (e.g. 1.8 = +1.8%)
  currency: string;        // "USD" for crypto/commodities in v1
  isSample: boolean;       // true = SAMPLE data, never shown as live
}
