"use client";

// The Signal badge, click to open a "Why this signal?" card that explains the
// verdict and shows this asset's actual parameters (trend, momentum, MACD).

import { useState } from "react";
import type { SignalVerdict, SignalDetail } from "@/types";

function badgeColor(signal: SignalVerdict) {
  return signal === "Buy Candidate"
    ? "bg-green-100 text-green-800"
    : signal === "Avoid"
    ? "bg-red-100 text-red-800"
    : "bg-amber-100 text-amber-800";
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
        <span className="text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-400">
          {value}/{max}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-800" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>
    </div>
  );
}

export default function SignalInfo({
  signal,
  score,
  detail,
}: {
  signal: SignalVerdict;
  score?: number;
  detail?: SignalDetail;
}) {
  const [open, setOpen] = useState(false);

  const trendHint =
    detail && detail.emaDiffPct > 0
      ? `Uptrend — 20-day avg ${detail.emaDiffPct}% above the 50-day`
      : detail
      ? `Weak/again downtrend — 20-day avg ${detail.emaDiffPct}% vs 50-day`
      : "";
  const momentumHint = detail ? `RSI ${detail.rsi}` : "";
  const macdHint = detail
    ? detail.macdHistogram > 0
      ? "MACD positive — momentum building"
      : "MACD negative — momentum fading"
    : "";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${badgeColor(signal)} cursor-pointer hover:opacity-80`}
        aria-label="Why this signal?"
      >
        {signal}
        <span className="text-[10px] opacity-70">ⓘ</span>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
            <div className="flex items-center justify-between">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeColor(signal)}`}>
                {signal}
              </span>
              {score !== undefined && (
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {score}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {VERDICT_MEANING[signal]}
            </p>

            {detail && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <Bar label="Trend" value={detail.trendPts} max={35} hint={trendHint} />
                <Bar label="Momentum" value={detail.momentumPts} max={35} hint={momentumHint} />
                <Bar label="MACD" value={detail.macdPts} max={30} hint={macdHint} />
              </div>
            )}

            <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-400">
              A “Buy Candidate” needs a score of 65+, a clear uptrend, and a valid
              stop-loss — otherwise it’s downgraded to “Wait”. Decision-support only,
              not financial advice.
            </p>
          </div>
        </>
      )}
    </span>
  );
}
