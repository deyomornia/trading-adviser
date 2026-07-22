"use server";

// Saves the current trade plan into the journal (a Pro feature). Free users are
// redirected to /upgrade; logged-out users to /login.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserTier } from "@/lib/tier";
import { canAccess } from "@/lib/access";

function num(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function savePlanToJournal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/trade-plan");

  if (!canAccess(await getUserTier(), "journal")) redirect("/upgrade");

  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const entry = num(formData.get("entry"));
  if (!symbol || entry === null) redirect("/trade-plan?error=Enter%20a%20symbol%20and%20entry%20first");

  await supabase.from("trades").insert({
    user_id: user.id,
    symbol,
    direction: String(formData.get("direction") ?? "long"),
    entry,
    stop_loss: num(formData.get("stop_loss")),
    target: num(formData.get("target")),
    position_size: num(formData.get("position_size")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  revalidatePath("/journal");
  redirect("/journal");
}
