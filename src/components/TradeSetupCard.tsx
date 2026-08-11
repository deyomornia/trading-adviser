// "Suggested trade setup" card on Asset Detail (Pro, long-only).
// Rule-based EXAMPLE derived from the asset's data + the user's own risk
// defaults — clearly labeled, every level explained, never auto-traded.

import Link from "next/link";
import type { Asset } from "@/types";
import type { TradeSetup, NoSetup, LimitEntry, EntryPlan } from "@/lib/trade-setup";
import type { TradePrefs } from "@/lib/prefs";

function fmt(v: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: v < 1 ? 6 : 2,
  }).format(v);
}

function Row({
  label,
  value,
  note,
  tone,
  tooltip,
}: {
  label: string;
  value: string;
  note: string;
  tone: "stop" | "target" | "entry";
  tooltip: string;
}) {
  const valueColor =
    tone === "stop"
      ? "text-red-600 dark:text-red-400"
      : tone === "target"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-900 dark:text-ink-100";
  return (
    <div
      title={tooltip}
      className="flex items-center justify-between border-b border-slate-100 dark:border-ink-700/60 py-2 last:border-0"
    >
      <dt className="text-sm text-slate-500 dark:text-ink-300">{label}</dt>
      <dd className="text-right">
        <span className={`font-mono tabular-nums text-sm font-semibold ${valueColor}`}>{value}</span>{" "}
        <span className="text-xs text-slate-400 dark:text-ink-300/70">{note}</span>
      </dd>
    </div>
  );
}

export default function TradeSetupCard({
  asset,
  setup,
  limits = [],
  skippedLimits = [],
  prefs,
  isPro,
}: {
  asset: Asset;
  setup: TradeSetup | NoSetup;
  limits?: LimitEntry[];
  skippedLimits?: EntryPlan["skipped"];
  prefs: TradePrefs;
  isPro: boolean;
}) {
  // Free tier: compact upsell, no numbers.
  if (!isPro) {
    return (
      <section className="mt-6 rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-5 text-center">
        <div className="text-sm font-medium uppercase tracking-wide text-slate-400 dark:text-ink-300/70">
          Pro feature
        </div>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-ink-100">
          Suggested trade setup
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-ink-300">
          Entry, two stop-loss levels, and laddered targets — sized to your own
          risk settings, only when the signals support it.
        </p>
        <Link
          href="/upgrade"
          title="See what Pro includes and start a 7-day free trial"
          className="mt-4 inline-block rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
        >
          Unlock with Pro — 7-day free trial
        </Link>
      </section>
    );
  }

  // Pro but conditions not met: honest, muted explanation.
  if (!setup.eligible) {
    return (
      <section className="mt-6 rounded-lg border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-800/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Suggested trade setup
        </h2>
        {setup.reasons.map((r, i) => (
          <p key={i} className="mt-2 text-sm text-slate-600 dark:text-ink-300">
            {r}
          </p>
        ))}
      </section>
    );
  }

  const c = asset.currency;
  const s = setup;

  return (
    <section className="mt-6 rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Suggested trade setup
        </h2>
        <span
          title="Calculated by fixed rules from this asset's data and your saved risk settings — not personal advice"
          className="rounded bg-slate-100 dark:bg-ink-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-ink-300"
        >
          Rule-based — not a recommendation
        </span>
      </div>

      <dl className="mt-3">
        <Row
          label="Entry (reference)"
          value={fmt(s.entry, c)}
          note="latest price"
          tone="entry"
          tooltip="The latest price — your actual entry will differ; recheck before placing"
        />
        <Row
          label="Stop-loss 1 (tight)"
          value={fmt(s.sl1, c)}
          note={`${s.sl1Pct}% · 1× recent volatility`}
          tone="stop"
          tooltip="One average true range (ATR-14) below entry — a volatility-sized stop"
        />
        <Row
          label="Stop-loss 2 (wider)"
          value={fmt(s.sl2, c)}
          note={`${s.sl2Pct}% · ${s.sl2Basis === "swing-low" ? "recent swing low" : "2× volatility"}`}
          tone="stop"
          tooltip={
            s.sl2Basis === "swing-low"
              ? "The lowest low of the recent candles — a structural support level"
              : "Two average true ranges below entry — a wider volatility stop"
          }
        />
        <Row
          label="Target 1"
          value={fmt(s.tp1, c)}
          note={`+${s.tpPcts[0]}% · 1R`}
          tone="target"
          tooltip="One risk-distance above entry — many traders take partial profit here"
        />
        <Row
          label="Target 2"
          value={fmt(s.tp2, c)}
          note={`+${s.tpPcts[1]}% · 2R (2:1 reward-to-risk)`}
          tone="target"
          tooltip="Two risk-distances above entry — meets the app's 2:1 reward-to-risk rule"
        />
        <Row
          label="Target 3"
          value={fmt(s.tp3, c)}
          note={`+${s.tpPcts[2]}% · 3R`}
          tone="target"
          tooltip="Three risk-distances above entry — a stretch target if the trend runs"
        />
      </dl>

      <p className="mt-3 text-sm text-slate-600 dark:text-ink-300">
        Suggested size:{" "}
        <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-ink-100">
          {s.plan.positionSize?.toLocaleString(undefined, { maximumFractionDigits: 6 })} units
        </span>{" "}
        <span className="text-xs text-slate-400 dark:text-ink-300/70">
          (risking {prefs.riskPercent}% of {prefs.currency}
          {Number(prefs.accountSize).toLocaleString()} with Stop 1 —{" "}
          <Link href="/settings" className="underline" title="Change your default account size and risk %">
            change defaults
          </Link>
          )
        </span>
      </p>

      {/* Entry price plan — patient limit orders below the market price */}
      {(limits.length > 0 || skippedLimits.length > 0) && (
        <div className="mt-5 border-t border-slate-100 dark:border-ink-700/60 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
            Entry price plan — patient limit orders
          </h3>
          <p className="mt-1 text-xs text-slate-400 dark:text-ink-300/70">
            Instead of buying at the current price, these levels wait for a
            pullback. Stops, targets, and size are recomputed from each fill
            price using the same rules.
          </p>

          {limits.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-ink-700/60 text-left text-xs text-slate-400 dark:text-ink-300/70">
                    <th className="py-1.5 pr-3 font-medium">Limit order</th>
                    <th className="py-1.5 pr-3 font-medium">Entry</th>
                    <th className="py-1.5 pr-3 font-medium">Stop 1</th>
                    <th className="py-1.5 pr-3 font-medium">Target 1 (1R)</th>
                    <th className="py-1.5 pr-3 font-medium">Target 2 (2R)</th>
                    <th className="py-1.5 pr-3 font-medium">Target 3 (3R)</th>
                    <th className="py-1.5 pr-3 font-medium">Size</th>
                    <th className="py-1.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map((l) => (
                    <tr
                      key={l.key}
                      title={l.basis}
                      className="border-b border-slate-100 dark:border-ink-700/60 last:border-0"
                    >
                      <td className="py-2 pr-3 text-slate-600 dark:text-ink-300">
                        {l.label}
                        <span className="block text-[11px] text-slate-400 dark:text-ink-300/70">
                          −{l.belowMarketPct}% below market
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums font-semibold text-slate-900 dark:text-ink-100">
                        {fmt(l.entry, c)}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-red-600 dark:text-red-400">
                        {fmt(l.setup.sl1, c)}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmt(l.setup.tp1, c)}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmt(l.setup.tp2, c)}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmt(l.setup.tp3, c)}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-slate-700 dark:text-ink-100/90">
                        {l.setup.plan.positionSize?.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/trade-plan?symbol=${asset.symbol}&entry=${l.entry}&stop=${l.setup.sl1}&target=${l.setup.tp2}`}
                          title="Load this limit-entry setup into the Trade Plan calculator"
                          className="text-xs text-slate-500 dark:text-ink-300 underline hover:text-slate-900 dark:hover:text-ink-100"
                        >
                          plan →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {skippedLimits.map((sk, i) => (
            <p
              key={i}
              className="mt-2 rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300"
            >
              <strong>{sk.label}:</strong> {sk.reason}
            </p>
          ))}

          <p className="mt-2 text-xs leading-relaxed text-slate-400 dark:text-ink-300/70">
            A limit order only fills if price pulls back to it — if the move
            runs on without a dip, the order stays unfilled and the setup
            passes without you. If price falls below the stop level before
            your order fills, cancel it: the setup is invalidated.
          </p>
        </div>
      )}

      {s.plan.warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {s.plan.warnings.map((w, i) => (
            <li
              key={i}
              className="rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300"
            >
              {w}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/trade-plan?symbol=${asset.symbol}&entry=${s.entry}&stop=${s.sl1}&target=${s.tp2}`}
        title="Load these levels into the Trade Plan calculator to adjust and save"
        className="mt-4 inline-block rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
      >
        Open in Trade Plan →
      </Link>

      <p className="mt-3 text-xs leading-relaxed text-slate-400 dark:text-ink-300/70">
        This is a rule-based example (long setups only), not personal advice, and
        the formula has not been backtested. Prices update every ~5 minutes —
        recheck levels before placing any order. Markets involve risk.
      </p>
    </section>
  );
}
