// "Top Opportunities" — the highest-scoring live assets for the selected
// trading style. Async server component: render inside <Suspense> so the
// catalog scan streams in without blocking the dashboard.
//
// Teaser gating: free (and logged-out) users see the top 3 with an unlock
// card; Pro sees the full list.

import Link from "next/link";
import { getTopOpportunities, SCREENER_LIMIT } from "@/lib/screener";
import { getUserTier } from "@/lib/tier";
import { canAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { addToWatchlist } from "@/app/watchlist/actions";
import { STYLE_CONFIG, type TradingStyle } from "@/lib/tradingStyle";
import SignalInfo from "@/components/SignalInfo";
import Sparkline from "@/components/Sparkline";

const FREE_ROWS = 3;

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: price < 1 ? 6 : 2,
  }).format(price);
}

export default async function TopOpportunities({
  style,
  watchlist,
}: {
  style: TradingStyle;
  watchlist: string[];
}) {
  const [assets, tier, supabase] = await Promise.all([
    getTopOpportunities(style),
    getUserTier(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nothing scored live (e.g. offline/mock mode) — hide the section honestly.
  if (assets.length === 0) return null;

  const fullAccess = canAccess(tier, "screener-full");
  const shown = fullAccess ? assets : assets.slice(0, FREE_ROWS);
  const watching = new Set(watchlist);

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
        Top opportunities — {STYLE_CONFIG[style].label} style
      </h2>
      <p className="mb-3 max-w-2xl text-xs text-slate-400 dark:text-ink-300/70">
        The highest signal scores across every asset we track right now, using{" "}
        {STYLE_CONFIG[style].bars.toLowerCase()}. A high score means more signals
        line up at the moment — it is not a prediction or a guarantee. Only assets
        with live data are ranked.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-ink-700 text-left text-slate-500 dark:text-ink-300">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Trend</th>
              <th className="px-4 py-2 font-medium">Signal</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">24h</th>
              {user && <th className="px-4 py-2 text-right font-medium">Watch</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((a, i) => {
              const up = a.dailyChangePct >= 0;
              return (
                <tr key={a.symbol} className="border-b border-slate-100 dark:border-ink-700/60 last:border-0">
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-400 dark:text-ink-300/70">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/assets/${a.symbol}`} className="group">
                      <span className="font-medium text-slate-900 dark:text-ink-100 group-hover:underline">
                        {a.name}
                      </span>{" "}
                      <span className="text-slate-400 dark:text-ink-300/70">{a.symbol}</span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {a.spark ? <Sparkline points={a.spark} /> : null}
                  </td>
                  <td className="px-4 py-3">
                    {a.signal ? (
                      <SignalInfo signal={a.signal} score={a.score} detail={a.detail} />
                    ) : (
                      <span className="text-slate-300 dark:text-ink-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-ink-100">
                      {a.score}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-ink-300/70">/100</span>
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
                  {user && (
                    <td className="px-4 py-3 text-right">
                      {watching.has(a.symbol) ? (
                        <span className="text-xs text-slate-400 dark:text-ink-300/70">✓ Watching</span>
                      ) : (
                        <form action={addToWatchlist}>
                          <input type="hidden" name="symbol" value={a.symbol} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 dark:border-ink-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-ink-300 hover:bg-slate-50 dark:hover:bg-ink-800"
                          >
                            + Watch
                          </button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!fullAccess && assets.length > FREE_ROWS && (
        <div className="mt-3 rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4 text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-ink-100">
            {assets.length - FREE_ROWS} more opportunities ranked for you
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-ink-300">
            See the full top {SCREENER_LIMIT} for your trading style with Pro.
          </p>
          <Link
            href="/upgrade"
            className="mt-3 inline-block rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
          >
            Unlock all {SCREENER_LIMIT} — 7-day free trial
          </Link>
        </div>
      )}
    </section>
  );
}
