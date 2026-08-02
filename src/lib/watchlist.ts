// Server-side read helper for a user's dashboard watchlist.
// Returns the symbols the user has chosen (oldest first), or [] if none/logged out.

import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/user";

export async function getWatchlistSymbols(): Promise<string[]> {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watchlist")
    .select("symbol")
    .order("added_at", { ascending: true });

  if (error) {
    console.error("getWatchlistSymbols failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.symbol as string);
}
