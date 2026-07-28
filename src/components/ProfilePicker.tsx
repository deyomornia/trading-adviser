// Indicator-combination picker. Sits below the trading-style selector; lists
// only the active style's profiles (Classic first). Each unlocked option is a
// tiny form that saves the choice to a cookie (server action) and refreshes.
// Free accounts: Classic + ONE extra pick per style — the rest link to /upgrade.

import Link from "next/link";
import { setScoringProfile } from "@/app/actions/scoringProfile";
import { profilesForStyle, type ScoringProfile, type EvidenceTier } from "@/lib/signal-engine";
import type { TradingStyle } from "@/lib/tradingStyle";

const EVIDENCE_BADGE: Record<EvidenceTier, { label: string; className: string }> = {
  "research-backed": {
    label: "Research-backed",
    className:
      "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  "practitioner-tested": {
    label: "Practitioner-tested",
    className: "bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-ink-300",
  },
};

export default function ProfilePicker({
  style,
  current,
  extraSlot,
  isPro,
}: {
  style: TradingStyle;
  current: ScoringProfile;
  extraSlot: string | undefined;
  isPro: boolean;
}) {
  const offered = profilesForStyle(style);
  const badge = EVIDENCE_BADGE[current.evidenceTier];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {offered.map((p) => {
          const active = p.id === current.id;
          const locked =
            !isPro && p.id !== "classic" && extraSlot !== undefined && extraSlot !== p.id;

          if (locked) {
            return (
              <Link
                key={p.id}
                href="/upgrade"
                title={`${p.description} — free accounts include Classic plus one extra combination per style; Pro unlocks all of them.`}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 dark:border-ink-700 px-3 py-1.5 text-sm text-slate-400 dark:text-ink-300/60 hover:border-slate-400 dark:hover:border-accent"
              >
                {p.name}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Pro
                </span>
              </Link>
            );
          }

          return (
            <form key={p.id} action={setScoringProfile}>
              <input type="hidden" name="style" value={style} />
              <input type="hidden" name="profileId" value={p.id} />
              <button
                type="submit"
                title={p.description}
                className={
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "border-slate-900 dark:border-accent bg-slate-900 dark:bg-accent text-white dark:text-ink-950"
                    : "border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 text-slate-600 dark:text-ink-300 hover:bg-slate-100 dark:hover:bg-ink-800")
                }
              >
                {p.name}
              </button>
            </form>
          );
        })}
      </div>

      {/* Explanation card for the selected combination */}
      <div className="mt-3 max-w-2xl rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-ink-100">
            {current.name}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
            {badge.label}
          </span>
          <span className="text-xs text-slate-400 dark:text-ink-300/70">{current.timeframe}</span>
        </div>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-ink-300">{current.description}</p>
        {current.logicNote && (
          <p className="mt-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            {current.logicNote}
          </p>
        )}
        <p className="mt-1.5 text-xs text-slate-400 dark:text-ink-300/70">
          {current.evidenceNote}{" "}
          <Link href="/methodology" title="The full rules behind every combination" className="underline">
            Full rules →
          </Link>
        </p>
        {!isPro && (
          <p className="mt-2 border-t border-slate-100 dark:border-ink-700/60 pt-2 text-xs text-slate-400 dark:text-ink-300/70">
            Free includes Classic plus <strong>one</strong> extra combination of your
            choice per trading style
            {extraSlot ? " (your pick is saved)" : " — your first pick fills the slot"}
            .{" "}
            <Link href="/upgrade" className="underline">
              Pro unlocks all of them →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
