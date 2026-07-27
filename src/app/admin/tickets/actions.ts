"use server";

// Admin-side ticket actions: reply as DG Support and open/close tickets.
// Every action re-verifies the caller is the admin, then writes through the
// service-role client (RLS forbids users from doing any of this).

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

const MAX_BODY = 2000;

export async function adminReply(formData: FormData) {
  if (!(await isAdmin()) || !adminConfigured()) return;

  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);
  if (!ticketId || !body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await createAdminClient().from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    from_admin: true,
    body,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
}

export async function setTicketStatus(formData: FormData) {
  if (!(await isAdmin()) || !adminConfigured()) return;

  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!ticketId || (status !== "open" && status !== "closed")) return;

  await createAdminClient()
    .from("tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
}
