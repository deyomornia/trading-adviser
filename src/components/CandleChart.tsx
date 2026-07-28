"use client";

// Candlestick chart using TradingView's Lightweight Charts (display only).
// Theme-aware: reads the <html class="dark"> flag and re-styles live when the
// user flips the theme toggle (MutationObserver on the class attribute).

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  type UTCTimestamp,
  type IChartApi,
} from "lightweight-charts";
import type { Candle } from "@/data/sampleCandles";
import type { OverlaySeries } from "@/lib/signal-engine";

function isDark() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

export default function CandleChart({
  candles,
  intraday = false,
  overlays = [],
}: {
  candles: Candle[];
  intraday?: boolean;
  // Indicator lines from the active scoring profile (computed server-side).
  overlays?: OverlaySeries[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);

  // Track theme changes without a reload.
  useEffect(() => {
    setDark(isDark());
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colors = dark
      ? {
          bg: "#111a2c", // ink-900 panel
          text: "#8a97ac", // ink-300
          grid: "#1e2a40", // ink-700
          border: "#1e2a40",
        }
      : {
          bg: "#ffffff",
          text: "#475569", // slate-600
          grid: "#f1f5f9", // slate-100
          border: "#e2e8f0", // slate-200
        };

    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: colors.bg },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: intraday, secondsVisible: false },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    series.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // The active profile's indicator lines (EMAs, VWAP, Bollinger, SMAs…).
    for (const o of overlays) {
      const line = chart.addSeries(LineSeries, {
        color: o.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.setData(
        o.points
          .filter((p) => Number.isFinite(p.value))
          .map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
      );
    }

    chart.timeScale().fitContent();

    // Keep the chart width in sync with its container on resize.
    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, intraday, dark, overlays]);

  return (
    <div>
      {overlays.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-ink-300">
          {overlays.map((o) => (
            <span key={o.label} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ backgroundColor: o.color }}
              />
              {o.label}
            </span>
          ))}
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
