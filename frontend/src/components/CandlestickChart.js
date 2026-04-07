import React from "react";
import { formatCurrency } from "../utils/formatters";

export default function CandlestickChart({
  candles,
  timeframe,
  width = 960,
  height = 380,
  minWidth = 720,
  emptyMinHeight = 320,
  visibleCandles,
  showPriceLine = false,
  showHighLowGuide = false,
}) {
  const padding = 34;
  const displayedCandles =
    typeof visibleCandles === "number" && visibleCandles > 0
      ? candles.slice(-visibleCandles)
      : candles;

  if (!displayedCandles.length) {
    return (
      <div
        style={{
          minHeight: emptyMinHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 13,
        }}
      >
        No chart data available.
      </div>
    );
  }

  const highs = displayedCandles.map((candle) => candle.high);
  const lows = displayedCandles.map((candle) => candle.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const range = Math.max(maxPrice - minPrice, 0.0001);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const candleWidth = Math.max((chartWidth / displayedCandles.length) * 0.58, 4);
  const step = chartWidth / Math.max(displayedCandles.length, 1);

  const toY = (value) => padding + ((maxPrice - value) / range) * chartHeight;
  const gridValues = Array.from({ length: 5 }, (_, index) => {
    const value = maxPrice - (range / 4) * index;
    const y = padding + (chartHeight / 4) * index;
    return { value, y };
  });
  const labelStep = Math.max(Math.floor(displayedCandles.length / 6), 1);
  const latestCandle = displayedCandles[displayedCandles.length - 1];
  const highGuideY = toY(maxPrice);
  const lowGuideY = toY(minPrice);
  const livePriceY = latestCandle ? toY(latestCandle.close) : null;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          minWidth,
          height: "auto",
          display: "block",
          borderRadius: 16,
          background:
            "radial-gradient(circle at top, rgba(14, 165, 233, 0.12), rgba(2, 6, 23, 0.98) 62%)",
        }}
        role="img"
        aria-label={`${timeframe} candlestick chart`}
      >
        {showHighLowGuide ? (
          <>
            <line
              x1={padding}
              y1={highGuideY}
              x2={width - padding}
              y2={highGuideY}
              stroke="rgba(56, 189, 248, 0.45)"
              strokeDasharray="6 6"
            />
            <line
              x1={padding}
              y1={lowGuideY}
              x2={width - padding}
              y2={lowGuideY}
              stroke="rgba(244, 114, 182, 0.38)"
              strokeDasharray="6 6"
            />
            <text x={padding + 8} y={highGuideY - 8} fill="#7dd3fc" fontSize="11">
              Session high {formatCurrency(maxPrice, 4)}
            </text>
            <text x={padding + 8} y={lowGuideY - 8} fill="#f9a8d4" fontSize="11">
              Session low {formatCurrency(minPrice, 4)}
            </text>
          </>
        ) : null}

        {gridValues.map((grid) => (
          <g key={grid.y}>
            <line
              x1={padding}
              y1={grid.y}
              x2={width - padding}
              y2={grid.y}
              stroke="rgba(148, 163, 184, 0.14)"
              strokeDasharray="4 8"
            />
            <text
              x={width - padding + 8}
              y={grid.y + 4}
              fill="#94a3b8"
              fontSize="11"
            >
              {formatCurrency(grid.value, 4)}
            </text>
          </g>
        ))}

        {displayedCandles.map((candle, index) => {
          const xCenter = padding + step * index + step / 2;
          const openY = toY(candle.open);
          const closeY = toY(candle.close);
          const highY = toY(candle.high);
          const lowY = toY(candle.low);
          const isUp = candle.close >= candle.open;
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
          const color = isUp ? "#22c55e" : "#f87171";

          return (
            <g key={candle.time}>
              <line
                x1={xCenter}
                y1={highY}
                x2={xCenter}
                y2={lowY}
                stroke={color}
                strokeWidth="1.6"
              />
              <rect
                x={xCenter - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                rx="1.5"
                fill={isUp ? "rgba(34, 197, 94, 0.32)" : "rgba(248, 113, 113, 0.32)"}
                stroke={color}
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        {showPriceLine && latestCandle && livePriceY !== null ? (
          <g>
            <line
              x1={padding}
              y1={livePriceY}
              x2={width - padding}
              y2={livePriceY}
              stroke="rgba(250, 204, 21, 0.72)"
              strokeDasharray="8 8"
            />
            <rect
              x={width - padding - 92}
              y={livePriceY - 11}
              width="92"
              height="22"
              rx="11"
              fill="rgba(15, 23, 42, 0.95)"
              stroke="rgba(250, 204, 21, 0.72)"
            />
            <text x={width - padding - 46} y={livePriceY + 4} textAnchor="middle" fill="#fde68a" fontSize="11">
              {formatCurrency(latestCandle.close, 4)}
            </text>
          </g>
        ) : null}

        {displayedCandles.map((candle, index) =>
          index % labelStep === 0 || index === displayedCandles.length - 1 ? (
            <g key={`${candle.time}-label`}>
              <line
                x1={padding + step * index + step / 2}
                y1={padding}
                x2={padding + step * index + step / 2}
                y2={height - padding}
                stroke="rgba(30, 41, 59, 0.3)"
              />
              <text
                x={padding + step * index + step / 2}
                y={height - 8}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
              >
                {formatAxisLabel(candle.time, timeframe)}
              </text>
            </g>
          ) : null
        )}
      </svg>
    </div>
  );
}

function formatAxisLabel(time, timeframe) {
  const date = new Date(time);

  if (timeframe === "1D") {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  if (timeframe === "4H") {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    });
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
