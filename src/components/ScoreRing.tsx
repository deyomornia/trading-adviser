// Circular 0–100 score gauge (SVG). Fill and color follow the score:
// emerald ≥ 65, amber 40–64, red < 40 — same bands as the score badges.

export default function ScoreRing({ score, size = 76 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (clamped / 100) * c;

  const color =
    clamped >= 65
      ? "text-emerald-600 dark:text-emerald-400"
      : clamped >= 40
      ? "text-amber-500 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-ink-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          className={`stroke-current ${color}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`font-mono text-xl font-bold tabular-nums ${color}`}>{clamped}</div>
        <div className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-ink-300/70">/100</div>
      </div>
    </div>
  );
}
