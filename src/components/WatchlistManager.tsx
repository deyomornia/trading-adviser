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
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <p className="mt-2 text-xs text-slate-400">
        {selected.length} on your dashboard · {catalog.length} available
      </p>

      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {filtered.map((a) => {
          const isOn = sel.has(a.symbol);
          const action = isOn ? removeFromWatchlist : addToWatchlist;
          return (
            <div key={a.symbol} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium text-slate-900">{a.name}</span>{" "}
                <span className="text-slate-400">{a.symbol}</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs capitalize text-slate-500">{a.type}</span>
                  {a.source === "sample" ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      SAMPLE
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      LIVE
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
                      ? "rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                      : "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  }
                >
                  {isOn ? "Remove" : "Add"}
                </button>
              </form>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            No matches for “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}
