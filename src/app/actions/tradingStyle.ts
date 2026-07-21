"use server";

// Saves the chosen trading style to a cookie and refreshes the pages that
// depend on it (dashboard, asset list/detail).

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isTradingStyle } from "@/lib/tradingStyle";

export async function setTradingStyle(formData: FormData) {
  const style = String(formData.get("style") ?? "");
  if (!isTradingStyle(style)) return;

  const store = await cookies();
  store.set("trading_style", style, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
