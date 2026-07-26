// Theme preference, stored in a cookie so the server renders the right mode
// with no flash. Serious-trader default: dark.

import { cookies } from "next/headers";

export type Theme = "dark" | "light";

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  return store.get("theme")?.value === "light" ? "light" : "dark";
}
