import Link from "next/link";
import { getUserTier } from "@/lib/tier";
import { paymongoConfigured, TRIAL_DAYS, ACCESS_DAYS } from "@/lib/paymongo";
import { startCheckout } from "./actions";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; canceled?: string }>;
}) {
  const { error, canceled } = await searchParams;
  const tier = await getUserTier();
  const configured = paymongoConfigured();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Trading Adviser Pro</h1>
      <p className="mt-2 text-slate-600">
        Unlock the personal tracking tools. Everything else stays free.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {canceled && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Payment canceled — no charge was made.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900">₱499</span>
          <span className="text-slate-500">/ {ACCESS_DAYS} days</span>
        </div>
        <p className="mt-1 text-sm text-emerald-700">
          New accounts start with a {TRIAL_DAYS}-day free trial. Pay anytime to add
          another {ACCESS_DAYS} days.
        </p>

        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          <li>✓ Trade Journal — log and review every trade</li>
          <li>✓ Portfolio — exposure and concentration warnings</li>
          <li>✓ Keep the free Dashboard, Asset Detail, and Trade Plan</li>
        </ul>

        <p className="mt-4 text-xs text-slate-400">
          Pay with GCash, GrabPay, Maya, or card.
        </p>

        {tier === "paid" ? (
          <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            You have Pro access right now — thank you! You can add more days anytime below.
          </p>
        ) : null}

        {configured ? (
          <form action={startCheckout} className="mt-4">
            <button className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              {tier === "paid" ? `Add ${ACCESS_DAYS} more days — ₱499` : "Get Pro — ₱499"}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-500">
            Payments aren’t connected yet. (PayMongo keys pending.)
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/" className="underline">
          Back to Dashboard
        </Link>
      </p>

      <p className="mt-6 text-xs text-slate-400">
        This is a decision-support tool, not financial advice. Access is granted in
        {" "}
        {ACCESS_DAYS}-day periods; it does not auto-renew.
      </p>
    </div>
  );
}
