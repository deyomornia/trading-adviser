import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { grantDays, revokePro, suspendUser, unsuspendUser } from "./actions";
import DeleteUserButton from "@/components/DeleteUserButton";

export const dynamic = "force-dynamic";

interface AdminRow {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignIn: string | null;
  paidUntil: string | null;
  role: string;
  bannedUntil: string | null;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadUsers(): Promise<AdminRow[]> {
  const admin = createAdminClient();

  const [{ data: list }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, paid_until, role"),
  ]);

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { paid_until: string | null; role: string | null }])
  );

  return (list?.users ?? [])
    .map((u) => {
      const p = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "(no email)",
        createdAt: u.created_at ?? null,
        lastSignIn: u.last_sign_in_at ?? null,
        paidUntil: p?.paid_until ?? null,
        role: p?.role ?? "user",
        // banned_until is returned by the admin API but missing from the SDK type.
        bannedUntil: (u as { banned_until?: string | null }).banned_until ?? null,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Hard gate: only the admin ever sees this page.
  if (!(await isAdmin())) redirect("/");

  if (!adminConfigured()) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-900">Admin — Users</h1>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Admin data needs the server key (SUPABASE_SERVICE_ROLE_KEY), which is
          set on the deployed site. Open this page on the live app — or add the
          key to your local .env.local for local testing.
        </p>
      </div>
    );
  }

  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  const users = await loadUsers();
  const now = Date.now();
  const week = now - 7 * 86_400_000;
  const month = now - 30 * 86_400_000;

  const proCount = users.filter((u) => u.paidUntil && new Date(u.paidUntil).getTime() > now).length;
  const newWeek = users.filter((u) => u.createdAt && new Date(u.createdAt).getTime() > week).length;
  const newMonth = users.filter((u) => u.createdAt && new Date(u.createdAt).getTime() > month).length;

  const query = (q ?? "").trim().toLowerCase();
  const shown = query ? users.filter((u) => u.email.toLowerCase().includes(query)) : users;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Admin — Users</h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Active Pro" value={proCount} />
        <StatCard label="New this week" value={`+${newWeek}`} />
        <StatCard label="New this month" value={`+${newMonth}`} />
      </div>

      {/* Search */}
      <form method="GET" className="mt-6 flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by email…"
          className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Search
        </button>
        {query && (
          <Link href="/admin" className="text-sm text-slate-500 underline">
            Clear
          </Link>
        )}
      </form>

      <p className="mt-3 text-sm text-slate-500">
        Showing {shown.length} of {users.length} account{users.length === 1 ? "" : "s"}.
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Last sign-in</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const isPro = u.paidUntil ? new Date(u.paidUntil).getTime() > now : false;
              const isSuspended = u.bannedUntil ? new Date(u.bannedUntil).getTime() > now : false;
              const isSelf = me?.id === u.id;
              return (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{u.email}</span>
                    {u.role === "admin" && (
                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                        admin
                      </span>
                    )}
                    {isSelf && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(u.lastSignIn)}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {isPro ? (
                        <>
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Pro
                          </span>
                          <span className="text-xs text-slate-400">until {fmtDate(u.paidUntil)}</span>
                        </>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Free
                        </span>
                      )}
                      {isSuspended && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Suspended
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {[7, 30].map((d) => (
                        <form key={d} action={grantDays}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="days" value={d} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            +{d}d
                          </button>
                        </form>
                      ))}
                      {isPro && (
                        <form action={revokePro}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:text-amber-600"
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                      {!isSelf && (
                        <>
                          <form action={isSuspended ? unsuspendUser : suspendUser}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-700"
                            >
                              {isSuspended ? "Unsuspend" : "Suspend"}
                            </button>
                          </form>
                          <DeleteUserButton userId={u.id} email={u.email} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        “+7d / +30d” adds Pro days on top of any remaining access · “Revoke” ends Pro now
        (re-grant anytime) · “Suspend” blocks sign-in but keeps data · “Delete” permanently
        removes the account and all its data (type-to-confirm). Your own account can’t be
        suspended or deleted.
      </p>
    </div>
  );
}
