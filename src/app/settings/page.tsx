import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTradePrefs } from "@/lib/prefs";
import { saveTradePrefs } from "./actions";
import { signOut } from "@/app/auth/actions";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500";
const labelClass = "block text-sm font-medium text-slate-700";

export default async function SettingsPage() {
  const prefs = await getTradePrefs();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("paid_until").eq("id", user.id).single()
    : { data: null };

  const paidUntil = profile?.paid_until ?? null;
  const isPro = paidUntil ? new Date(paidUntil) > new Date() : false;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      {/* Trade Plan defaults */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Trade Plan defaults
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          These pre-fill the Trade Plan calculator each time.
        </p>
        <form action={saveTradePrefs} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Account size</label>
            <input name="accountSize" type="number" defaultValue={prefs.accountSize} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Risk per trade (%)</label>
            <input name="riskPercent" type="number" step="any" defaultValue={prefs.riskPercent} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select name="currency" defaultValue={prefs.currency} className={inputClass}>
              <option value="₱">₱ Peso</option>
              <option value="$">$ Dollar</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save preferences
            </button>
          </div>
        </form>
      </section>

      {/* Account */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Plan</dt>
            <dd>
              {isPro ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Pro
                </span>
              ) : (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Free
                </span>
              )}
            </dd>
          </div>
          {isPro && paidUntil && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Pro access until</dt>
              <dd className="text-slate-900">{fmtDate(paidUntil)}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/upgrade"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {isPro ? "Add more days" : "Get Pro"}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
