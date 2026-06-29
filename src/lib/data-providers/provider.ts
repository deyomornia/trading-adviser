import type { Asset } from "@/types";

// The universal adapter. Today a mock serves sample data; later, real
// feeds (Binance, Twelve Data) implement this same shape — so the rest
// of the app never changes when we swap data sources.
export interface DataProvider {
  name: string;
  getAssets(): Promise<Asset[]>;
}
