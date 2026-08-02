// Per-request-cached auth lookup. `supabase.auth.getUser()` is a NETWORK call
// to Supabase's auth server — several components need the user during one page
// render (tier, watchlist, screener), and without caching each one pays that
// round trip again. React's cache() dedupes it to one call per server render.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
