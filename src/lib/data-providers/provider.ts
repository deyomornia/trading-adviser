import type { Asset } from "@/types";
import type { Candle } from "@/data/sampleCandles";
import type { TradingStyle } from "@/lib/tradingStyle";

// The universal adapter. A mock serves sample data; live feeds (Binance,
// Twelve Data) implement this same shape — so the rest of the app never
// changes when we swap data sources. `style` selects the candle timeframe.
export interface DataProvider {
  name: string;
  // Enriched assets for the given symbols (defaults to a starter set if omitted).
  getAssets(symbols?: string[], style?: TradingStyle): Promise<Asset[]>;
  // Price history for one symbol, used by the Asset Detail chart/score.
  getCandles(symbol: string, style?: TradingStyle): Promise<Candle[] | null>;
}
