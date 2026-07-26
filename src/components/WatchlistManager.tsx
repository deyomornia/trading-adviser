"use client";

import { useState } from "react";
import { addToWatchlist, removeFromWatchlist } from "@/app/watchlist/actions";

export interface CatalogRow {
  symbol: string;
  name: string;
  type: "crypto" | "commodity";
  source: "binance" | "twelvedata" | "sample";
}

export default function WatchlistManager({
  catalog,
  selected,
}: {
  catalog: CatalogRow[];
  selected: string[];
}) {
  const [q, setQ] = useState("");
  const sel = new Set(selected);

  const query = q.trim().toLowerCase();
  const filtered = query
    ? catalog.filter(
        (a) =>
          a.symbol.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query)
      )
    : catalog;

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search coins or commodities…"
        className="w-full rounded-md border border-slate-300 dark:border-ink-700 px-3 py-2 text-sm focus:border-slate-500 dark:focus:border-accent focus:outline-none"
      />

      <p className="mt-2 text-xs text-slate-400 dark:text-ink-300/70">
        {selected.length} on your dashboard · {catalog.length} available
      </p>

      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950">
        {filtered.map((a) => {
          const isOn = sel.has(a.symbol);
          const action = isOn ? removeFromWatchlist : addToWatchlist;
          return (
            <div key={a.symbol} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium text-slate-900 dark:text-ink-100">{a.name}</span>{" "}
                <span className="text-slate-400 dark:text-ink-300/70">{a.symbol}</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs capitalize text-slate-500 dark:text-ink-300">{a.type}</span>
                  {/* Describe the feed's capability, not a claim of live data —
                      the actual LIVE/SAMPLE status is shown on the dashboard. */}
                  {a.source === "sample" ? (
                    <span className="rounded bg-amber-100 dark:bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      Sample only
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 dark:bg-ink-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-ink-300">
                      Live feed
                    </span>
                  )}
                </div>
              </div>

              <form action={action}>
                <input type="hidden" name="symbol" value={a.symbol} />
                <button
                  type="submit"
                  className={
                    isOn
                      ? "rounded-md border border-slate-300 dark:border-ink-700 px-3 py-1.5 text-sm text-slate-600 dark:text-ink-300 hover:bg-slate-50 dark:hover:bg-ink-800"
                      : "rounded-md bg-slate-900 dark:bg-accent px-3 py-1.5 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
                  }
                >
                  {isOn ? "Remove" : "Add"}
                </button>
              </form>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-ink-300/70">
            No matches for “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}
