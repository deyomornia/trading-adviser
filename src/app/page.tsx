import { mockProvider } from "@/lib/data-providers/mock";
import AssetTable from "@/components/AssetTable";

export default async function DashboardPage() {
  // Pull assets from the data provider (mock/sample for now, real feeds later).
  const assets = await mockProvider.getAssets();
  const crypto = assets.filter((a) => a.type === "crypto");
  const commodities = assets.filter((a) => a.type === "commodity");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Your watchlist of crypto and commodity assets. The on-demand screener
        that ranks the top candidates is added in a later step.
      </p>

      {/* Clear, honest SAMPLE warning */}
      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Showing SAMPLE data.</strong> These are placeholder numbers for
        building the app, not live market prices.
      </div>

      <div className="mt-8">
        <AssetTable title="Crypto" assets={crypto} />
        <AssetTable title="Commodities" assets={commodities} />
      </div>
    </div>
  );
}
