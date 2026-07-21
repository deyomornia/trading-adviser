"use client";

// Candlestick chart using TradingView's Lightweight Charts (display only).
// Renders in the browser after mount; the container is measured for width.

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type UTCTimestamp,
  type IChartApi,
} from "lightweight-charts";
import type { Candle } from "@/data/sampleCandles";

export default function CandleChart({
  candles,
  intraday = false,
}: {
  candles: Candle[];
  intraday?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#475569", // slate-600
      },
      grid: {
        vertLines: { color: "#f1f5f9" }, // slate-100
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: { borderColor: "#e2e8f0" }, // slate-200
      timeScale: { borderColor: "#e2e8f0", timeVisible: intraday, secondsVisible: false },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#059669", // emerald-600
      downColor: "#dc2626", // red-600
      borderVisible: false,
      wickUpColor: "#059669",
      wickDownColor: "#dc2626",
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
  }, [candles, intraday]);

  return <div ref={containerRef} className="w-full" />;
}
