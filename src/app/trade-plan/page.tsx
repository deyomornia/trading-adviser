"use client";

import { useState } from "react";
import {
  calculateTradePlan,
  type TradeDirection,
} from "@/lib/risk/calculator";

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

export default function TradePlanPage() {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [currency, setCurrency] = useState("₱");
  const [accountSize, setAccountSize] = useState("100000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entry, setEntry] = useState("");
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
    n === null
      ? "—"
      : `${currency}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const units = (n: number | null) =>
    n === null
      ? "—"
      : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500";
  const labelClass = "block text-sm font-medium text-slate-700";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Trade Plan</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Decide whether a trade is worth taking <em>before</em> you enter. Risk
        control comes first — position size is based on what you can afford to
        lose, not on a hunch.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* ---------- INPUTS ---------- */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Asset (optional)</label>
            <input
              className={inputClass}
              placeholder="e.g. BTC"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </div>

          <div>
            <span className={labelClass}>Direction</span>
            <div className="mt-1 inline-flex rounded-md border border-slate-300 p-0.5">
              {(["long", "short"] as TradeDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={
                    "rounded px-4 py-1.5 text-sm capitalize transition-colors " +
                    (direction === d
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100")
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
              <input
                type="number"
                className={inputClass}
                value={accountSize}
                onChange={(e) => setAccountSize(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Risk per trade (%)</label>
              <input
                type="number"
                className={inputClass}
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Entry price</label>
              <input
                type="number"
                className={inputClass}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Stop-loss</label>
              <input
                type="number"
                className={inputClass}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Target (optional)</label>
              <input
                type="number"
                className={inputClass}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Currency</label>
            <select
              className={inputClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="₱">₱ Peso</option>
              <option value="$">$ Dollar</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              className={inputClass}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ---------- RESULTS ---------- */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Result
          </h2>

          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Amount at risk" value={money(result.amountAtRisk)} />
            <Row label="Risk per unit" value={money(result.riskPerUnit)} />
            <Row
              label="Suggested position size"
              value={
                result.positionSize === null
                  ? "—"
                  : `${units(result.positionSize)} units`
              }
              strong
            />
            <Row label="Position value" value={money(result.positionValue)} />
            <Row
              label="Potential loss"
              value={money(result.potentialLoss)}
              tone="loss"
            />
            <Row
              label="Potential profit"
              value={money(result.potentialProfit)}
              tone="profit"
            />
            <Row
              label="Reward-to-risk"
              value={
                result.rewardToRisk === null
                  ? "—"
                  : `${result.rewardToRisk.toFixed(2)} : 1`
              }
              strong
            />
          </dl>

          {/* Calm, plain-English guardrail messages */}
          {result.warnings.length > 0 && (
            <ul className="mt-5 space-y-2">
              {result.warnings.map((w, i) => (
                <li
                  key={i}
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                >
                  {w}
                </li>
              ))}
            </ul>
          )}

          {!result.canSize && result.warnings.length === 0 && (
            <p className="mt-5 text-xs text-slate-500">
              Enter your account size, risk %, entry and stop-loss to see a
              suggested position size.
            </p>
          )}
        </div>
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
    tone === "profit"
      ? "text-emerald-600"
      : tone === "loss"
        ? "text-red-600"
        : "text-slate-900";
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={
          "tabular-nums " + valueColor + (strong ? " font-semibold" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
