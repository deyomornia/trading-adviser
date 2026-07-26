import Link from "next/link";
import { assetCatalog } from "@/data/assetCatalog";
import { getWatchlistSymbols } from "@/lib/watchlist";
import WatchlistManager from "@/components/WatchlistManager";

export default async function WatchlistPage() {
  const selected = await getWatchlistSymbols();
  const catalog = assetCatalog.map(({ symbol, name, type, source }) => ({
    symbol,
    name,
    type,
    source,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Edit watchlist</h1>
      <p className="mt-2 text-slate-600 dark:text-ink-300">
        Choose which coins and commodities appear on your{" "}
        <Link href="/" className="underline">
          Dashboard
        </Link>
        . Search below and add the ones you want to follow.
      </p>

      <div className="mt-6">
        <WatchlistManager catalog={catalog} selected={selected} />
      </div>
    </div>
  );
}
