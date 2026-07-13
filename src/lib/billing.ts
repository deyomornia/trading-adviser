// Shared access-extension logic used by both the checkout success page (user
// session) and the PayMongo webhook (admin session). Adds `days` of Pro access,
// stacking on any time the user still has left.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function extendAccess(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("paid_until")
    .eq("id", userId)
    .single();

  const now = Date.now();
  const current = data?.paid_until ? new Date(data.paid_until).getTime() : 0;
  const base = Math.max(now, current);
  const paidUntil = new Date(base + days * 86_400_000).toISOString();

  await supabase
    .from("profiles")
    .update({ paid_until: paidUntil, tier: "paid", pending_checkout_id: null })
    .eq("id", userId);

  return paidUntil;
}
