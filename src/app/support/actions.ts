"use server";

// User-side support actions. RLS guarantees users only touch their own
// tickets, can never write as admin, and can't post to closed tickets.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_SUBJECT = 120;
const MAX_BODY = 2000;

export async function createTicket(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/support");

  const subject = String(formData.get("subject") ?? "").trim().slice(0, MAX_SUBJECT);
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);
  if (!subject || !body) redirect("/support?error=Please%20fill%20in%20both%20fields");

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({ user_id: user.id, subject })
    .select("id")
    .single();
  if (error || !ticket) redirect("/support?error=Could%20not%20create%20the%20ticket");

  await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    body,
  });

  revalidatePath("/support");
  redirect(`/support/${ticket.id}`);
}

export async function replyTicket(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/support");

  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);
  if (!ticketId || !body) return;

  // RLS enforces: own ticket, open status, from_admin=false.
  await supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    body,
  });

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
}
