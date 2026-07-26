// Shared definitions so every part of the app agrees on what things are.

// v1 asset classes. "stock" (PSE) is added in a later phase.
export type AssetType = "crypto" | "commodity";

export type SignalVerdict = "Buy Candidate" | "Wait" | "Avoid";

// The pieces behind a signal, for the "Why this signal?" popover.
export interface SignalDetail {
  trendPts: number;      // 0–35
  momentumPts: number;   // 0–35
  macdPts: number;       // 0–30
  emaDiffPct: number;    // how far EMA-20 is above/below EMA-50
  rsi: number;           // 0–100
  macdHistogram: number; // >0 = momentum building
}

export interface Asset {
  symbol: string;          // e.g. "BTC"
  name: string;            // e.g. "Bitcoin"
  type: AssetType;
  price: number;           // latest price
  dailyChangePct: number;  // percent change for the day (e.g. 1.8 = +1.8%)
  currency: string;        // "USD" for crypto/commodities in v1
  isSample: boolean;       // true = SAMPLE data, never shown as live
  score?: number;          // 0–100 signal score (Phase 5)
  signal?: SignalVerdict;  // plain-English verdict (Phase 5)
  stopSuggestion?: number; // recent swing low for stop placement (Phase 5)
  detail?: SignalDetail;   // the parameters behind the signal (for the popover)
  spark?: number[];        // recent closes (downsampled) for the sparkline
}

// Trade Journal (Phase 7). One record per trade the user logs.
export type TradeDirection = "long" | "short";
export type TradeStatus = "open" | "closed";

export interface Trade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entry: number;
  stop_loss: number | null;
  target: number | null;
  position_size: number | null;
  status: TradeStatus;
  exit: number | null;
  result: number | null;   // profit/loss once closed
  notes: string | null;
  opened_at: string;       // ISO timestamp
  closed_at: string | null;
}
