"use client";

import { useState } from "react";
import { calculateTradePlan, type TradeDirection } from "@/lib/risk/calculator";
import { savePlanToJournal } from "@/app/trade-plan/actions";
import type { TradePrefs } from "@/lib/prefs";

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

export default function TradePlanForm({
  defaults,
  initialSymbol = "",
  initialEntry = "",
}: {
  defaults: TradePrefs;
  initialSymbol?: string;
  initialEntry?: string;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [currency, setCurrency] = useState(defaults.currency);
  const [accountSize, setAccountSize] = useState(defaults.accountSize);
  const [riskPercent, setRiskPercent] = useState(defaults.riskPercent);
  const [entry, setEntry] = useState(initialEntry);
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");

  const result = calculateTradePlan({
    accountSize: num(accountSize),
    riskPercent: num(riskPercent),
    entry: num(entry),
    stopLoss: num(stopLoss),
    target: num(target),
    direction,
  });

  const money = (n: number | null) =>
    n === null ? "—" : `${currency}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const units = (n: number | null) =>
    n === null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 dark:border-ink-700 bg-white dark:bg-ink-950 px-3 py-2 text-sm text-slate-900 dark:text-ink-100 outline-none focus:border-slate-500 dark:focus:border-accent";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-ink-100/90";

  const canSave = symbol.trim() !== "" && Number.isFinite(num(entry));

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {/* ---------- INPUTS ---------- */}
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Asset</label>
          <input
            className={inputClass}
            placeholder="e.g. BTC"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
        </div>

        <div>
          <span className={labelClass}>Direction</span>
          <div className="mt-1 inline-flex rounded-md border border-slate-300 dark:border-ink-700 p-0.5">
            {(["long", "short"] as TradeDirection[]).map((d) => (
              <button
                key={d}
                type="button"
                title={d === "long" ? "Long — you profit if the price goes up" : "Short — you profit if the price goes down"}
                onClick={() => setDirection(d)}
                className={
                  "rounded px-4 py-1.5 text-sm capitalize transition-colors " +
                  (direction === d ? "bg-slate-900 dark:bg-accent text-white dark:text-ink-950" : "text-slate-600 dark:text-ink-300 hover:bg-slate-100 dark:hover:bg-ink-800")
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Account size</label>
            <input type="number" className={inputClass} value={accountSize} onChange={(e) => setAccountSize(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Risk per trade (%)</label>
            <input type="number" className={inputClass} value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Entry price</label>
            <input type="number" className={inputClass} value={entry} onChange={(e) => setEntry(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Stop-loss</label>
            <input type="number" className={inputClass} value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Target (optional)</label>
            <input type="number" className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Currency</label>
          <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="₱">₱ Peso</option>
            <option value="$">$ Dollar</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* ---------- RESULTS ---------- */}
      <div className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-950 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">Result</h2>

        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Amount at risk" value={money(result.amountAtRisk)} />
          <Row label="Risk per unit" value={money(result.riskPerUnit)} />
          <Row
            label="Suggested position size"
            value={result.positionSize === null ? "—" : `${units(result.positionSize)} units`}
            strong
          />
          <Row label="Position value" value={money(result.positionValue)} />
          <Row label="Potential loss" value={money(result.potentialLoss)} tone="loss" />
          <Row label="Potential profit" value={money(result.potentialProfit)} tone="profit" />
          <Row
            label="Reward-to-risk"
            value={result.rewardToRisk === null ? "—" : `${result.rewardToRisk.toFixed(2)} : 1`}
            strong
          />
        </dl>

        {result.warnings.length > 0 && (
          <ul className="mt-5 space-y-2">
            {result.warnings.map((w, i) => (
              <li key={i} className="rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                {w}
              </li>
            ))}
          </ul>
        )}

        {!result.canSize && result.warnings.length === 0 && (
          <p className="mt-5 text-xs text-slate-500 dark:text-ink-300">
            Enter your account size, risk %, entry and stop-loss to see a suggested position size.
          </p>
        )}

        {/* Save to journal (Pro) */}
        <form action={savePlanToJournal} className="mt-5 border-t border-slate-100 dark:border-ink-700/60 pt-4">
          <input type="hidden" name="symbol" value={symbol} />
          <input type="hidden" name="direction" value={direction} />
          <input type="hidden" name="entry" value={entry} />
          <input type="hidden" name="stop_loss" value={stopLoss} />
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="position_size" value={result.positionSize ?? ""} />
          <input type="hidden" name="notes" value={notes} />
          <button
            type="submit"
            title="Save this plan as an open trade in your journal (Pro)"
            disabled={!canSave}
            className="w-full rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save to journal
          </button>
          <p className="mt-1.5 text-center text-xs text-slate-400 dark:text-ink-300/70">
            Saving to your journal is a Pro feature.
          </p>
        </form>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "profit" | "loss";
}) {
  const valueColor =
    tone === "profit" ? "text-emerald-600 dark:text-emerald-400" : tone === "loss" ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-ink-100";
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-ink-700/60 pb-2 last:border-0">
      <dt className="text-slate-500 dark:text-ink-300">{label}</dt>
      <dd className={"font-mono tabular-nums " + valueColor + (strong ? " font-semibold" : "")}>{value}</dd>
    </div>
  );
}
