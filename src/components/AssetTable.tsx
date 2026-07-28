import Link from "next/link";
import type { Asset } from "@/types";
import SignalInfo from "@/components/SignalInfo";
import Sparkline from "@/components/Sparkline";

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 65
      ? "bg-green-100 dark:bg-emerald-500/15 text-green-800 dark:text-emerald-300"
      : score >= 40
      ? "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300"
      : "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold font-mono tabular-nums ${color}`}>
      {score}
    </span>
  );
}

export default function AssetTable({
  title,
  assets,
}: {
  title: string;
  assets: Asset[];
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-ink-700 text-left text-slate-500 dark:text-ink-300">
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Trend</th>
              <th className="px-4 py-2 font-medium">Signal</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Type</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">24h</th>
              <th className="px-4 py-2 text-right font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const up = a.dailyChangePct >= 0;
              return (
                <tr
                  key={a.symbol}
                  className="border-b border-slate-100 dark:border-ink-700/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link href={`/assets/${a.symbol}`} title={`Open ${a.name} — chart, score breakdown, and AI take`} className="group">
                      <span className="font-medium text-slate-900 dark:text-ink-100 group-hover:underline">
                        {a.name}
                      </span>{" "}
                      <span className="text-slate-400 dark:text-ink-300/70">{a.symbol}</span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell" title="Recent price trend">
                    {a.spark ? (
                      <Sparkline points={a.spark} />
                    ) : (
                      <span className="text-slate-300 dark:text-ink-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.signal ? (
                      <SignalInfo signal={a.signal} score={a.score} detail={a.detail} />
                    ) : a.unavailableReason ? (
                      <span
                        title={a.unavailableReason}
                        className="cursor-help rounded bg-slate-100 dark:bg-ink-800 px-2 py-0.5 text-xs text-slate-500 dark:text-ink-300"
                      >
                        n/a ⓘ
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-ink-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.score !== undefined ? (
                      <ScoreBadge score={a.score} />
                    ) : (
                      <span className="text-slate-300 dark:text-ink-700">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 capitalize text-slate-600 dark:text-ink-300 md:table-cell">
                    {a.type}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-ink-100">
                    {formatPrice(a.price, a.currency)}
                  </td>
                  <td
                    className={
                      "px-4 py-3 text-right font-mono tabular-nums " +
                      (up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
                    }
                  >
                    {up ? "+" : ""}
                    {a.dailyChangePct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.isSample ? (
                      <span title="Placeholder data — not live market prices" className="rounded bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        SAMPLE
                      </span>
                    ) : (
                      <span title="Real market data — updates every ~5 min (commodities up to ~15 min)" className="rounded bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        LIVE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
