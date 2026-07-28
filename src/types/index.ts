// Shared definitions so every part of the app agrees on what things are.

// v1 asset classes. "stock" (PSE) is added in a later phase.
export type AssetType = "crypto" | "commodity";

export type SignalVerdict = "Buy Candidate" | "Wait" | "Avoid";

// The pieces behind a signal, for the "Why this signal?" popover. Dynamic:
// each scoring profile defines its own components, so nothing here assumes
// a fixed Trend/Momentum/MACD split.
export interface SignalDetail {
  profileId: string;   // which scoring profile produced the score
  profileName: string; // e.g. "Classic (DG Default)"
  components: {
    name: string;      // e.g. "Trend (EMA 20 vs 50)"
    points: number;
    maxPoints: number;
    hint: string;      // one plain-English line about this component
  }[];
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
  profileId?: string;      // scoring profile used (when scored)
  unavailableReason?: string; // set when the chosen profile can't score this asset
  unavailableCode?: string;   // machine-readable category for the reason above
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
