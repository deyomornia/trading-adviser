"use server";

// Add/remove assets from the logged-in user's dashboard watchlist.
// Row-Level Security keeps each user to their own rows.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { catalogBySymbol } from "@/data/assetCatalog";

const MAX_WATCHLIST = 30;

export async function addToWatchlist(formData: FormData) {
  const symbol = String(formData.get("symbol") ?? "").toUpperCase();
  if (!catalogBySymbol(symbol)) return; // only allow known catalog assets

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Cap the list so the dashboard stays fast.
  const { count } = await supabase
    .from("watchlist")
    .select("symbol", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_WATCHLIST) return;

  await supabase
    .from("watchlist")
    .upsert({ user_id: user.id, symbol }, { onConflict: "user_id,symbol" });

  revalidatePath("/watchlist");
  revalidatePath("/");
}

export async function removeFromWatchlist(formData: FormData) {
  const symbol = String(formData.get("symbol") ?? "").toUpperCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("watchlist").delete().eq("symbol", symbol);

  revalidatePath("/watchlist");
  revalidatePath("/");
}
