"use server";

// Admin-only actions: grant/extend/revoke Pro, suspend/unsuspend, delete.
// Every action re-verifies the caller is the admin, then writes through the
// service-role client (normal users cannot write billing columns at all).
// Suspend/delete refuse to act on the admin's own account.

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { extendAccess } from "@/lib/billing";

// The target user id, only if the caller is admin, configured, and the target
// is not the caller themselves (for destructive actions).
async function targetUserId(formData: FormData, protectSelf: boolean): Promise<string | null> {
  if (!(await isAdmin()) || !adminConfigured()) return null;
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return null;
  if (protectSelf) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === userId) return null; // never suspend/delete yourself
  }
  return userId;
}

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

// Suspend: the user keeps their data but cannot sign in until unsuspended.
export async function suspendUser(formData: FormData) {
  const userId = await targetUserId(formData, true);
  if (!userId) return;

  await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: "876000h", // ~100 years; unsuspend clears it
  });
  revalidatePath("/admin");
}

export async function unsuspendUser(formData: FormData) {
  const userId = await targetUserId(formData, false);
  if (!userId) return;

  await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  revalidatePath("/admin");
}

// Delete: removes the login and (via ON DELETE CASCADE) the profile, trades,
// and watchlist. The UI requires typing the user's email to confirm.
export async function deleteUserAccount(formData: FormData) {
  const userId = await targetUserId(formData, true);
  if (!userId) return;

  await createAdminClient().auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}
