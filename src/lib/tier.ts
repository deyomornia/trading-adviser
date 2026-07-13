// Reads the logged-in user's access tier. Access is time-based: a user is
// "paid" while their `paid_until` timestamp is in the future (covers both the
// 7-day trial and paid 30-day periods). Defaults to "free".

import { createClient } from "@/lib/supabase/server";
import type { Tier } from "@/lib/access";

export async function getUserTier(): Promise<Tier> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "free";

  const { data } = await supabase
    .from("profiles")
    .select("paid_until")
    .eq("id", user.id)
    .single();

  if (!data?.paid_until) return "free";
  return new Date(data.paid_until).getTime() > Date.now() ? "paid" : "free";
}
