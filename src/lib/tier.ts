// Reads the logged-in user's subscription tier from their profile.
// Defaults to "free" if not signed in or on any error.

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
    .select("tier")
    .eq("id", user.id)
    .single();

  return data?.tier === "paid" ? "paid" : "free";
}
