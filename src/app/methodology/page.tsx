import Link from "next/link";

export const metadata = {
  title: "How signals work — DG Trading Adviser",
  description:
    "The exact rules behind DG Trading Adviser's 0–100 scores, Buy Candidate verdicts, and suggested trade setups — including their honest limits.",
};

const h2 = "mt-10 text-lg font-semibold text-slate-900 dark:text-ink-100";
const p = "mt-2 text-sm leading-relaxed text-slate-600 dark:text-ink-300";
const th = "px-3 py-2 text-left font-medium text-slate-500 dark:text-ink-300";
const td = "px-3 py-2 text-slate-700 dark:text-ink-100/90";
const tableWrap =
  "mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900";

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">
        How signals work
      </h1>
      <p className={p}>
        DG Trading Adviser is a <strong>decision-support</strong> tool: it turns
        real market data into a 0–100 score and a calm verdict, so you can make
        your own decision with clearer information. It never predicts the
        future, never guarantees profit, and never trades for you. This page
        shows the exact rules — nothing is hidden.
      </p>

      <h2 className={h2}>1. The data</h2>
      <p className={p}>
        Crypto prices come from Binance's public market API, Gold from Twelve
        Data, and Oil / Copper / Silver / Natural Gas from Yahoo Finance
        futures. (TradingView only supplies the chart-drawing library — no
        data.) Prices update every ~5 minutes, commodities up to ~15 — a
        periodic feed, not tick-by-tick. Anything that isn't live is always
        labelled <span className="rounded bg-amber-100 dark:bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">SAMPLE</span>.
      </p>
      <p className={p}>
        Your trading style sets the candles the signals read: <strong>Day</strong>{" "}
        = hourly, <strong>Swing</strong> = daily, <strong>Position</strong> =
        weekly. At least 55 candles of history are required before an asset is
        scored, so the averages are properly warmed up.
      </p>

      <h2 className={h2}>2. The three indicators</h2>
      <p className={p}>
        The score is built from three standard, decades-old technical-analysis
        indicators:
      </p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-ink-300">
        <li>
          <strong>Trend — EMA 20 vs EMA 50:</strong> two exponential moving
          averages. When the faster 20-bar average sits above the slower 50-bar
          average, price has been rising.
        </li>
        <li>
          <strong>Momentum — RSI 14:</strong> a 0–100 gauge of recent buying vs
          selling pressure. Around 30 is weak, around 70 is strong.
        </li>
        <li>
          <strong>MACD 12/26/9:</strong> measures whether momentum is building
          or fading by comparing fast and slow averages and their difference
          (the histogram).
        </li>
      </ul>

      <h2 className={h2}>3. The 0–100 score</h2>
      <div className={tableWrap}>
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-ink-700">
              <th className={th}>Component</th>
              <th className={th}>Max points</th>
              <th className={th}>How points are earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-ink-700/60">
            <tr>
              <td className={td}>Trend (EMA gap)</td>
              <td className={`${td} font-mono tabular-nums`}>35</td>
              <td className={td}>
                Full points when the EMA-20 sits clearly above the EMA-50 for
                the timeframe: &gt;1% on hourly, &gt;3% on daily, &gt;6% on
                weekly. Smaller gaps earn 26 / 18 / 8; downtrends earn 0.
              </td>
            </tr>
            <tr>
              <td className={td}>Momentum (RSI)</td>
              <td className={`${td} font-mono tabular-nums`}>35</td>
              <td className={td}>
                Scaled linearly: RSI 30 → 0 points, RSI 70 → 35 points.
              </td>
            </tr>
            <tr>
              <td className={td}>MACD</td>
              <td className={`${td} font-mono tabular-nums`}>30</td>
              <td className={td}>
                30 when the MACD line is above its signal line with a positive,
                rising histogram; 20 / 12 / 8 for weaker alignments; 0 when
                momentum is fading.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className={h2}>4. The verdicts</h2>
      <p className={p}>
        <strong>Buy Candidate</strong> requires all three, at the same time:
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-ink-300">
        <li>Score of at least 65;</li>
        <li>
          a clear uptrend — the EMA gap must exceed the timeframe's buy gate
          (1% hourly / 3% daily / 6% weekly), so strong momentum alone can
          never trigger a buy on a flat chart;
        </li>
        <li>
          a valid stop-loss level — the lowest low of the last 20 candles must
          sit below the current price.
        </li>
      </ol>
      <p className={p}>
        <strong>Avoid</strong> = score below 40, or a clearly negative trend
        gap (below −0.7% / −2% / −3% per timeframe). Everything in between is{" "}
        <strong>Wait</strong> — the honest default when signals are mixed.
      </p>

      <h2 className={h2}>5. Suggested trade setups (Pro)</h2>
      <p className={p}>
        When — and only when — an asset is a Buy Candidate, the app derives a
        rule-based example setup: entry at the latest price, a tight stop one
        average-true-range (ATR-14) below entry, a wider stop at the recent
        swing low (or 2× ATR), and three targets at 1R / 2R / 3R — so the
        second target always meets the app's 2:1 reward-to-risk rule. Position
        size comes from <em>your</em> saved account size and risk % — never
        from ours. Long setups only, and nothing is ever placed automatically.
      </p>

      <h2 className={h2}>6. Honest limits</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-ink-300">
        <li>
          The indicators are standard, but the point weights and thresholds are{" "}
          <strong>our own heuristic — they have not been backtested</strong>{" "}
          against historical outcomes.
        </li>
        <li>
          Technical analysis describes current conditions; it does not predict
          the future. A Buy Candidate can still lose.
        </li>
        <li>The engine is long-only — it looks for buys, never shorts.</li>
        <li>
          Data is periodic (~5–15 min), so always recheck levels before placing
          any order with your broker or exchange.
        </li>
        <li>
          Nothing here is financial advice. Markets involve risk, and your
          decisions are your own.
        </li>
      </ul>

      <p className="mt-10 text-sm text-slate-500 dark:text-ink-300">
        Questions or ideas about the methodology?{" "}
        <Link href="/support" className="underline">
          Tell the DG team
        </Link>
        .
      </p>
    </div>
  );
}
