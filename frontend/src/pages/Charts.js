import React, { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import LoadingCard from "../components/LoadingCard";
import { apiRequest } from "../config/apiClient";
import { formatCurrency, formatPercent } from "../utils/formatters";

const TIMEFRAME_OPTIONS = ["15M", "1H", "4H", "1D"];
const REFRESH_INTERVAL_MS = 5000;

export default function Charts() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1H");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadChartData(isBackgroundRefresh = false) {
      try {
        if (isBackgroundRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const nextData = await apiRequest(
          `/api/market/charts?pair=${encodeURIComponent(
            selectedPair
          )}&timeframe=${encodeURIComponent(timeframe)}`
        );

        if (!active) {
          return;
        }

        setData(nextData);
        setLastUpdated(new Date());
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message || "Failed to load data");
      } finally {
        if (!active) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
      }
    }

    loadChartData();

    const intervalId = setInterval(() => {
      loadChartData(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [selectedPair, timeframe]);

  if (loading) {
    return (
      <MainLayout>
        <LoadingCard text="Loading chart data..." />
      </MainLayout>
    );
  }

  if (error && !data) {
    return (
      <MainLayout>
        <div className="card" style={{ color: "#fecaca" }}>
          {error}
        </div>
      </MainLayout>
    );
  }

  const candles = data?.candles || [];
  const latestCandle = candles[candles.length - 1];
  const earliestCandle = candles[0];
  const candleClose = latestCandle?.close ?? data?.currentPrice ?? 0;
  const candleMove = latestCandle ? latestCandle.close - latestCandle.open : 0;
  const candleMovePercent = latestCandle?.open
    ? (candleMove / latestCandle.open) * 100
    : 0;
  const rangeMove = latestCandle && earliestCandle
    ? latestCandle.close - earliestCandle.open
    : 0;
  const rangeMovePercent = earliestCandle?.open
    ? (rangeMove / earliestCandle.open) * 100
    : 0;

  return (
    <MainLayout>
      <h1 className="page-title">Charts</h1>
      <p className="page-subtitle">
        Timeframe-aligned candlestick chart with live refresh from the market feed.
      </p>

      <div
        className="card"
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <label style={{ fontSize: 13, color: "#cbd5f5" }}>Trading Pair</label>
          <select
            value={selectedPair}
            onChange={(event) => setSelectedPair(event.target.value)}
            style={controlStyle}
          >
            <option>BTC/USDT</option>
            <option>ETH/USDT</option>
            <option>SOL/USDT</option>
            <option>BNB/USDT</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, color: "#cbd5f5", marginBottom: 4 }}>
            Timeframe
          </label>
          <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setTimeframe(option)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border:
                    timeframe === option
                      ? "1px solid #38bdf8"
                      : "1px solid #374151",
                  background:
                    timeframe === option
                      ? "linear-gradient(135deg, #0ea5e9, #2563eb)"
                      : "transparent",
                  color: "#f9fafb",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <MetricCard
          label={`${timeframe} Last Close`}
          value={formatCurrency(candleClose, 4)}
          accent={candleMove >= 0 ? "#22c55e" : "#f87171"}
          note={
            latestCandle
              ? `Candle time ${formatExactLabel(latestCandle.time, timeframe)}`
              : ""
          }
        />
        <MetricCard
          label={`${timeframe} Candle Move`}
          value={formatPercent(candleMovePercent)}
          accent={candleMove >= 0 ? "#22c55e" : "#f87171"}
          note={
            latestCandle
              ? `${formatCurrency(latestCandle.open, 4)} open to ${formatCurrency(
                  latestCandle.close,
                  4
                )} close`
              : ""
          }
        />
        <MetricCard
          label={`${timeframe} Range Move`}
          value={formatPercent(rangeMovePercent)}
          accent={rangeMove >= 0 ? "#38bdf8" : "#fb7185"}
          note={
            earliestCandle && latestCandle
              ? `${formatExactLabel(earliestCandle.time, timeframe)} to ${formatExactLabel(
                  latestCandle.time,
                  timeframe
                )}`
              : ""
          }
        />
        <MetricCard
          label="Live Feed"
          value={refreshing ? "Refreshing..." : formatCurrency(data.currentPrice, 4)}
          note={
            lastUpdated
              ? `Feed update ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for first update"
          }
          accent="#f59e0b"
        />
      </div>

      {error ? (
        <div
          className="card"
          style={{
            marginBottom: 16,
            color: "#fecaca",
            borderColor: "#7f1d1d",
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", letterSpacing: "0.08em" }}>
              {data.pair} {timeframe} CANDLES
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
              {formatCurrency(candleClose, 4)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: candleMove >= 0 ? "#4ade80" : "#fda4af",
                marginTop: 8,
              }}
            >
              {formatPercent(candleMovePercent)} this candle
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 999,
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid #1e3a8a",
                color: "#bfdbfe",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: refreshing ? "#f59e0b" : "#22c55e",
                  boxShadow: refreshing
                    ? "0 0 12px rgba(245, 158, 11, 0.7)"
                    : "0 0 12px rgba(34, 197, 94, 0.7)",
                }}
              />
              {refreshing ? "Refreshing feed" : "Realtime refresh every 5s"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
              Feed source: {data.source}
            </div>
            {latestCandle ? (
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                Latest candle: {formatExactLabel(latestCandle.time, timeframe)}
              </div>
            ) : null}
          </div>
        </div>

        <CandlestickChart candles={candles} timeframe={timeframe} />
      </div>

      <div className="card">
        <h2>Recent Candles</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
                <th>Volume</th>
                <th>Move</th>
              </tr>
            </thead>
            <tbody>
              {candles.slice(-12).reverse().map((candle) => {
                const move = candle.close - candle.open;
                const movePercent = candle.open ? (move / candle.open) * 100 : 0;

                return (
                  <tr key={candle.time}>
                    <td>{formatExactLabel(candle.time, timeframe)}</td>
                    <td>{formatCurrency(candle.open, 4)}</td>
                    <td>{formatCurrency(candle.high, 4)}</td>
                    <td>{formatCurrency(candle.low, 4)}</td>
                    <td>{formatCurrency(candle.close, 4)}</td>
                    <td>{candle.volume}</td>
                    <td className={move >= 0 ? "text-green" : "text-red"}>
                      {formatPercent(movePercent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

function MetricCard({ label, value, note, accent }) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        background:
          "linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(7, 10, 18, 0.98))",
      }}
    >
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || "#f9fafb" }}>
        {value}
      </div>
      {note ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>{note}</div>
      ) : null}
    </div>
  );
}

function CandlestickChart({ candles, timeframe }) {
  const width = 960;
  const height = 380;
  const padding = 34;

  if (!candles.length) {
    return (
      <div
        style={{
          minHeight: 320,
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

  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const range = Math.max(maxPrice - minPrice, 0.0001);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const candleWidth = Math.max((chartWidth / candles.length) * 0.58, 4);
  const step = chartWidth / Math.max(candles.length, 1);

  const toY = (value) => padding + ((maxPrice - value) / range) * chartHeight;
  const gridValues = Array.from({ length: 5 }, (_, index) => {
    const value = maxPrice - (range / 4) * index;
    const y = padding + (chartHeight / 4) * index;
    return { value, y };
  });
  const labelStep = Math.max(Math.floor(candles.length / 6), 1);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          minWidth: 720,
          height: "auto",
          display: "block",
          borderRadius: 16,
          background:
            "radial-gradient(circle at top, rgba(14, 165, 233, 0.12), rgba(2, 6, 23, 0.98) 62%)",
        }}
        role="img"
        aria-label={`${timeframe} candlestick chart`}
      >
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

        {candles.map((candle, index) => {
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

        {candles.map((candle, index) =>
          index % labelStep === 0 || index === candles.length - 1 ? (
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

function formatExactLabel(time, timeframe) {
  const date = new Date(time);

  if (timeframe === "1D") {
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const controlStyle = {
  marginTop: 4,
  padding: 8,
  borderRadius: 8,
  border: "1px solid #1f2937",
  background: "#111827",
  color: "#f9fafb",
};
