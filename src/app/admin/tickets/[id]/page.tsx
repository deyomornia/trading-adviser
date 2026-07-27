import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { adminReply, setTicketStatus } from "../actions";

export const dynamic = "force-dynamic";

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/");
  if (!adminConfigured()) redirect("/admin/tickets");

  const { id } = await params;
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, user_id, subject, status, created_at")
    .eq("id", id)
    .single();
  if (!ticket) notFound();

  const [{ data: messages }, { data: owner }] = await Promise.all([
    admin
      .from("ticket_messages")
      .select("id, from_admin, body, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    admin.auth.admin.getUserById(ticket.user_id),
  ]);

  const open = ticket.status === "open";
  const email = owner?.user?.email ?? ticket.user_id;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/tickets" className="text-sm text-slate-500 dark:text-ink-300 hover:underline">
        ← All tickets
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">{ticket.subject}</h1>
        {open ? (
          <span className="rounded bg-green-100 dark:bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-emerald-300">
            Open
          </span>
        ) : (
          <span className="rounded bg-slate-100 dark:bg-ink-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-ink-300">
            Closed
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-ink-300">
        From <span className="font-medium text-slate-700 dark:text-ink-100/90">{email}</span> · started{" "}
        {fmtWhen(ticket.created_at)}
      </p>

      {/* Thread — admin messages on the right here (the admin is "you") */}
      <div className="mt-6 space-y-3">
        {(messages ?? []).map((m) => (
          <div key={m.id} className={m.from_admin ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] rounded-lg px-4 py-2.5 text-sm " +
                (m.from_admin
                  ? "bg-slate-900 dark:bg-accent/15 text-white dark:text-ink-100"
                  : "border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-slate-700 dark:text-ink-100/90")
              }
            >
              <div className={"mb-1 text-[11px] " + (m.from_admin ? "text-white/60 dark:text-ink-300" : "text-slate-400 dark:text-ink-300/70")}>
                {m.from_admin ? "You (DG Support)" : email} · {fmtWhen(m.created_at)}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply + status controls */}
      <form action={adminReply} className="mt-6">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <textarea
          name="body"
          required
          rows={3}
          maxLength={2000}
          placeholder={open ? "Reply as DG Support…" : "Reopen the ticket to reply, or reply now (it stays closed)…"}
          className="w-full rounded-md border border-slate-300 dark:border-ink-700 bg-white dark:bg-ink-950 px-3 py-2 text-sm text-slate-900 dark:text-ink-100 outline-none focus:border-slate-500 dark:focus:border-accent"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            title="Reply to this user as DG Support"
            className="rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
          >
            Send reply
          </button>
        </div>
      </form>

      <form action={setTicketStatus} className="mt-3">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <input type="hidden" name="status" value={open ? "closed" : "open"} />
        <button
          type="submit"
          title={open ? "Mark this conversation resolved (user can no longer reply)" : "Reopen so the user can reply again"}
          className="rounded-md border border-slate-300 dark:border-ink-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-ink-300 hover:bg-slate-50 dark:hover:bg-ink-800"
        >
          {open ? "Close ticket" : "Reopen ticket"}
        </button>
      </form>
    </div>
  );
}
