// Central place that decides which features an account can use.
// Change the free/paid split HERE — no other file needs to change.
// Each account carries a `tier` (see the `profiles` table), so gating is a lookup.

export type Tier = "free" | "paid";

export type Feature =
  | "dashboard"
  | "asset-detail"
  | "trade-plan"
  | "journal"
  | "portfolio";

// Phase B split (chosen 2026-07-13):
//   FREE: Dashboard + Asset Detail + Trade Plan (view/plan any asset)
//   PAID: Trade Journal + Portfolio (the personal tracking tools)
const PAID_ONLY: Feature[] = ["journal", "portfolio"];

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
};
