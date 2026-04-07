import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LoadingCard from "../components/LoadingCard";
import CandlestickChart from "../components/CandlestickChart";
import { apiRequest } from "../config/apiClient";
import { formatCurrency, formatPercent } from "../utils/formatters";

const TIMEFRAME_OPTIONS = ["15M", "1H", "4H", "1D"];
const REFRESH_INTERVAL_MS = 5000;
const PAIR_OPTIONS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];

export default function ChartFullscreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPair = searchParams.get("pair") || "BTC/USDT";
  const timeframe = searchParams.get("timeframe") || "1H";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [visibleCandles, setVisibleCandles] = useState(40);
  const [showPriceLine, setShowPriceLine] = useState(true);
  const [showHighLowGuide, setShowHighLowGuide] = useState(true);

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

  const updateQuery = (nextPair, nextTimeframe) => {
    setSearchParams({
      pair: nextPair,
      timeframe: nextTimeframe,
    });
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <LoadingCard text="Loading full screen chart..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={pageStyle}>
        <div className="card" style={{ color: "#fecaca", width: "100%", maxWidth: 900 }}>
          {error}
        </div>
      </div>
    );
  }

  const candles = data?.candles || [];
  const latestCandle = candles[candles.length - 1];
  const candleClose = latestCandle?.close ?? data?.currentPrice ?? 0;
  const candleMove = latestCandle ? latestCandle.close - latestCandle.open : 0;
  const candleMovePercent = latestCandle?.open
    ? (candleMove / latestCandle.open) * 100
    : 0;
  const visibleSlice = candles.slice(-visibleCandles);
  const visibleLatestCandle = visibleSlice[visibleSlice.length - 1] || latestCandle;

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={toolbarStyle}>
          <div>
            <div style={{ fontSize: 12, color: "#93c5fd", letterSpacing: "0.12em" }}>
              FULL SCREEN CHART WINDOW
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 3vw, 42px)" }}>
              {selectedPair}
            </h1>
          </div>

          <div style={toolbarActionsStyle}>
            <label style={labelStyle}>
              Pair
              <select
                value={selectedPair}
                onChange={(event) => updateQuery(event.target.value, timeframe)}
                style={controlStyle}
              >
                {PAIR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateQuery(selectedPair, option)}
                  style={{
                    ...timeframeButtonStyle,
                    ...(timeframe === option ? activeTimeframeButtonStyle : null),
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            <button type="button" onClick={() => window.close()} style={closeButtonStyle}>
              Close Window
            </button>
          </div>
        </div>

        <div style={headlineRowStyle}>
          <div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>{timeframe} last close</div>
            <div style={{ fontSize: "clamp(34px, 4vw, 56px)", fontWeight: 800 }}>
              {formatCurrency(candleClose, 4)}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: candleMove >= 0 ? "#4ade80" : "#fda4af",
              }}
            >
              {formatPercent(candleMovePercent)}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>
              {refreshing ? "Refreshing live feed..." : "Live feed active"}
            </div>
            {latestCandle ? (
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Latest candle: {formatExactLabel(latestCandle.time, timeframe)}
              </div>
            ) : null}
          </div>
        </div>

        <div style={toolsGridStyle}>
          <div style={toolCardStyle}>
            <div style={toolLabelStyle}>Zoom</div>
            <div style={toolButtonRowStyle}>
              {[20, 40, 60].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setVisibleCandles(count)}
                  style={{
                    ...toolButtonStyle,
                    ...(visibleCandles === count ? toolButtonActiveStyle : null),
                  }}
                >
                  {count} candles
                </button>
              ))}
            </div>
          </div>

          <div style={toolCardStyle}>
            <div style={toolLabelStyle}>Guides</div>
            <div style={toolButtonRowStyle}>
              <button
                type="button"
                onClick={() => setShowPriceLine((current) => !current)}
                style={{
                  ...toolButtonStyle,
                  ...(showPriceLine ? toolButtonActiveStyle : null),
                }}
              >
                Live price line
              </button>
              <button
                type="button"
                onClick={() => setShowHighLowGuide((current) => !current)}
                style={{
                  ...toolButtonStyle,
                  ...(showHighLowGuide ? toolButtonActiveStyle : null),
                }}
              >
                High / low guides
              </button>
            </div>
          </div>

          <div style={toolCardStyle}>
            <div style={toolLabelStyle}>Candle Snapshot</div>
            <div style={snapshotGridStyle}>
              <div style={snapshotItemStyle}>
                <span style={snapshotKeyStyle}>Open</span>
                <strong>{formatCurrency(visibleLatestCandle?.open ?? 0, 4)}</strong>
              </div>
              <div style={snapshotItemStyle}>
                <span style={snapshotKeyStyle}>High</span>
                <strong>{formatCurrency(visibleLatestCandle?.high ?? 0, 4)}</strong>
              </div>
              <div style={snapshotItemStyle}>
                <span style={snapshotKeyStyle}>Low</span>
                <strong>{formatCurrency(visibleLatestCandle?.low ?? 0, 4)}</strong>
              </div>
              <div style={snapshotItemStyle}>
                <span style={snapshotKeyStyle}>Close</span>
                <strong>{formatCurrency(visibleLatestCandle?.close ?? 0, 4)}</strong>
              </div>
            </div>
          </div>
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

        <div style={chartShellStyle}>
          <CandlestickChart
            candles={candles}
            timeframe={timeframe}
            width={1600}
            height={820}
            minWidth={980}
            emptyMinHeight={620}
            visibleCandles={visibleCandles}
            showPriceLine={showPriceLine}
            showHighLowGuide={showHighLowGuide}
          />
        </div>
      </div>
    </div>
  );
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

const pageStyle = {
  minHeight: "100vh",
  padding: 24,
  background:
    "radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), rgba(2, 6, 23, 0.98) 46%), linear-gradient(180deg, #020617 0%, #020617 100%)",
  color: "#f8fafc",
};

const shellStyle = {
  minHeight: "calc(100vh - 48px)",
  borderRadius: 28,
  border: "1px solid rgba(59, 130, 246, 0.25)",
  background: "rgba(2, 6, 23, 0.82)",
  boxShadow: "0 30px 80px rgba(15, 23, 42, 0.6)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
  marginBottom: 20,
};

const toolbarActionsStyle = {
  display: "flex",
  alignItems: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "#cbd5e1",
};

const controlStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #1e3a8a",
  background: "#0f172a",
  color: "#f8fafc",
  minWidth: 140,
};

const timeframeButtonStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "transparent",
  color: "#f8fafc",
  cursor: "pointer",
  fontWeight: 700,
};

const activeTimeframeButtonStyle = {
  border: "1px solid #38bdf8",
  background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
};

const closeButtonStyle = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #475569",
  background: "rgba(15, 23, 42, 0.9)",
  color: "#f8fafc",
  cursor: "pointer",
  fontWeight: 700,
};

const headlineRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "flex-end",
  marginBottom: 18,
};

const chartShellStyle = {
  flex: 1,
  minHeight: 0,
  borderRadius: 24,
  border: "1px solid rgba(30, 64, 175, 0.35)",
  background: "rgba(15, 23, 42, 0.55)",
  padding: 16,
  overflow: "hidden",
};

const toolsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const toolCardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(51, 65, 85, 0.8)",
  background: "rgba(15, 23, 42, 0.75)",
  padding: 14,
};

const toolLabelStyle = {
  fontSize: 12,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 10,
};

const toolButtonRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toolButtonStyle = {
  padding: "9px 12px",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "transparent",
  color: "#e2e8f0",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};

const toolButtonActiveStyle = {
  border: "1px solid #38bdf8",
  background: "rgba(14, 165, 233, 0.16)",
  color: "#e0f2fe",
};

const snapshotGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const snapshotItemStyle = {
  padding: 10,
  borderRadius: 14,
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(30, 41, 59, 0.9)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const snapshotKeyStyle = {
  fontSize: 11,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
