// Supabase client for use in the BROWSER (client components).
// Reads the public URL + anon key from environment variables.
// The anon key is safe to expose in the browser — Row-Level Security
// in the database is what actually protects each user's data.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
