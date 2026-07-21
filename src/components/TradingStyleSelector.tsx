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
      <p className="mt-1 text-xs text-slate-400">{STYLE_CONFIG[current].blurb}</p>
    </div>
  );
}
