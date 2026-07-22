"use server";

// Saves Trade Plan default preferences to cookies.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const YEAR = 60 * 60 * 24 * 365;

export async function saveTradePrefs(formData: FormData) {
  const account = String(formData.get("accountSize") ?? "").trim();
  const risk = String(formData.get("riskPercent") ?? "").trim();
  const currency = String(formData.get("currency") ?? "₱");

  const store = await cookies();
  const opts = { path: "/", maxAge: YEAR, sameSite: "lax" as const };
  if (account) store.set("tp_account", account, opts);
  if (risk) store.set("tp_risk", risk, opts);
  store.set("tp_currency", currency === "$" ? "$" : "₱", opts);

  revalidatePath("/settings");
  revalidatePath("/trade-plan");
}
