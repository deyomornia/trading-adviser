// Day / Swing / Position toggle. Each button is a tiny form that saves the
// choice to a cookie (server action) and refreshes the page.

import { setTradingStyle } from "@/app/actions/tradingStyle";
import { STYLES, STYLE_CONFIG, type TradingStyle } from "@/lib/tradingStyle";

export default function TradingStyleSelector({ current }: { current: TradingStyle }) {
  return (
    <div>
      <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
        {STYLES.map((s) => {
          const active = s === current;
          return (
            <form key={s} action={setTradingStyle}>
              <input type="hidden" name="style" value={s} />
              <button
                type="submit"
                className={
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100")
                }
              >
                {STYLE_CONFIG[s].label}
              </button>
            </form>
          );
        })}
      </div>
      {/* Explanation card for the currently selected style */}
      <div className="mt-3 max-w-md rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">
          {STYLE_CONFIG[current].label} trading
        </div>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-400">Holding time</dt>
            <dd className="text-slate-700">{STYLE_CONFIG[current].holding}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-400">Signals use</dt>
            <dd className="text-slate-700">{STYLE_CONFIG[current].bars}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-400">Best for</dt>
            <dd className="text-slate-700">{STYLE_CONFIG[current].who}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
