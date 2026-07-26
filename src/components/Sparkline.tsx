// Tiny price-trend line from real closes. Pure SVG, no libraries.
// Colored by direction over the window: up = emerald, down = red.

export default function Sparkline({
  points,
  width = 88,
  height = 28,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  if (!points || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;

  const coords = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (p - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = points[points.length - 1] >= points[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
    >
      <polyline
        points={coords}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
