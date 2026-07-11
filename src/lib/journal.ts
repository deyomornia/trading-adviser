// Server-side read helper for the Trade Journal.
// Row-Level Security scopes every query to the logged-in user automatically.

import { createClient } from "@/lib/supabase/server";
import type { Trade } from "@/types";

export async function getTrades(): Promise<Trade[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .order("opened_at", { ascending: false });

  if (error) {
    // Surface nothing to the UI on error; log for debugging.
    console.error("getTrades failed:", error.message);
    return [];
  }
  return (data ?? []) as Trade[];
}
