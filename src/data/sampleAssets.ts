import type { Asset } from "@/types";

// SAMPLE ONLY. These are placeholder numbers for building the app,
// not real market prices. Every record is flagged isSample: true.
export const sampleAssets: Asset[] = [
  { symbol: "BTC", name: "Bitcoin",        type: "crypto",    price: 64250.0, dailyChangePct: 1.8,  currency: "USD", isSample: true },
  { symbol: "ETH", name: "Ethereum",       type: "crypto",    price: 3120.5,  dailyChangePct: -0.9, currency: "USD", isSample: true },
  { symbol: "SOL", name: "Solana",         type: "crypto",    price: 148.2,   dailyChangePct: 3.4,  currency: "USD", isSample: true },
  { symbol: "XAU", name: "Gold (spot oz)", type: "commodity", price: 2335.0,  dailyChangePct: 0.4,  currency: "USD", isSample: true },
  { symbol: "WTI", name: "Crude Oil (WTI)",type: "commodity", price: 78.6,    dailyChangePct: -1.2, currency: "USD", isSample: true },
  { symbol: "HG",  name: "Copper",         type: "commodity", price: 4.52,    dailyChangePct: 0.7,  currency: "USD", isSample: true },
];
