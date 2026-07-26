import Link from "next/link";
import { dataProvider } from "@/lib/data-providers";
import { getWatchlistSymbols } from "@/lib/watchlist";
import { getTradingStyle } from "@/lib/tradingStyle";
import { DEFAULT_WATCHLIST } from "@/data/assetCatalog";
import TradingStyleSelector from "@/components/TradingStyleSelector";
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
    ? "bg-green-100 dark:bg-emerald-500/15 text-green-800 dark:text-emerald-300"
    : signal === "Avoid"
    ? "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300"
    : "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300";
}

function AssetCard({ asset }: { asset: Asset }) {
  const up = asset.dailyChangePct >= 0;
  return (
    <Link
      href={`/assets/${asset.symbol}`}
      className="block rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4 transition-colors hover:border-slate-400 dark:hover:border-accent"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-slate-900 dark:text-ink-100">{asset.name}</div>
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-ink-300/70">
            {asset.symbol}
            {asset.isSample ? (
              <span className="rounded bg-amber-100 dark:bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                SAMPLE
              </span>
            ) : (
              <span className="rounded bg-emerald-100 dark:bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                LIVE
              </span>
            )}
          </div>
        </div>
        {asset.signal && (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${signalColor(asset.signal)}`}>
            {asset.signal}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-mono tabular-nums text-slate-900 dark:text-ink-100">
            {formatPrice(asset.price, asset.currency)}
          </div>
          <div className={`text-sm ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {up ? "+" : ""}
            {asset.dailyChangePct.toFixed(1)}% today
          </div>
        </div>
        {asset.score !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-ink-100">{asset.score}</div>
            <div className="text-xs text-slate-400 dark:text-ink-300/70">score</div>
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function AssetIndexPage() {
  const [chosen, style] = await Promise.all([getWatchlistSymbols(), getTradingStyle()]);
  const symbols = chosen.length ? chosen : DEFAULT_WATCHLIST;
  const assets = await dataProvider.getAssets(symbols, style);
  const crypto = assets.filter((a) => a.type === "crypto");
  const commodities = assets.filter((a) => a.type === "commodity");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Asset Detail</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-ink-300">
            Pick an asset to study its price chart, signal score, and a
            plain-English explanation of why it scored the way it did.
          </p>
        </div>
        <Link
          href="/watchlist"
          className="rounded-md border border-slate-300 dark:border-ink-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-ink-100/90 hover:bg-slate-50 dark:hover:bg-ink-800"
        >
          Edit watchlist
        </Link>
      </div>

      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Trading style
        </span>
        <TradingStyleSelector current={style} />
      </div>

      {crypto.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
            Crypto
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crypto.map((a) => (
              <AssetCard key={a.symbol} asset={a} />
            ))}
          </div>
        </>
      )}

      {commodities.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
            Commodities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {commodities.map((a) => (
              <AssetCard key={a.symbol} asset={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
