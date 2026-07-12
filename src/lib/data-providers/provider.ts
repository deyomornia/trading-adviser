import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";

// The universal adapter. A mock serves sample data; live feeds (Binance,
// Twelve Data) implement this same shape — so the rest of the app never
// changes when we swap data sources.
export interface DataProvider {
  name: string;
  getAssets(): Promise<Asset[]>;
  // Price history for one symbol, used by the Asset Detail chart/score.
  getCandles(symbol: string): Promise<Candle[] | null>;
}
