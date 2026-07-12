import Link from "next/link";
import { TRIAL_DAYS } from "@/lib/stripe";

// Shown in place of a paid feature when a free user opens it.
export default function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="mx-auto mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
      <div className="text-sm font-medium uppercase tracking-wide text-slate-400">
        Pro feature
      </div>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">
        {feature} is part of Trading Adviser Pro
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Unlock the {feature.toLowerCase()} and all personal tracking tools.
        Start with a {TRIAL_DAYS}-day free trial — cancel anytime.
      </p>
      <Link
        href="/upgrade"
        className="mt-5 inline-block rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Start {TRIAL_DAYS}-day free trial
      </Link>
      <p className="mt-3 text-xs text-slate-400">₱499 / month after the trial</p>
    </div>
  );
}
