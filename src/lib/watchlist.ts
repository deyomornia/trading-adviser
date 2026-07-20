// Server-side read helper for a user's dashboard watchlist.
// Returns the symbols the user has chosen (oldest first), or [] if none/logged out.

import { createClient } from "@/lib/supabase/server";

export async function getWatchlistSymbols(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

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
