// Reads the logged-in user's access tier. Access is time-based: a user is
// "paid" while their `paid_until` timestamp is in the future (covers both the
// 7-day trial and paid 30-day periods). Defaults to "free".
//
// Wrapped in React cache(): many components ask for the tier during one page
// render — the auth check and the profiles query run at most once per render.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/user";
import type { Tier } from "@/lib/access";

export const getUserTier = cache(async (): Promise<Tier> => {
  const user = await getAuthUser();
  if (!user) return "free";

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("paid_until")
    .eq("id", user.id)
    .single();

  if (!data?.paid_until) return "free";
  return new Date(data.paid_until).getTime() > Date.now() ? "paid" : "free";
});
