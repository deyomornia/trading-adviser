// DG mark: two candlesticks (one up, one down) in a rounded tile — the same
// mark used as the browser-tab icon (src/app/icon.svg).

export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1" width="30" height="30" rx="7" className="fill-slate-900 dark:fill-ink-800" />
      {/* up candle */}
      <line x1="12" y1="6" x2="12" y2="26" stroke="#22c55e" strokeWidth="1.6" />
      <rect x="9" y="12" width="6" height="9" rx="1" fill="#22c55e" />
      {/* down candle */}
      <line x1="21" y1="8" x2="21" y2="24" stroke="#ef4444" strokeWidth="1.6" />
      <rect x="18" y="10" width="6" height="7" rx="1" fill="#ef4444" />
    </svg>
  );
}
