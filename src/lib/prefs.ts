// User preferences for the Trade Plan defaults, stored in cookies (no DB).

import { cookies } from "next/headers";

export interface TradePrefs {
  accountSize: string;
  riskPercent: string;
  currency: string; // "₱" | "$"
}

export const DEFAULT_PREFS: TradePrefs = {
  accountSize: "100000",
  riskPercent: "1",
  currency: "₱",
};

export async function getTradePrefs(): Promise<TradePrefs> {
  const c = await cookies();
  return {
    accountSize: c.get("tp_account")?.value || DEFAULT_PREFS.accountSize,
    riskPercent: c.get("tp_risk")?.value || DEFAULT_PREFS.riskPercent,
    currency: c.get("tp_currency")?.value === "$" ? "$" : "₱",
  };
}
