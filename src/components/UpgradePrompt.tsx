import Link from "next/link";
import { TRIAL_DAYS } from "@/lib/paymongo";

// Shown in place of a paid feature when a free user opens it.
export default function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="mx-auto mt-6 max-w-md rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-8 text-center">
      <div className="text-sm font-medium uppercase tracking-wide text-slate-400 dark:text-ink-300/70">
        Pro feature
      </div>
      <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-ink-100">
        {feature} is part of DG Trading Adviser Pro
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-ink-300">
        Unlock the {feature.toLowerCase()} and all personal tracking tools.
        Start with a {TRIAL_DAYS}-day free trial — cancel anytime.
      </p>
      <Link
        href="/upgrade"
        title="See what Pro includes and start a 7-day free trial"
        className="mt-5 inline-block rounded-md bg-slate-900 dark:bg-accent px-5 py-2.5 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
      >
        See Pro — {TRIAL_DAYS}-day free trial
      </Link>
      <p className="mt-3 text-xs text-slate-400 dark:text-ink-300/70">
        ₱499 / 30 days · pay with GCash, GrabPay, Maya, or card
      </p>
    </div>
  );
}
