// Which scoring combination ("profile") the user picked, per trading style.
// Mirrors the trading-style pattern: one cookie, server-read, safe fallback.
//
//   scoring_profiles = {"day":"classic","swing":"macd-rsi","position":"classic"}
//   scoring_extra    = {"swing":"macd-rsi"}   // free user's one extra pick
//
// Free tier = Classic + ONE extra combination of choice per style (the first
// non-Classic pick fills the slot); Pro ("profiles-all") unlocks everything.

import { cookies } from "next/headers";
import {
  profileById,
  DEFAULT_PROFILE_ID,
  type ScoringProfile,
} from "@/lib/signal-engine";
import { isTradingStyle, type TradingStyle } from "@/lib/tradingStyle";
import { getUserTier } from "@/lib/tier";
import { canAccess } from "@/lib/access";

export const PROFILE_COOKIE = "scoring_profiles";
export const EXTRA_COOKIE = "scoring_extra";

type StyleMap = Partial<Record<TradingStyle, string>>;

// A malformed cookie must never crash a server component — fall back to {}.
export function parseStyleMap(raw: string | undefined): StyleMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: StyleMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isTradingStyle(k) && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

// The active profile for a style. Validates the saved id exists AND is offered
// in this style — otherwise Classic. This is also what makes style-switching
// behave right: a pick that isn't offered in the new style falls back cleanly.
export async function getScoringProfile(style: TradingStyle): Promise<ScoringProfile> {
  const store = await cookies();
  const map = parseStyleMap(store.get(PROFILE_COOKIE)?.value);
  const saved = map[style] ? profileById(map[style]!) : undefined;
  if (saved && saved.styles.includes(style)) return saved;
  return profileById(DEFAULT_PROFILE_ID)!;
}

// Everything the picker needs in one call.
export async function getScoringSelection(style: TradingStyle): Promise<{
  profile: ScoringProfile;
  extraSlot: string | undefined; // free user's one unlocked extra for this style
  isPro: boolean;
}> {
  const store = await cookies();
  const [profile, tier] = await Promise.all([getScoringProfile(style), getUserTier()]);
  const extra = parseStyleMap(store.get(EXTRA_COOKIE)?.value);
  return {
    profile,
    extraSlot: extra[style],
    isPro: canAccess(tier, "profiles-all"),
  };
}
