// The full catalog of assets a user can add to their dashboard watchlist.
// `source` tells the live provider how to fetch each one:
//   binance     → live crypto (no key), `pair` is the Binance symbol
//   twelvedata  → live commodity, `pair` is the Twelve Data instrument
//   sample      → SAMPLE data only (no live feed available on the free plan)

import type { AssetType } from "@/types";

export type AssetSource = "binance" | "twelvedata" | "yahoo" | "sample";

export interface CatalogAsset {
  symbol: string; // display symbol, e.g. "BTC"
  name: string;
  type: AssetType;
  currency: string;
  source: AssetSource;
  pair?: string; // Binance pair or Twelve Data instrument
}

// Crypto — all live via Binance's public API (no key needed).
// Every pair below is verified to exist as <SYMBOL>USDT on Binance with real
// volume (checked 2026-08-01 against exchangeInfo + klines). Coverage: every
// CoinGecko top-150 coin that trades as a Binance USDT spot pair, excluding
// stablecoins and wrapped/staked duplicates. Note: TON was rebranded/migrated
// to GRAM (TONUSDT no longer trades — same treatment as MATIC→POL).
const CRYPTO: CatalogAsset[] = [
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["SOL", "Solana"], ["BNB", "BNB"],
  ["XRP", "XRP"], ["ADA", "Cardano"], ["DOGE", "Dogecoin"], ["AVAX", "Avalanche"],
  ["DOT", "Polkadot"], ["LINK", "Chainlink"], ["POL", "Polygon"], ["LTC", "Litecoin"],
  ["TRX", "TRON"], ["UNI", "Uniswap"], ["ATOM", "Cosmos"], ["XLM", "Stellar"],
  ["ETC", "Ethereum Classic"], ["FIL", "Filecoin"], ["NEAR", "NEAR Protocol"],
  ["ALGO", "Algorand"], ["VET", "VeChain"], ["ICP", "Internet Computer"],
  ["SAND", "The Sandbox"], ["AAVE", "Aave"],
  ["SHIB", "Shiba Inu"], ["PEPE", "Pepe"], ["ARB", "Arbitrum"], ["OP", "Optimism"],
  ["APT", "Aptos"], ["SUI", "Sui"], ["INJ", "Injective"], ["GRAM", "Gram (prev. Toncoin)"],
  ["HBAR", "Hedera"], ["RENDER", "Render"], ["TAO", "Bittensor"], ["FET", "Fetch.ai"],
  ["GRT", "The Graph"], ["IMX", "Immutable"], ["LDO", "Lido DAO"], ["STX", "Stacks"],
  ["RUNE", "THORChain"], ["EGLD", "MultiversX"], ["THETA", "Theta Network"],
  ["XTZ", "Tezos"], ["GALA", "Gala"],
  // Catalog expansion (2026-08-01): remaining top-150 coins tradable on Binance.
  ["ZEC", "Zcash"], ["BCH", "Bitcoin Cash"], ["ONDO", "Ondo"],
  ["WLFI", "World Liberty Financial"], ["ASTER", "Aster"], ["SKY", "Sky"],
  ["MORPHO", "Morpho"], ["WLD", "Worldcoin"], ["QNT", "Quant"],
  ["PUMP", "Pump.fun"], ["JST", "JUST"], ["ENA", "Ethena"], ["NEXO", "Nexo"],
  ["JUP", "Jupiter"], ["CAKE", "PancakeSwap"], ["DASH", "Dash"],
  ["ETHFI", "Ether.fi"], ["AERO", "Aerodrome Finance"], ["PENGU", "Pudgy Penguins"],
  ["VIRTUAL", "Virtuals Protocol"], ["TRUMP", "Official Trump"], ["SUN", "Sun Token"],
  ["NIGHT", "Midnight"], ["CRV", "Curve DAO"], ["TIA", "Celestia"],
  ["PYTH", "Pyth Network"], ["SEI", "Sei"], ["KAITO", "Kaito"], ["GNO", "Gnosis"],
  ["LUNC", "Terra Luna Classic"], ["BONK", "Bonk"], ["ZRO", "LayerZero"],
  ["JTO", "Jito"], ["PENDLE", "Pendle"], ["DCR", "Decred"],
].map(([symbol, name]) => ({
  symbol,
  name,
  type: "crypto" as const,
  currency: "USD",
  source: "binance" as const,
  pair: `${symbol}USDT`,
}));

// Commodities — Gold via Twelve Data (free plan); the rest via Yahoo Finance
// futures (unofficial feed; auto-falls back to SAMPLE on any failure).
const COMMODITIES: CatalogAsset[] = [
  { symbol: "XAU", name: "Gold (spot oz)", type: "commodity", currency: "USD", source: "twelvedata", pair: "XAU/USD" },
  { symbol: "WTI", name: "Crude Oil (WTI)", type: "commodity", currency: "USD", source: "yahoo", pair: "CL=F" },
  { symbol: "HG", name: "Copper", type: "commodity", currency: "USD", source: "yahoo", pair: "HG=F" },
  { symbol: "SI", name: "Silver", type: "commodity", currency: "USD", source: "yahoo", pair: "SI=F" },
  { symbol: "NG", name: "Natural Gas", type: "commodity", currency: "USD", source: "yahoo", pair: "NG=F" },
];

export const assetCatalog: CatalogAsset[] = [...CRYPTO, ...COMMODITIES];

// Shown when a user hasn't picked a watchlist yet (and to logged-out visitors).
export const DEFAULT_WATCHLIST = ["BTC", "ETH", "SOL", "XAU"];

const BY_SYMBOL = new Map(assetCatalog.map((a) => [a.symbol, a]));
export function catalogBySymbol(symbol: string): CatalogAsset | undefined {
  return BY_SYMBOL.get(symbol);
}
