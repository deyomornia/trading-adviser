// The full catalog of assets a user can add to their dashboard watchlist.
// `source` tells the live provider how to fetch each one:
//   binance     → live crypto (no key), `pair` is the Binance symbol
//   twelvedata  → live commodity, `pair` is the Twelve Data instrument
//   sample      → SAMPLE data only (no live feed available on the free plan)

import type { AssetType } from "@/types";

export type AssetSource = "binance" | "twelvedata" | "sample";

export interface CatalogAsset {
  symbol: string; // display symbol, e.g. "BTC"
  name: string;
  type: AssetType;
  currency: string;
  source: AssetSource;
  pair?: string; // Binance pair or Twelve Data instrument
}

// Crypto — all live via Binance's public API (no key needed).
const CRYPTO: CatalogAsset[] = [
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["SOL", "Solana"], ["BNB", "BNB"],
  ["XRP", "XRP"], ["ADA", "Cardano"], ["DOGE", "Dogecoin"], ["AVAX", "Avalanche"],
  ["DOT", "Polkadot"], ["LINK", "Chainlink"], ["MATIC", "Polygon"], ["LTC", "Litecoin"],
  ["TRX", "TRON"], ["UNI", "Uniswap"], ["ATOM", "Cosmos"], ["XLM", "Stellar"],
  ["ETC", "Ethereum Classic"], ["FIL", "Filecoin"], ["NEAR", "NEAR Protocol"],
  ["ALGO", "Algorand"], ["VET", "VeChain"], ["ICP", "Internet Computer"],
  ["SAND", "The Sandbox"], ["AAVE", "Aave"],
].map(([symbol, name]) => ({
  symbol,
  name,
  type: "crypto" as const,
  currency: "USD",
  source: "binance" as const,
  pair: `${symbol}USDT`,
}));

// Commodities — only Gold is live on the free Twelve Data plan.
const COMMODITIES: CatalogAsset[] = [
  { symbol: "XAU", name: "Gold (spot oz)", type: "commodity", currency: "USD", source: "twelvedata", pair: "XAU/USD" },
  { symbol: "WTI", name: "Crude Oil (WTI)", type: "commodity", currency: "USD", source: "sample" },
  { symbol: "HG", name: "Copper", type: "commodity", currency: "USD", source: "sample" },
];

export const assetCatalog: CatalogAsset[] = [...CRYPTO, ...COMMODITIES];

// Shown when a user hasn't picked a watchlist yet (and to logged-out visitors).
export const DEFAULT_WATCHLIST = ["BTC", "ETH", "SOL", "XAU"];

const BY_SYMBOL = new Map(assetCatalog.map((a) => [a.symbol, a]));
export function catalogBySymbol(symbol: string): CatalogAsset | undefined {
  return BY_SYMBOL.get(symbol);
}
