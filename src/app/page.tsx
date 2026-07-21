import Link from "next/link";
import { dataProvider } from "@/lib/data-providers";
import { getWatchlistSymbols } from "@/lib/watchlist";
import { getTradingStyle } from "@/lib/tradingStyle";
import { DEFAULT_WATCHLIST } from "@/data/assetCatalog";
import AssetTable from "@/components/AssetTable";
import TradingStyleSelector from "@/components/TradingStyleSelector";

export default async function DashboardPage() {
  // Show the user's chosen watchlist (or a starter set if they have none / are
  // logged out), scored on the timeframe for their trading style.
  const [chosen, style] = await Promise.all([getWatchlistSymbols(), getTradingStyle()]);
  const symbols = chosen.length ? chosen : DEFAULT_WATCHLIST;
  const assets = await dataProvider.getAssets(symbols, style);
  const crypto = assets.filter((a) => a.type === "crypto");
  const commodities = assets.filter((a) => a.type === "commodity");

  const anyLive = assets.some((a) => !a.isSample);
  const anySample = assets.some((a) => a.isSample);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Your watchlist of crypto and commodity assets, with a 0–100 signal
            score for each.
          </p>
        </div>
        <Link
          href="/watchlist"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit watchlist
        </Link>
      </div>

      {/* Trading style — changes the timeframe signals are based on */}
      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Trading style
        </span>
        <TradingStyleSelector current={style} />
      </div>

      {/* Honest data-source banner: reflects the live/sample mix. */}
      {anyLive && anySample ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Mixed data.</strong> Items marked <span className="font-semibold text-emerald-700">LIVE</span>{" "}
          are real market prices; items marked <span className="font-semibold">SAMPLE</span> are still
          placeholders until their live feed is connected.
        </div>
      ) : anySample ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Showing SAMPLE data.</strong> These are placeholder numbers for
          building the app, not live market prices.
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong>Showing LIVE market data.</strong> Prices refresh periodically.
          This is decision-support only — not financial advice.
        </div>
      )}

      {assets.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Your watchlist is empty.{" "}
          <Link href="/watchlist" className="font-medium text-slate-600 underline">
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
    </div>
  );
}
