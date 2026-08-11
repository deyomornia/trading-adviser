import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { dataProvider } from "@/lib/data-providers";
import { scoreWithProfile, buildContext, type OverlaySeries } from "@/lib/signal-engine";
import { getTradingStyle, STYLE_CONFIG } from "@/lib/tradingStyle";
import { getScoringSelection } from "@/lib/scoringProfile";
import { setScoringProfile } from "@/app/actions/scoringProfile";
import { buildEntryPlan } from "@/lib/trade-setup";
import { getTradePrefs } from "@/lib/prefs";
import { getUserTier } from "@/lib/tier";
import { canAccess } from "@/lib/access";
import type { SignalVerdict } from "@/types";
import CandleChart from "@/components/CandleChart";
import AiSummary from "@/components/AiSummary";
import TradingStyleSelector from "@/components/TradingStyleSelector";
import ProfilePicker from "@/components/ProfilePicker";
import ScoreRing from "@/components/ScoreRing";
import TradeSetupCard from "@/components/TradeSetupCard";

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

function signalColor(signal: SignalVerdict) {
  return signal === "Buy Candidate"
    ? "bg-green-100 dark:bg-emerald-500/15 text-green-800 dark:text-emerald-300"
    : signal === "Avoid"
    ? "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300"
    : "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300";
}

function toneColor(tone: "good" | "neutral" | "bad") {
  return tone === "good"
    ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10"
    : tone === "bad"
    ? "border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10"
    : "border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-800/50";
}

// A single labelled bar in the score breakdown.
function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-ink-300">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
        <div className="h-full rounded-full bg-slate-800 dark:bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  const style = await getTradingStyle();
  const styleCfg = STYLE_CONFIG[style];
  const { profile, extraSlot, isPro } = await getScoringSelection(style);
  const [assets, candles] = await Promise.all([
    dataProvider.getAssets([sym], style, profile),
    dataProvider.getCandles(sym, style, profile),
  ]);
  const asset = assets.find((a) => a.symbol === sym);

  if (!asset || !candles) notFound();

  // Non-Classic combinations never score SAMPLE data (same rule as the tables).
  const outcome =
    asset.isSample && profile.id !== "classic"
      ? ({
          status: "unavailable",
          code: "sample-only",
          reason: `${profile.name} needs live market data — only SAMPLE data is available for ${asset.name} right now.`,
        } as const)
      : scoreWithProfile(candles, style, profile, { assetName: asset.name });
  const result = outcome.status === "scored" ? outcome.result : null;
  const reasons = result?.explanation ?? [];
  const up = asset.dailyChangePct >= 0;

  // Indicator lines for the chart, from the active combination.
  let overlays: OverlaySeries[] = [];
  if (result) {
    try {
      overlays = profile.overlays(buildContext(candles, style));
    } catch {
      overlays = []; // a chart without overlays beats a broken page
    }
  }

  // Suggested setup (Pro): rule-based levels from the user's own defaults.
  const [tier, prefs] = await Promise.all([getUserTier(), getTradePrefs()]);
  const isProSetup = canAccess(tier, "trade-setup");
  const entryPlan = result ? buildEntryPlan(candles, result, prefs) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/assets" className="text-sm text-slate-500 dark:text-ink-300 hover:underline">
            ← All assets
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-ink-100">
            {asset.name}
            <span className="text-lg font-normal text-slate-400 dark:text-ink-300/70">{asset.symbol}</span>
            {asset.isSample ? (
              <span className="rounded bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                SAMPLE
              </span>
            ) : (
              <span className="rounded bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                LIVE
              </span>
            )}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-ink-300">
            <span className="font-mono tabular-nums">{formatPrice(asset.price, asset.currency)}</span>{" "}
            <span className={up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
              {up ? "+" : ""}
              {asset.dailyChangePct.toFixed(1)}% today
            </span>
          </p>
        </div>

        {result && (
          <div className="flex flex-col items-end gap-2">
            <div className={`inline-block rounded px-3 py-1 text-sm font-medium ${signalColor(result.signal)}`}>
              {result.signal}
            </div>
            <ScoreRing score={result.score} />
          </div>
        )}
      </div>

      {/* Trading style — the whole page (chart, score, take) uses this timeframe */}
      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Trading style
        </span>
        <TradingStyleSelector current={style} />
      </div>

      {/* Indicator combination — the recipe behind this page's score */}
      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Indicator combination
        </span>
        <ProfilePicker style={style} current={profile} extraSlot={extraSlot} isPro={isPro} />
      </div>

      {/* Data-source reminder */}
      {asset.isSample ? (
        <div className="mt-6 rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>SAMPLE data.</strong> This chart and score use placeholder price
          history for building the app — not live market data.
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          <strong>LIVE data.</strong> Real market prices and history, updated
          every ~5 minutes (commodities up to ~15). This is decision-support
          only — not financial advice.
        </div>
      )}

      {/* When the chosen combination can't score this asset, say why — never guess */}
      {!result && (
        <div className="mt-6 rounded-md border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-800/50 px-4 py-3 text-sm text-slate-700 dark:text-ink-100/90">
          <strong>No score for this combination.</strong>{" "}
          {outcome.status === "unavailable" ? outcome.reason : ""}
          <form action={setScoringProfile} className="mt-2">
            <input type="hidden" name="style" value={style} />
            <input type="hidden" name="profileId" value="classic" />
            <button
              type="submit"
              title="Score this asset with the Classic combination instead"
              className="rounded-md border border-slate-300 dark:border-ink-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-ink-100/90 hover:bg-slate-100 dark:hover:bg-ink-800"
            >
              Switch to Classic for this style
            </button>
          </form>
        </div>
      )}

      {/* AI take — streams in without blocking the page; hidden if AI not set up */}
      {result && (
        <Suspense
          fallback={
            <p className="mt-6 text-sm text-slate-400 dark:text-ink-300/70">Generating AI take…</p>
          }
        >
          <AiSummary
            asset={asset}
            result={result}
            styleLabel={styleCfg.label}
            logicNote={profile.logicNote}
          />
        </Suspense>
      )}

      {/* Chart */}
      <section className="mt-6 rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
          Price — last {candles.length} {styleCfg.unit}
        </h2>
        <CandleChart candles={candles} intraday={styleCfg.intraday} overlays={overlays} />
      </section>

      {result && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Score breakdown — components come from the active scoring profile */}
          <section className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
              How the score is built
            </h2>
            <p className="mb-4 text-xs text-slate-400 dark:text-ink-300/70">
              Scored with: {result.profileName}{" "}
              <Link href="/methodology" title="The full rules behind every combination" className="underline">
                full rules →
              </Link>
            </p>
            <div className="space-y-3">
              {result.components.map((c) => (
                <ScoreBar key={c.key} label={c.name} value={c.points} max={c.maxPoints} />
              ))}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 dark:border-ink-700/60 pt-4 text-sm">
              {result.readings.map((r) => (
                <div key={r.label} className="contents">
                  <dt className="text-slate-500 dark:text-ink-300">{r.label}</dt>
                  <dd className="text-right font-mono tabular-nums text-slate-900 dark:text-ink-100">{r.value}</dd>
                </div>
              ))}
              <dt className="text-slate-500 dark:text-ink-300">Suggested stop</dt>
              <dd className="text-right font-mono tabular-nums text-slate-900 dark:text-ink-100">
                {formatPrice(result.stopSuggestion, asset.currency)}
              </dd>
            </dl>
          </section>

          {/* Plain-English explanation */}
          <section className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
              In plain English
            </h2>
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className={`rounded-md border px-3 py-2 text-sm ${toneColor(r.tone)}`}>
                  <span className="font-medium text-slate-900 dark:text-ink-100">{r.label}: </span>
                  <span className="text-slate-700 dark:text-ink-100/90">{r.text}</span>
                </li>
              ))}
            </ul>

            <Link
              href={`/trade-plan?symbol=${asset.symbol}&entry=${asset.price}`}
              className="mt-4 inline-block rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
            >
              Plan a trade for this →
            </Link>
          </section>
        </div>
      )}

      {/* Suggested trade setup (Pro; rule-based; Buy-Candidate gated) */}
      {entryPlan && (
        <TradeSetupCard
          asset={asset}
          setup={entryPlan.market}
          limits={entryPlan.limits}
          skippedLimits={entryPlan.skipped}
          prefs={prefs}
          isPro={isProSetup}
        />
      )}
    </div>
  );
}
