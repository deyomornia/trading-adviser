"use server";

// Admin-only actions: grant/extend or revoke a user's Pro access.
// Every action re-verifies the caller is the admin, then writes through the
// service-role client (normal users cannot write billing columns at all).

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { extendAccess } from "@/lib/billing";

export async function grantDays(formData: FormData) {
  if (!(await isAdmin()) || !adminConfigured()) return;

  const userId = String(formData.get("userId") ?? "");
  const days = Number(formData.get("days"));
  if (!userId || !Number.isFinite(days) || days <= 0 || days > 365) return;

  await extendAccess(createAdminClient(), userId, days);
  revalidatePath("/admin");
}

export async function revokePro(formData: FormData) {
  if (!(await isAdmin()) || !adminConfigured()) return;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await createAdminClient()
    .from("profiles")
    .update({ paid_until: new Date().toISOString(), tier: "free" })
    .eq("id", userId);

  revalidatePath("/admin");
}
