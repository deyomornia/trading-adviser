import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTicket } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 dark:border-ink-700 bg-white dark:bg-ink-950 px-3 py-2 text-sm text-slate-900 dark:text-ink-100 outline-none focus:border-slate-500 dark:focus:border-accent";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-ink-100/90";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, status, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Support & feedback</h1>
      <p className="mt-2 text-slate-600 dark:text-ink-300">
        DG Trading Adviser is in beta, and your input directly shapes what gets
        built. Bug, confusing screen, missing feature, or just a thought — send
        it here and it goes straight to the DG team.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          {error}
        </p>
      )}

      {/* New ticket */}
      <form
        action={createTicket}
        className="mt-6 rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-5"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Start a conversation
        </h2>
        <div className="mt-3">
          <label className={labelClass}>Subject</label>
          <input name="subject" required maxLength={120} placeholder="e.g. Idea for the screener" className={inputClass} />
        </div>
        <div className="mt-3">
          <label className={labelClass}>Message</label>
          <textarea name="body" required rows={4} maxLength={2000} placeholder="Tell us what's on your mind…" className={inputClass} />
        </div>
        <button
          type="submit"
          title="Start a private conversation with the DG team"
          className="mt-4 rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
        >
          Send to the DG team
        </button>
      </form>

      {/* My tickets */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Your conversations ({tickets?.length ?? 0})
        </h2>
        {!tickets || tickets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-6 text-center text-sm text-slate-400 dark:text-ink-300/70">
            No conversations yet — your messages and our replies will appear here.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-ink-700/60 overflow-hidden rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/support/${t.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-ink-800"
              >
                <span className="font-medium text-slate-900 dark:text-ink-100">{t.subject}</span>
                <span className="flex items-center gap-2 text-xs">
                  {t.status === "open" ? (
                    <span className="rounded bg-green-100 dark:bg-emerald-500/15 px-2 py-0.5 font-medium text-green-800 dark:text-emerald-300">
                      Open
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 dark:bg-ink-800 px-2 py-0.5 font-medium text-slate-600 dark:text-ink-300">
                      Closed
                    </span>
                  )}
                  <span className="text-slate-400 dark:text-ink-300/70">{fmtDate(t.updated_at)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
