import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminTicketsPage() {
  if (!(await isAdmin())) redirect("/");

  if (!adminConfigured()) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Support tickets</h1>
        <p className="mt-4 rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Ticket data needs the server key — open this page on the deployed site.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: tickets }, { data: list }] = await Promise.all([
    admin.from("tickets").select("id, user_id, subject, status, updated_at"),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);

  const emailById = new Map((list?.users ?? []).map((u) => [u.id, u.email ?? "(no email)"]));
  const sorted = (tickets ?? []).sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1; // open first
    return b.updated_at.localeCompare(a.updated_at);
  });
  const openCount = sorted.filter((t) => t.status === "open").length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin" className="text-sm text-slate-500 dark:text-ink-300 hover:underline">
        ← Admin
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-ink-100">Support tickets</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-ink-300">
        {sorted.length} total · {openCount} open. Open tickets are listed first.
      </p>

      {sorted.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-6 text-center text-sm text-slate-400 dark:text-ink-300/70">
          No tickets yet — beta feedback will land here.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-slate-100 dark:divide-ink-700/60 overflow-hidden rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900">
          {sorted.map((t) => (
            <Link
              key={t.id}
              href={`/admin/tickets/${t.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-ink-800"
            >
              <span>
                <span className="font-medium text-slate-900 dark:text-ink-100">{t.subject}</span>
                <span className="ml-2 text-xs text-slate-400 dark:text-ink-300/70">
                  {emailById.get(t.user_id) ?? t.user_id}
                </span>
              </span>
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
                <span className="text-slate-400 dark:text-ink-300/70">{fmtWhen(t.updated_at)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
