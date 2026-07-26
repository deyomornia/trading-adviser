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
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Top opportunities — {STYLE_CONFIG[style].label} style
      </h2>
      <p className="mb-3 max-w-2xl text-xs text-slate-400">
        The highest signal scores across every asset we track right now, using{" "}
        {STYLE_CONFIG[style].bars.toLowerCase()}. A high score means more signals
        line up at the moment — it is not a prediction or a guarantee. Only assets
        with live data are ranked.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Asset</th>
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
                <tr key={a.symbol} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 tabular-nums text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/assets/${a.symbol}`} className="group">
                      <span className="font-medium text-slate-900 group-hover:underline">
                        {a.name}
                      </span>{" "}
                      <span className="text-slate-400">{a.symbol}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {a.signal ? (
                      <SignalInfo signal={a.signal} score={a.score} detail={a.detail} />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {a.score}
                    </span>
                    <span className="text-xs text-slate-400">/100</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {formatPrice(a.price, a.currency)}
                  </td>
                  <td
                    className={
                      "px-4 py-3 text-right tabular-nums " +
                      (up ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {up ? "+" : ""}
                    {a.dailyChangePct.toFixed(1)}%
                  </td>
                  {user && (
                    <td className="px-4 py-3 text-right">
                      {watching.has(a.symbol) ? (
                        <span className="text-xs text-slate-400">✓ Watching</span>
                      ) : (
                        <form action={addToWatchlist}>
                          <input type="hidden" name="symbol" value={a.symbol} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
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
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="text-sm font-medium text-slate-900">
            {assets.length - FREE_ROWS} more opportunities ranked for you
          </p>
          <p className="mt-1 text-xs text-slate-500">
            See the full top {SCREENER_LIMIT} for your trading style with Pro.
          </p>
          <Link
            href="/upgrade"
            className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Unlock all {SCREENER_LIMIT} — 7-day free trial
          </Link>
        </div>
      )}
    </section>
  );
}
