// Portfolio summary logic (Phase 8). Pure functions — no UI, no framework.
// Takes the user's OPEN trades and turns them into exposure, risk, and
// concentration warnings the Portfolio page can display.

import type { Trade, AssetType } from "@/types";

export type AssetClass = AssetType | "other";

export interface PositionExposure {
  symbol: string;
  type: AssetClass;
  exposure: number;      // money committed = position_size * entry (0 if unknown)
  risk: number | null;   // money at risk = |entry - stop| * size (null if missing)
  exposurePct: number;   // share of total exposure, 0–100
}

export interface ClassExposure {
  type: AssetClass;
  exposure: number;
  pct: number;           // share of total exposure, 0–100
}

export interface PortfolioSummary {
  totalExposure: number;
  totalRisk: number;             // sum of measurable risks
  positionsWithoutStop: number;  // open trades missing a stop-loss or size
  positions: PositionExposure[];
  byClass: ClassExposure[];
  warnings: string[];
}

// Thresholds for concentration warnings.
const SINGLE_ASSET_WARN_PCT = 40;
const SINGLE_CLASS_WARN_PCT = 70;

const CLASS_LABEL: Record<AssetClass, string> = {
  crypto: "crypto",
  commodity: "commodities",
  other: "other assets",
};

export function summarizePortfolio(
  openTrades: Trade[],
  typeOf: (symbol: string) => AssetClass
): PortfolioSummary {
  const positions: PositionExposure[] = openTrades.map((t) => {
    const exposure = t.position_size != null ? t.position_size * t.entry : 0;
    const risk =
      t.stop_loss != null && t.position_size != null
        ? +(Math.abs(t.entry - t.stop_loss) * t.position_size).toFixed(2)
        : null;
    return {
      symbol: t.symbol,
      type: typeOf(t.symbol),
      exposure: +exposure.toFixed(2),
      risk,
      exposurePct: 0, // filled in below once we know the total
    };
  });

  const totalExposure = +positions.reduce((s, p) => s + p.exposure, 0).toFixed(2);
  const totalRisk = +positions
    .reduce((s, p) => s + (p.risk ?? 0), 0)
    .toFixed(2);
  const positionsWithoutStop = openTrades.filter(
    (t) => t.stop_loss == null || t.position_size == null
  ).length;

  // Fill in each position's share of total exposure.
  for (const p of positions) {
    p.exposurePct =
      totalExposure > 0 ? Math.round((p.exposure / totalExposure) * 100) : 0;
  }

  // Group exposure by asset class.
  const classMap = new Map<AssetClass, number>();
  for (const p of positions) {
    classMap.set(p.type, (classMap.get(p.type) ?? 0) + p.exposure);
  }
  const byClass: ClassExposure[] = [...classMap.entries()]
    .map(([type, exposure]) => ({
      type,
      exposure: +exposure.toFixed(2),
      pct: totalExposure > 0 ? Math.round((exposure / totalExposure) * 100) : 0,
    }))
    .sort((a, b) => b.exposure - a.exposure);

  // Build calm, plain-English concentration warnings.
  const warnings: string[] = [];

  const topPosition = [...positions].sort((a, b) => b.exposurePct - a.exposurePct)[0];
  if (topPosition && topPosition.exposurePct >= SINGLE_ASSET_WARN_PCT) {
    warnings.push(
      `${topPosition.exposurePct}% of your exposure is in ${topPosition.symbol} alone. A single surprise there would hit your portfolio hard — consider spreading out.`
    );
  }

  const topClass = byClass[0];
  if (topClass && topClass.pct >= SINGLE_CLASS_WARN_PCT && byClass.length > 1) {
    warnings.push(
      `${topClass.pct}% of your exposure is in ${CLASS_LABEL[topClass.type]}. Spreading across asset classes can reduce risk.`
    );
  }

  if (positionsWithoutStop > 0) {
    warnings.push(
      `${positionsWithoutStop} open trade${positionsWithoutStop > 1 ? "s have" : " has"} no stop-loss or size recorded, so their risk can't be measured. Add those details in the journal.`
    );
  }

  return {
    totalExposure,
    totalRisk,
    positionsWithoutStop,
    positions,
    byClass,
    warnings,
  };
}
