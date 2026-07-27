import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { replyTicket } from "../actions";

export const dynamic = "force-dynamic";

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes both queries to the caller's own tickets.
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, status, created_at")
    .eq("id", id)
    .single();
  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, from_admin, body, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const open = ticket.status === "open";

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/support" className="text-sm text-slate-500 dark:text-ink-300 hover:underline">
        ← All conversations
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

      {/* Thread */}
      <div className="mt-6 space-y-3">
        {(messages ?? []).map((m) => (
          <div key={m.id} className={m.from_admin ? "flex justify-start" : "flex justify-end"}>
            <div
              className={
                "max-w-[85%] rounded-lg px-4 py-2.5 text-sm " +
                (m.from_admin
                  ? "border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-slate-700 dark:text-ink-100/90"
                  : "bg-slate-900 dark:bg-accent/15 text-white dark:text-ink-100")
              }
            >
              <div className={"mb-1 text-[11px] " + (m.from_admin ? "text-slate-400 dark:text-ink-300/70" : "text-white/60 dark:text-ink-300")}>
                {m.from_admin ? "DG Support" : "You"} · {fmtWhen(m.created_at)}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply / closed state */}
      {open ? (
        <form action={replyTicket} className="mt-6">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <textarea
            name="body"
            required
            rows={3}
            maxLength={2000}
            placeholder="Write a reply…"
            className="w-full rounded-md border border-slate-300 dark:border-ink-700 bg-white dark:bg-ink-950 px-3 py-2 text-sm text-slate-900 dark:text-ink-100 outline-none focus:border-slate-500 dark:focus:border-accent"
          />
          <button
            type="submit"
            title="Send your reply to the DG team"
            className="mt-2 rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
          >
            Send reply
          </button>
        </form>
      ) : (
        <p className="mt-6 rounded-md border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-800/50 px-4 py-3 text-sm text-slate-500 dark:text-ink-300">
          This conversation is closed. If you need anything else, start a new one
          from the{" "}
          <Link href="/support" className="underline">
            Support page
          </Link>
          .
        </p>
      )}
    </div>
  );
}
