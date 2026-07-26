"use client";

// Candlestick chart using TradingView's Lightweight Charts (display only).
// Theme-aware: reads the <html class="dark"> flag and re-styles live when the
// user flips the theme toggle (MutationObserver on the class attribute).

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type UTCTimestamp,
  type IChartApi,
} from "lightweight-charts";
import type { Candle } from "@/data/sampleCandles";

function isDark() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

export default function CandleChart({
  candles,
  intraday = false,
}: {
  candles: Candle[];
  intraday?: boolean;
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

    chart.timeScale().fitContent();

    // Keep the chart width in sync with its container on resize.
    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, intraday, dark]);

  return <div ref={containerRef} className="w-full" />;
}
