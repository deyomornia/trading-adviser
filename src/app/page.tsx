import Link from "next/link";
import { Suspense } from "react";
import { dataProvider } from "@/lib/data-providers";
import { getWatchlistSymbols } from "@/lib/watchlist";
import { getTradingStyle } from "@/lib/tradingStyle";
import { getScoringSelection } from "@/lib/scoringProfile";
import { DEFAULT_WATCHLIST } from "@/data/assetCatalog";
import AssetTable from "@/components/AssetTable";
import TradingStyleSelector from "@/components/TradingStyleSelector";
import ProfilePicker from "@/components/ProfilePicker";
import TopOpportunities from "@/components/TopOpportunities";

export default async function DashboardPage() {
  // Show the user's chosen watchlist (or a starter set if they have none / are
  // logged out), scored on the timeframe for their trading style with their
  // chosen indicator combination.
  const [chosen, style] = await Promise.all([getWatchlistSymbols(), getTradingStyle()]);
  const { profile, extraSlot, isPro } = await getScoringSelection(style);
  const symbols = chosen.length ? chosen : DEFAULT_WATCHLIST;
  const assets = await dataProvider.getAssets(symbols, style, profile);
  const crypto = assets.filter((a) => a.type === "crypto");
  const commodities = assets.filter((a) => a.type === "commodity");

  const anyLive = assets.some((a) => !a.isSample);
  const anySample = assets.some((a) => a.isSample);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-ink-300">
            Your watchlist of crypto and commodity assets, with a 0–100 signal
            score for each.
          </p>
        </div>
        <Link
          href="/watchlist"
          className="rounded-md border border-slate-300 dark:border-ink-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-ink-100/90 hover:bg-slate-50 dark:hover:bg-ink-800"
        >
          Edit watchlist
        </Link>
      </div>

      {/* Trading style — changes the timeframe signals are based on */}
      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Trading style
        </span>
        <TradingStyleSelector current={style} />
      </div>

      {/* Indicator combination — changes the recipe the scores are built from */}
      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Indicator combination
        </span>
        <ProfilePicker style={style} current={profile} extraSlot={extraSlot} isPro={isPro} />
      </div>

      {/* Honest data-source banner: reflects the live/sample mix. */}
      {anyLive && anySample ? (
        <div className="mt-6 rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>Mixed data.</strong> Items marked <span className="font-semibold text-emerald-700 dark:text-emerald-300">LIVE</span>{" "}
          are real market prices, updated every ~5 minutes (commodities up to
          ~15); items marked <span className="font-semibold">SAMPLE</span> are
          still placeholders until their live feed is connected.
        </div>
      ) : anySample ? (
        <div className="mt-6 rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>Showing SAMPLE data.</strong> These are placeholder numbers for
          building the app, not live market prices.
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          <strong>Showing LIVE market data.</strong> Prices update every ~5
          minutes (commodities up to ~15) — not a tick-by-tick feed. This is
          decision-support only — not financial advice.
        </div>
      )}

      {assets.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-8 text-center text-sm text-slate-400 dark:text-ink-300/70">
          Your watchlist is empty.{" "}
          <Link href="/watchlist" className="font-medium text-slate-600 dark:text-ink-300 underline">
            Add some assets
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <div className="mt-8">
          {crypto.length > 0 && <AssetTable title="Crypto" assets={crypto} />}
          {commodities.length > 0 && <AssetTable title="Commodities" assets={commodities} />}
        </div>
      )}

      {/* Top Opportunities — scans the whole catalog for this style; streams in */}
      <Suspense
        fallback={
          <p className="mt-10 text-sm text-slate-400 dark:text-ink-300/70">Scanning the market for top opportunities…</p>
        }
      >
        <TopOpportunities style={style} profile={profile} watchlist={chosen} />
      </Suspense>
    </div>
  );
}
