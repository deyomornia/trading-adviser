"use server";

// Server actions for the Trade Journal: add, close, and delete trades.
// All writes go through the logged-in user's Supabase session; Row-Level
// Security guarantees a user can only touch their own rows.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TradeDirection } from "@/types";

// Turn a form field into a number, or null when blank.
function num(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function addTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // middleware already blocks this, but be safe

  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const entry = num(formData.get("entry"));
  if (!symbol || entry === null) return; // symbol + entry are required

  const direction = (String(formData.get("direction") ?? "long") as TradeDirection);

  await supabase.from("trades").insert({
    user_id: user.id,
    symbol,
    direction,
    entry,
    stop_loss: num(formData.get("stop_loss")),
    target: num(formData.get("target")),
    position_size: num(formData.get("position_size")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  revalidatePath("/journal");
}

export async function closeTrade(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const exit = num(formData.get("exit"));
  if (!id || exit === null) return;

  // Load the trade to compute profit/loss (RLS ensures it's the user's own).
  const { data: trade } = await supabase
    .from("trades")
    .select("entry, direction, position_size")
    .eq("id", id)
    .single();

  let result: number | null = null;
  if (trade) {
    const perUnit =
      trade.direction === "long" ? exit - trade.entry : trade.entry - exit;
    // If a position size was recorded, give a currency P/L; otherwise leave null.
    result = trade.position_size != null ? +(perUnit * trade.position_size).toFixed(2) : null;
  }

  await supabase
    .from("trades")
    .update({ status: "closed", exit, result, closed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/journal");
}

export async function deleteTrade(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("trades").delete().eq("id", id);
  revalidatePath("/journal");
}
