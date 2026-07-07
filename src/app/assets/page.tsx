import Link from "next/link";
import { mockProvider } from "@/lib/data-providers/mock";
import type { Asset, SignalVerdict } from "@/types";

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

function signalColor(signal?: SignalVerdict) {
  return signal === "Buy Candidate"
    ? "bg-green-100 text-green-800"
    : signal === "Avoid"
    ? "bg-red-100 text-red-800"
    : "bg-amber-100 text-amber-800";
}

function AssetCard({ asset }: { asset: Asset }) {
  const up = asset.dailyChangePct >= 0;
  return (
    <Link
      href={`/assets/${asset.symbol}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-slate-900">{asset.name}</div>
          <div className="text-sm text-slate-400">{asset.symbol}</div>
        </div>
        {asset.signal && (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${signalColor(asset.signal)}`}>
            {asset.signal}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="tabular-nums text-slate-900">
            {formatPrice(asset.price, asset.currency)}
          </div>
          <div className={`text-sm ${up ? "text-emerald-600" : "text-red-600"}`}>
            {up ? "+" : ""}
            {asset.dailyChangePct.toFixed(1)}% today
          </div>
        </div>
        {asset.score !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-slate-900">{asset.score}</div>
            <div className="text-xs text-slate-400">score</div>
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function AssetIndexPage() {
  const assets = await mockProvider.getAssets();
  const crypto = assets.filter((a) => a.type === "crypto");
  const commodities = assets.filter((a) => a.type === "commodity");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Asset Detail</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Pick an asset to study its price chart, signal score, and a plain-English
        explanation of why it scored the way it did.
      </p>

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Showing SAMPLE data.</strong> Placeholder prices and history for
        building the app, not live market data.
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Crypto
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {crypto.map((a) => (
          <AssetCard key={a.symbol} asset={a} />
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Commodities
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {commodities.map((a) => (
          <AssetCard key={a.symbol} asset={a} />
        ))}
      </div>
    </div>
  );
}
