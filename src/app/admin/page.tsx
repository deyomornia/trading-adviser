import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { grantDays, revokePro } from "./actions";

export const dynamic = "force-dynamic";

interface AdminRow {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignIn: string | null;
  paidUntil: string | null;
  role: string;
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

  const bySid = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { paid_until: string | null; role: string | null }])
  );

  return (list?.users ?? [])
    .map((u) => {
      const p = bySid.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "(no email)",
        createdAt: u.created_at ?? null,
        lastSignIn: u.last_sign_in_at ?? null,
        paidUntil: p?.paid_until ?? null,
        role: p?.role ?? "user",
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export default async function AdminPage() {
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

  const users = await loadUsers();
  const now = Date.now();
  const proCount = users.filter((u) => u.paidUntil && new Date(u.paidUntil).getTime() > now).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Admin — Users</h1>
      <p className="mt-2 text-sm text-slate-500">
        {users.length} account{users.length === 1 ? "" : "s"} · {proCount} with active Pro.
        Granting or revoking days takes effect immediately.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Last sign-in</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isPro = u.paidUntil ? new Date(u.paidUntil).getTime() > now : false;
              return (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{u.email}</span>
                    {u.role === "admin" && (
                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(u.lastSignIn)}</td>
                  <td className="px-4 py-3">
                    {isPro ? (
                      <span>
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Pro
                        </span>{" "}
                        <span className="text-xs text-slate-400">until {fmtDate(u.paidUntil)}</span>
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Free
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
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
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-red-600"
                          >
                            Revoke
                          </button>
                        </form>
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
        “+7d / +30d” adds days on top of any remaining access. “Revoke” ends Pro
        access now (you can re-grant anytime).
      </p>
    </div>
  );
}
