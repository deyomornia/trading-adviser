"use server";

// Saves the chosen scoring combination (per trading style) to a cookie and
// refreshes the pages that depend on it. Enforces the access rule server-side:
// free accounts get Classic + ONE extra combination per style; Pro gets all.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { profileById } from "@/lib/signal-engine";
import { isTradingStyle } from "@/lib/tradingStyle";
import { getUserTier } from "@/lib/tier";
import { canAccess } from "@/lib/access";
import { parseStyleMap, PROFILE_COOKIE, EXTRA_COOKIE } from "@/lib/scoringProfile";

const COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
};

export async function setScoringProfile(formData: FormData) {
  const style = String(formData.get("style") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (!isTradingStyle(style)) return;

  const profile = profileById(profileId);
  if (!profile || !profile.styles.includes(style)) return;

  const store = await cookies();

  if (profile.id !== "classic") {
    const tier = await getUserTier();
    if (!canAccess(tier, "profiles-all")) {
      const extra = parseStyleMap(store.get(EXTRA_COOKIE)?.value);
      const slot = extra[style];
      if (slot === undefined) {
        // First non-Classic pick for this style fills the free extra slot.
        extra[style] = profile.id;
        store.set(EXTRA_COOKIE, JSON.stringify(extra), COOKIE_OPTS);
      } else if (slot !== profile.id) {
        // Locked — the UI shows an upgrade link for these, but never trust
        // the client: refuse the switch server-side too.
        return;
      }
    }
  }

  const map = parseStyleMap(store.get(PROFILE_COOKIE)?.value);
  map[style] = profile.id;
  store.set(PROFILE_COOKIE, JSON.stringify(map), COOKIE_OPTS);

  revalidatePath("/", "layout");
}
