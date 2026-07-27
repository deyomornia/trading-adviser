"use client";

// The Signal badge; click to open a "Why this signal?" card explaining the
// verdict and this asset's actual parameters. The card renders in a portal so
// it's never clipped by scrollable tables, and closes on Escape or click-away.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SignalVerdict, SignalDetail } from "@/types";

function badgeColor(signal: SignalVerdict) {
  return signal === "Buy Candidate"
    ? "bg-green-100 dark:bg-emerald-500/15 text-green-800 dark:text-emerald-300"
    : signal === "Avoid"
    ? "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300"
    : "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300";
}

const VERDICT_MEANING: Record<SignalVerdict, string> = {
  "Buy Candidate":
    "The signals line up. Worth a closer look — only with a clear stop-loss and acceptable reward-to-risk.",
  Wait: "A mixed picture. It may be better to wait for a clearer trend or stronger confirmation.",
  Avoid: "Trend and momentum look weak. It may be best to skip this one for now.",
};

function Bar({ label, value, max, hint }: { label: string; value: number; max: number; hint: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 dark:text-ink-300">{label}</span>
        <span className="font-mono tabular-nums text-slate-400 dark:text-ink-300/70">
          {value}/{max}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
        <div className="h-full rounded-full bg-slate-800 dark:bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-0.5 text-[11px] text-slate-400 dark:text-ink-300/70">{hint}</div>
    </div>
  );
}

const CARD_WIDTH = 288; // w-72

export default function SignalInfo({
  signal,
  score,
  detail,
}: {
  signal: SignalVerdict;
  score?: number;
  detail?: SignalDetail;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pos !== null;

  function toggle() {
    if (open) {
      setPos(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    let left = r.left;
    if (left + CARD_WIDTH > window.innerWidth - 8) left = window.innerWidth - CARD_WIDTH - 8;
    if (left < 8) left = 8;
    setPos({ top: r.bottom + 8, left });
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const trendHint = detail
    ? detail.emaDiffPct > 0
      ? `Uptrend — 20-avg ${detail.emaDiffPct}% above the 50-avg`
      : `Flat/down — 20-avg ${detail.emaDiffPct}% vs 50-avg`
    : "";
  const momentumHint = detail ? `RSI ${detail.rsi}` : "";
  const macdHint = detail
    ? detail.macdHistogram > 0
      ? "MACD positive — momentum building"
      : "MACD negative — momentum fading"
    : "";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${badgeColor(signal)} cursor-pointer hover:opacity-80`}
        aria-label="Why this signal?"
        title="Click to see why this signal and the numbers behind it"
      >
        {signal}
        <span className="text-[10px] opacity-70">ⓘ</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
            <div
              role="dialog"
              className="fixed z-50 w-72 rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-3 text-left shadow-lg"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="flex items-center justify-between">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeColor(signal)}`}>
                  {signal}
                </span>
                {score !== undefined && (
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-ink-100">
                    {score}
                    <span className="text-xs font-normal text-slate-400 dark:text-ink-300/70">/100</span>
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-ink-300">
                {VERDICT_MEANING[signal]}
              </p>

              {detail && (
                <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-ink-700/60 pt-3">
                  <Bar label="Trend" value={detail.trendPts} max={35} hint={trendHint} />
                  <Bar label="Momentum" value={detail.momentumPts} max={35} hint={momentumHint} />
                  <Bar label="MACD" value={detail.macdPts} max={30} hint={macdHint} />
                </div>
              )}

              <p className="mt-3 border-t border-slate-100 dark:border-ink-700/60 pt-2 text-[11px] leading-relaxed text-slate-400 dark:text-ink-300/70">
                A “Buy Candidate” needs a strong score, a clear uptrend for the chosen
                timeframe, and a valid stop-loss — otherwise it’s downgraded to “Wait”.
                Decision-support only, not financial advice.
              </p>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
