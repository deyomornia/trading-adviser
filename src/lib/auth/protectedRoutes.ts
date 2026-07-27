// Single source of truth for which pages require login.
// To make a page public later, remove its prefix from this list.
// To require login everywhere, this is the only file you change.

export const PROTECTED_PREFIXES = [
  "/journal",
  "/portfolio",
  "/trade-plan",
  "/assets",
  "/settings",
  "/watchlist",
  "/admin",
  "/support",
];

// The dashboard ("/") is intentionally PUBLIC for now so visitors can see a
// preview before signing up. This supports an eventual free/paid split.

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}
