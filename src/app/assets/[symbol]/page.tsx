import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { dataProvider } from "@/lib/data-providers";
import { scoreAsset, explainScore } from "@/lib/signal-engine";
import { getTradingStyle, STYLE_CONFIG } from "@/lib/tradingStyle";
import type { SignalVerdict } from "@/types";
import CandleChart from "@/components/CandleChart";
import AiSummary from "@/components/AiSummary";
import TradingStyleSelector from "@/components/TradingStyleSelector";

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

function signalColor(signal: SignalVerdict) {
  return signal === "Buy Candidate"
    ? "bg-green-100 text-green-800"
    : signal === "Avoid"
    ? "bg-red-100 text-red-800"
    : "bg-amber-100 text-amber-800";
}

function toneColor(tone: "good" | "neutral" | "bad") {
  return tone === "good"
    ? "border-emerald-200 bg-emerald-50"
    : tone === "bad"
    ? "border-red-200 bg-red-50"
    : "border-slate-200 bg-slate-50";
}

// A single labelled bar in the score breakdown.
function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-800" style={{ width: `${pct}%` }} />
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
  const [assets, candles] = await Promise.all([
    dataProvider.getAssets([sym], style),
    dataProvider.getCandles(sym, style),
  ]);
  const asset = assets.find((a) => a.symbol === sym);

  if (!asset || !candles) notFound();

  const result = scoreAsset(candles);
  const reasons = explainScore(result);
  const up = asset.dailyChangePct >= 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/assets" className="text-sm text-slate-500 hover:underline">
            ← All assets
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            {asset.name}
            <span className="text-lg font-normal text-slate-400">{asset.symbol}</span>
            {asset.isSample ? (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                SAMPLE
              </span>
            ) : (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                LIVE
              </span>
            )}
          </h1>
          <p className="mt-1 text-slate-600">
            <span className="tabular-nums">{formatPrice(asset.price, asset.currency)}</span>{" "}
            <span className={up ? "text-emerald-600" : "text-red-600"}>
              {up ? "+" : ""}
              {asset.dailyChangePct.toFixed(1)}% today
            </span>
          </p>
        </div>

        <div className="text-right">
          <div className={`inline-block rounded px-3 py-1 text-sm font-medium ${signalColor(result.signal)}`}>
            {result.signal}
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {result.score}
            <span className="text-base font-normal text-slate-400">/100</span>
          </div>
        </div>
      </div>

      {/* Trading style — the whole page (chart, score, take) uses this timeframe */}
      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Trading style
        </span>
        <TradingStyleSelector current={style} />
      </div>

      {/* Data-source reminder */}
      {asset.isSample ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>SAMPLE data.</strong> This chart and score use placeholder price
          history for building the app — not live market data.
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong>LIVE data.</strong> Real market prices and history. This is
          decision-support only — not financial advice.
        </div>
      )}

      {/* AI take — streams in without blocking the page; hidden if AI not set up */}
      <Suspense
        fallback={
          <p className="mt-6 text-sm text-slate-400">Generating AI take…</p>
        }
      >
        <AiSummary asset={asset} result={result} styleLabel={styleCfg.label} />
      </Suspense>

      {/* Chart */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Price — last {candles.length} {styleCfg.unit}
        </h2>
        <CandleChart candles={candles} intraday={styleCfg.intraday} />
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Score breakdown */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            How the score is built
          </h2>
          <div className="space-y-3">
            <ScoreBar label="Trend (EMA 20 vs 50)" value={result.breakdown.trend} max={35} />
            <ScoreBar label="Momentum (RSI)" value={result.breakdown.momentum} max={35} />
            <ScoreBar label="MACD" value={result.breakdown.macdScore} max={30} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm">
            <dt className="text-slate-500">RSI (14)</dt>
            <dd className="text-right tabular-nums text-slate-900">{result.indicators.rsi}</dd>
            <dt className="text-slate-500">EMA 20</dt>
            <dd className="text-right tabular-nums text-slate-900">{result.indicators.ema20}</dd>
            <dt className="text-slate-500">EMA 50</dt>
            <dd className="text-right tabular-nums text-slate-900">{result.indicators.ema50}</dd>
            <dt className="text-slate-500">EMA gap</dt>
            <dd className="text-right tabular-nums text-slate-900">{result.indicators.emaDiffPct}%</dd>
            <dt className="text-slate-500">Suggested stop</dt>
            <dd className="text-right tabular-nums text-slate-900">
              {formatPrice(result.stopSuggestion, asset.currency)}
            </dd>
          </dl>
        </section>

        {/* Plain-English explanation */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            In plain English
          </h2>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className={`rounded-md border px-3 py-2 text-sm ${toneColor(r.tone)}`}>
                <span className="font-medium text-slate-900">{r.label}: </span>
                <span className="text-slate-700">{r.text}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/trade-plan"
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Plan a trade for this →
          </Link>
        </section>
      </div>
    </div>
  );
}
