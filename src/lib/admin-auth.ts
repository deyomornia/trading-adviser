// Is the currently logged-in user the app admin?
// Reads the caller's OWN profiles.role via their session (own-row RLS read).
// The role column itself is locked server-side (see supabase/admin-role.sql),
// so this can be trusted. Defaults to false on any doubt.

import { createClient } from "@/lib/supabase/server";

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return data?.role === "admin";
}
