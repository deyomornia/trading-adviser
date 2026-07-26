import Link from "next/link";
import { getTrades } from "@/lib/journal";
import { getUserTier } from "@/lib/tier";
import { canAccess } from "@/lib/access";
import { summarizePortfolio, type AssetClass } from "@/lib/portfolio";
import { sampleAssets } from "@/data/sampleAssets";
import UpgradePrompt from "@/components/UpgradePrompt";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

const CLASS_LABEL: Record<AssetClass, string> = {
  crypto: "Crypto",
  commodity: "Commodities",
  other: "Other",
};

// Look up an asset's class from the sample list; unknown symbols are "other".
const TYPE_BY_SYMBOL = new Map(sampleAssets.map((a) => [a.symbol, a.type]));
function typeOf(symbol: string): AssetClass {
  return TYPE_BY_SYMBOL.get(symbol) ?? "other";
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-ink-300">{label}</div>
      <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-ink-100">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400 dark:text-ink-300/70">{hint}</div>}
    </div>
  );
}

export default async function PortfolioPage() {
  const tier = await getUserTier();

  const header = (
    <>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Portfolio</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-ink-300">
        Your overall exposure from open trades, your total risk if every stop-loss
        is hit, and warnings when you are too concentrated in one position.
      </p>
    </>
  );

  // Paid feature: free users see an upgrade prompt instead of the portfolio.
  if (!canAccess(tier, "portfolio")) {
    return (
      <div>
        {header}
        <UpgradePrompt feature="The Portfolio view" />
      </div>
    );
  }

  const trades = await getTrades();
  const openTrades = trades.filter((t) => t.status === "open");
  const summary = summarizePortfolio(openTrades, typeOf);

  return (
    <div>
      {header}

      {openTrades.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-8 text-center text-sm text-slate-400 dark:text-ink-300/70">
          No open trades yet. Log a trade in the{" "}
          <Link href="/journal" className="font-medium text-slate-600 dark:text-ink-300 underline">
            Trade Journal
          </Link>{" "}
          and it will show up here.
        </p>
      ) : (
        <>
          {/* Headline numbers */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Open positions" value={String(openTrades.length)} />
            <StatCard
              label="Total exposure"
              value={fmt(summary.totalExposure)}
              hint="money committed across open trades"
            />
            <StatCard
              label="Total risk"
              value={fmt(summary.totalRisk)}
              hint="loss if every stop-loss is hit"
            />
          </div>

          {/* Concentration warnings */}
          {summary.warnings.length > 0 && (
            <div className="mt-6 space-y-2">
              {summary.warnings.map((w, i) => (
                <div
                  key={i}
                  className="rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
                >
                  ⚠️ {w}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Exposure by class */}
            <section className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
                Exposure by asset class
              </h2>
              <div className="space-y-3">
                {summary.byClass.map((c) => (
                  <div key={c.type}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-ink-100/90">{CLASS_LABEL[c.type]}</span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-ink-300">
                        {fmt(c.exposure)} · {c.pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
                      <div className="h-full rounded-full bg-slate-800 dark:bg-accent" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Positions */}
            <section className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
                Positions
              </h2>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-ink-300">
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 text-right font-medium">Exposure</th>
                    <th className="pb-2 text-right font-medium">Share</th>
                    <th className="pb-2 text-right font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.positions.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-ink-700/60">
                      <td className="py-2 font-medium text-slate-900 dark:text-ink-100">{p.symbol}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-700 dark:text-ink-100/90">
                        {p.exposure > 0 ? fmt(p.exposure) : "—"}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-500 dark:text-ink-300">
                        {p.exposurePct}%
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-700 dark:text-ink-100/90">
                        {p.risk != null ? fmt(p.risk) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <p className="mt-3 text-xs text-slate-400 dark:text-ink-300/70">
                “—” means no position size or stop-loss was recorded for that trade.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
