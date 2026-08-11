// "How signals work" — the public methodology page. The per-combination
// documentation (section 2) is GENERATED from the scoring-profile registry
// (src/lib/signal-engine/profiles.ts): every point value, gate, and rule on
// this page is read from the same objects the engine executes, so the docs
// cannot drift from the code. Do not hand-write profile numbers here.

import Link from "next/link";
import {
  PROFILES,
  BUY_SCORE_MIN,
  AVOID_SCORE_BELOW,
  STOP_LOOKBACK,
  MIN_CANDLES,
  type ScoringProfile,
  type EvidenceTier,
} from "@/lib/signal-engine";
import { STYLE_CONFIG } from "@/lib/tradingStyle";
import type { TradingStyle } from "@/lib/tradingStyle";

export const metadata = {
  title: "How signals work — DG Trading Adviser",
  description:
    "The exact rules behind DG Trading Adviser's 0–100 scores, every indicator combination, Buy Candidate verdicts, and suggested trade setups — including their honest limits.",
};

const h2 = "mt-10 text-lg font-semibold text-slate-900 dark:text-ink-100";
const p = "mt-2 text-sm leading-relaxed text-slate-600 dark:text-ink-300";
const th = "px-3 py-2 text-left font-medium text-slate-500 dark:text-ink-300";
const td = "px-3 py-2 text-slate-700 dark:text-ink-100/90";
const tableWrap =
  "mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900";

const EVIDENCE_BADGE: Record<EvidenceTier, { label: string; className: string }> = {
  "research-backed": {
    label: "Research-backed",
    className:
      "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  "practitioner-tested": {
    label: "Practitioner-tested",
    className: "bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-ink-300",
  },
};

const REQUIRE_NOTE: Record<string, string> = {
  volume:
    "Needs trading-volume data — assets whose feed doesn't report reliable volume show “not available” instead of a score.",
  intraday: "Works on hourly bars only (the Day trading style).",
};

function stylesLabel(styles: TradingStyle[]): string {
  return styles.map((s) => STYLE_CONFIG[s].label).join(" · ");
}

function ProfileCard({ profile }: { profile: ScoringProfile }) {
  const badge = EVIDENCE_BADGE[profile.evidenceTier];
  return (
    <div
      id={profile.id}
      className="mt-6 rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-ink-100">
          {profile.name}
        </h3>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-xs text-slate-400 dark:text-ink-300/70">
          {stylesLabel(profile.styles)} · {profile.timeframe}
        </span>
      </div>

      <p className={p}>{profile.description}</p>

      {profile.logicNote && (
        <p className="mt-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          {profile.logicNote}
        </p>
      )}

      <div className={tableWrap}>
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-ink-700">
              <th className={th}>Component</th>
              <th className={th}>Rule</th>
              <th className={`${th} text-right`}>Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-ink-700/60">
            {profile.components.map((c) =>
              c.tiers.map((tier, i) => (
                <tr key={`${c.key}-${i}`}>
                  <td className={td}>
                    {i === 0 ? (
                      <>
                        {c.name}
                        <span className="block text-xs text-slate-400 dark:text-ink-300/70">
                          {c.indicator} — max {c.maxPoints}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td className={td}>{tier.rule}</td>
                  <td className={`${td} text-right font-mono tabular-nums`}>{tier.points}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className={`${p} font-medium text-slate-700 dark:text-ink-100/90`}>
        Buy conditions (all must pass, plus the universal rules):
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600 dark:text-ink-300">
        {profile.buyGates.map((g) => (
          <li key={g.key}>{g.label}</li>
        ))}
      </ul>

      {profile.avoidRules.length > 0 && (
        <>
          <p className={`${p} font-medium text-slate-700 dark:text-ink-100/90`}>
            Instant “Avoid” when:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600 dark:text-ink-300">
            {profile.avoidRules.map((r) => (
              <li key={r.key}>{r.label}</li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-400 dark:text-ink-300/70">
        Needs at least {profile.minCandles} candles of history.
        {profile.requires.map((r) => ` ${REQUIRE_NOTE[r] ?? ""}`).join("")}{" "}
        {profile.evidenceNote}
      </p>
    </div>
  );
}

export default function MethodologyPage() {
  // Classic first (the registry already orders it first), then the rest.
  const profiles = PROFILES;

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
        shows the exact rules — nothing is hidden. Every number below is read
        from the same configuration the engine runs, so what you see here is
        what the app computes.
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
        weekly. Each combination states its own minimum history below (Classic
        needs {MIN_CANDLES} candles); an asset is never scored before its
        averages are properly warmed up, and never with data a combination
        requires but the feed doesn't provide — you see a plain-English
        “not available” instead.
      </p>

      <h2 className={h2}>2. The scoring combinations</h2>
      <p className={p}>
        Scores are produced by a named <strong>indicator combination</strong>{" "}
        that you pick per trading style (below the style selector). Each
        combination decides which indicators run, their exact point weights,
        and its own buy conditions. <strong>Classic (DG Default)</strong> is
        the original engine and the default everywhere. Free accounts include
        Classic plus one extra combination of your choice per style; Pro
        unlocks all of them.
      </p>
      <div className="mt-3 rounded-lg border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-900 p-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-ink-100">
          Universal rules — no combination can bypass these
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-ink-300">
          <li>
            Component points always sum to a 0–100 score.
          </li>
          <li>
            A <strong>Buy Candidate</strong> needs a score of at least{" "}
            {BUY_SCORE_MIN}, <em>every</em> buy condition passing, and a valid
            stop-loss level — the lowest low of the last {STOP_LOOKBACK}{" "}
            candles must sit below the current price.
          </li>
          <li>
            A score below {AVOID_SCORE_BELOW}, or any of the combination's
            “Avoid” rules firing, means <strong>Avoid</strong>. Everything in
            between is <strong>Wait</strong> — the honest default.
          </li>
          <li>Long-only: the engine looks for buys, never shorts.</li>
          <li>Never scored with missing or insufficient data.</li>
        </ul>
      </div>

      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}

      <h2 className={h2}>3. The verdicts</h2>
      <p className={p}>
        <strong>Buy Candidate</strong> requires all three, at the same time: a
        score of at least {BUY_SCORE_MIN}; every one of the combination's buy
        conditions passing (so strong momentum alone can never trigger a buy
        when the combination's trend condition fails); and a valid stop-loss
        level — the lowest low of the last {STOP_LOOKBACK} candles must sit
        below the current price.
      </p>
      <p className={p}>
        <strong>Avoid</strong> = score below {AVOID_SCORE_BELOW}, or any of the
        combination's “Avoid” rules firing. Everything in between is{" "}
        <strong>Wait</strong> — the honest default when signals are mixed.
      </p>

      <h2 className={h2}>4. Suggested trade setups (Pro)</h2>
      <p className={p}>
        When — and only when — an asset is a Buy Candidate, the app derives a
        rule-based example setup: entry at the latest price, a tight stop one
        average-true-range (ATR-14) below entry, a wider stop at the recent
        swing low (or 2× ATR), and three targets at 1R / 2R / 3R — so the
        second target always meets the app's 2:1 reward-to-risk rule. Position
        size comes from <em>your</em> saved account size and risk % — never
        from ours. The same rules apply whichever combination produced the
        Buy Candidate. Long setups only, and nothing is ever placed
        automatically.
      </p>
      <p className={p}>
        The setup also suggests two <strong>patient limit-order entries</strong>{" "}
        below the market price: a shallow pullback at 0.5× ATR below and a
        deeper one at 1× ATR below, each with stops, targets, and size
        recomputed from that fill price under the same rules. A level at or
        below the recent swing low is never suggested — a dip that deep would
        break the support the signal rests on. Honest caveat: a limit order
        only fills if price actually pulls back; if the move runs on without a
        dip, the order stays unfilled, and if price breaks below the stop
        level first, the setup is invalidated and the order should be
        cancelled.
      </p>

      <h2 className={h2}>5. Honest limits</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-ink-300">
        <li>
          The indicators are standard, and several combinations implement
          well-known published approaches — but the point weights and
          thresholds are <strong>our own launch heuristics and we have not
          backtested them ourselves</strong>. “Research-backed” describes the
          underlying idea's literature, not a promise about results.
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
