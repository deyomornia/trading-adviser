import { dataProvider } from "@/lib/data-providers";
import AssetTable from "@/components/AssetTable";

export default async function DashboardPage() {
  // Pull assets from the data provider (live crypto + commodities, with
  // per-asset fallback to clearly-labelled sample data).
  const assets = await dataProvider.getAssets();
  const crypto = assets.filter((a) => a.type === "crypto");
  const commodities = assets.filter((a) => a.type === "commodity");

  const anyLive = assets.some((a) => !a.isSample);
  const anySample = assets.some((a) => a.isSample);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Your watchlist of crypto and commodity assets. The on-demand screener
        that ranks the top candidates is added in a later step.
      </p>

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

      <div className="mt-8">
        <AssetTable title="Crypto" assets={crypto} />
        <AssetTable title="Commodities" assets={commodities} />
      </div>
    </div>
  );
}
