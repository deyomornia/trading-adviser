// Central place that decides which features an account can use.
// Change the free/paid split HERE — no other file needs to change.
// Each account carries a `tier` (see the `profiles` table), so gating is a lookup.

export type Tier = "free" | "paid";

export type Feature =
  | "dashboard"
  | "asset-detail"
  | "trade-plan"
  | "journal"
  | "portfolio"
  | "screener-full"
  | "trade-setup";

// Phase B split (chosen 2026-07-13):
//   FREE: Dashboard + Asset Detail + Trade Plan (view/plan any asset)
//   PAID: Trade Journal + Portfolio (the personal tracking tools)
// "screener-full" (2026-07-26): free tier sees the top 3 opportunities;
// Pro unlocks the full ranked list.
// "trade-setup" (2026-07-28): the rule-based suggested setup card is Pro.
const PAID_ONLY: Feature[] = ["journal", "portfolio", "screener-full", "trade-setup"];

export function canAccess(tier: Tier, feature: Feature): boolean {
  if (!PAID_ONLY.includes(feature)) return true; // free feature
  return tier === "paid";
}

// Human-readable feature names, for upgrade prompts.
export const FEATURE_LABEL: Record<Feature, string> = {
  dashboard: "Dashboard",
  "asset-detail": "Asset Detail",
  "trade-plan": "Trade Plan",
  journal: "Trade Journal",
  portfolio: "Portfolio",
  "screener-full": "Top Opportunities (full list)",
  "trade-setup": "Suggested trade setup",
};
