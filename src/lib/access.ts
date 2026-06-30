// Central place that decides which features an account can use.
//
// The paid/free model is undecided, so for now EVERY feature is open to every
// signed-in account. When Deo decides to sell access, tighten the rules HERE —
// no other file needs to change. Each account already carries a `tier`
// (see the `profiles` table), so gating is just a lookup.

export type Tier = "free" | "paid";

// Add features here as they get built. "all" is a convenience flag.
export type Feature =
  | "dashboard"
  | "asset-detail"
  | "trade-plan"
  | "journal"
  | "portfolio"
  | "real-data";

// EXAMPLE of how to gate later (currently unused — everything is open):
//   const PAID_ONLY: Feature[] = ["journal", "portfolio", "real-data"];
//   return tier === "paid" || !PAID_ONLY.includes(feature);
export function canAccess(_tier: Tier, _feature: Feature): boolean {
  // Phase A: all features open to any signed-in user.
  return true;
}
