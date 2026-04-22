import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LoadingCard from "../components/LoadingCard";
import CandlestickChart from "../components/CandlestickChart";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import useLiveMarketFeed, {
  mergeLiveCandleIntoCandles,
} from "../hooks/useLiveMarketFeed";
import { formatCurrency, formatPercent } from "../utils/formatters";

const TIMEFRAME_OPTIONS = ["15M", "1H", "4H", "1D"];
const BACKGROUND_RESYNC_INTERVAL_MS = 30000;
const PAIR_OPTIONS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];

export default function ChartFullscreen() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPair = searchParams.get("pair") || "BTC/USDT";
  const timeframe = searchParams.get("timeframe") || "1H";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [portfolioData, setPortfolioData] = useState(null);
  const [tradeError, setTradeError] = useState("");
  const [tradeSuccess, setTradeSuccess] = useState("");
  const [submittingTrade, setSubmittingTrade] = useState(false);
  const [side, setSide] = useState("Buy");
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState("Market");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [timeInForce, setTimeInForce] = useState("Day");
  const [visibleCandles, setVisibleCandles] = useState(40);
  const [showPriceLine, setShowPriceLine] = useState(true);
  const [showHighLowGuide, setShowHighLowGuide] = useState(true);
  const liveFeed = useLiveMarketFeed({
    pair: selectedPair,
    timeframe,
  });
  const chartData = useMemo(() => {
    if (!data) {
      return null;
    }

    const nextCurrentPrice = liveFeed.livePrice ?? data.currentPrice;

    return {
      ...data,
      currentPrice: nextCurrentPrice,
      changePercent: liveFeed.changePercent ?? data.changePercent,
      source: liveFeed.source || data.source,
      asOf: liveFeed.lastUpdated || data.asOf,
      candles: mergeLiveCandleIntoCandles(
        data.candles || [],
        liveFeed.liveCandle,
        nextCurrentPrice
      ),
    };
  }, [data, liveFeed.changePercent, liveFeed.lastUpdated, liveFeed.liveCandle, liveFeed.livePrice, liveFeed.source]);

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
    }, BACKGROUND_RESYNC_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [selectedPair, timeframe]);

  useEffect(() => {
    let active = true;

    async function loadTradingData() {
      try {
        const [portfolio, orders] = await Promise.all([
          apiRequest("/api/portfolio", { token }),
          apiRequest("/api/portfolio/orders", { token }),
        ]);

        if (!active) {
          return;
        }

        setPortfolioData({
          portfolio,
          orders,
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setTradeError(loadError.message || "Failed to load trading data");
      }
    }

    loadTradingData();

    return () => {
      active = false;
    };
  }, [token]);

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

  const candles = chartData?.candles || [];
  const latestCandle = candles[candles.length - 1];
  const candleClose = latestCandle?.close ?? chartData?.currentPrice ?? 0;
  const candleMove = latestCandle ? latestCandle.close - latestCandle.open : 0;
  const candleMovePercent = latestCandle?.open
    ? (candleMove / latestCandle.open) * 100
    : 0;
  const visibleSlice = candles.slice(-visibleCandles);
  const visibleLatestCandle = visibleSlice[visibleSlice.length - 1] || latestCandle;
  const streamConnected = liveFeed.status === "connected";
  const effectiveLastUpdated = liveFeed.lastUpdated
    ? new Date(liveFeed.lastUpdated)
    : chartData?.asOf
      ? new Date(chartData.asOf)
      : null;
  const liveFeedLabel = streamConnected
    ? "Live stream connected"
    : liveFeed.status === "reconnecting"
      ? "Reconnecting live stream..."
      : refreshing
        ? "Background resync in progress"
        : "REST fallback active";
  const currentPosition = portfolioData?.portfolio?.holdings?.find(
    (holding) => holding.pair === selectedPair
  );
  const recentOrders = (portfolioData?.orders || [])
    .filter((order) => order.pair === selectedPair)
    .slice(0, 4);
  const sideIntent =
    side === "Buy"
      ? "Build a long or cover an open short."
      : "Reduce a long or open and extend a short.";

  async function handleSubmitTrade(event) {
    event.preventDefault();

    try {
      setSubmittingTrade(true);
      setTradeError("");
      setTradeSuccess("");

      const result = await apiRequest("/api/trading/orders", {
        token,
        method: "POST",
        body: JSON.stringify({
          side,
          symbol: selectedPair,
          quantity: Number(quantity),
          orderType,
          limitPrice: orderType === "Limit" ? Number(limitPrice) || null : null,
          stopLoss: stopLoss ? Number(stopLoss) : null,
          timeInForce,
          note: "Submitted from full screen chart",
        }),
      });

      setPortfolioData((prev) => ({
        portfolio: result.portfolio,
        orders: [result.order, ...(prev?.orders || [])],
      }));
      setTradeSuccess(
        `${result.order.side} order placed for ${result.order.quantity} ${result.order.pair}.`
      );
      setQuantity(1);
      setLimitPrice("");
      setStopLoss("");
    } catch (submitError) {
      setTradeError(submitError.message || "Failed to place order");
    } finally {
      setSubmittingTrade(false);
    }
  }

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
              {liveFeedLabel}
            </div>
            {effectiveLastUpdated ? (
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Updated at {effectiveLastUpdated.toLocaleTimeString()}
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

        <div style={workspaceStyle}>
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

          <aside style={tradePanelStyle}>
            <div style={tradeHeaderStyle}>
              <div style={toolLabelStyle}>Trade From Chart</div>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                {selectedPair} at {formatCurrency(candleClose, 4)}
              </div>
            </div>

            <div style={tradeStatsCardStyle}>
              <div style={tradeStatItemStyle}>
                <span style={snapshotKeyStyle}>Cash</span>
                <strong>
                  {formatCurrency(portfolioData?.portfolio?.cashBalance ?? 0)}
                </strong>
              </div>
              <div style={tradeStatItemStyle}>
                <span style={snapshotKeyStyle}>Equity</span>
                <strong>
                  {formatCurrency(portfolioData?.portfolio?.equityValue ?? 0)}
                </strong>
              </div>
              <div style={tradeStatItemStyle}>
                <span style={snapshotKeyStyle}>Position</span>
                <strong>
                  {currentPosition
                    ? `${currentPosition.direction} ${currentPosition.absoluteQuantity}`
                    : "Flat"}
                </strong>
              </div>
              <div style={tradeStatItemStyle}>
                <span style={snapshotKeyStyle}>Avg Price</span>
                <strong>
                  {formatCurrency(currentPosition?.averagePrice ?? 0, 4)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSubmitTrade} style={tradeFormStyle}>
              <div style={fieldGridStyle}>
                <label style={labelStyle}>
                  Action
                  <select
                    value={side}
                    onChange={(event) => setSide(event.target.value)}
                    style={controlStyle}
                  >
                    <option>Buy</option>
                    <option>Sell</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  Quantity
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    style={controlStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border:
                    side === "Buy"
                      ? "1px solid rgba(34, 197, 94, 0.28)"
                      : "1px solid rgba(248, 113, 113, 0.28)",
                  background:
                    side === "Buy"
                      ? "rgba(20, 83, 45, 0.2)"
                      : "rgba(127, 29, 29, 0.18)",
                  fontSize: 13,
                  color: "#cbd5e1",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {side === "Buy" ? "Long / Cover Intent" : "Short / Reduce Intent"}
                </div>
                <div style={{ color: "#94a3b8", lineHeight: 1.6 }}>{sideIntent}</div>
              </div>

              <div style={fieldGridStyle}>
                <label style={labelStyle}>
                  Order Type
                  <select
                    value={orderType}
                    onChange={(event) => setOrderType(event.target.value)}
                    style={controlStyle}
                  >
                    <option>Market</option>
                    <option>Limit</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  Time In Force
                  <select
                    value={timeInForce}
                    onChange={(event) => setTimeInForce(event.target.value)}
                    style={controlStyle}
                  >
                    <option>Day</option>
                    <option>GTC</option>
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Limit Price
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(event) => setLimitPrice(event.target.value)}
                  placeholder="Required for limit orders"
                  style={controlStyle}
                />
              </label>

              <label style={labelStyle}>
                Stop Loss
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(event) => setStopLoss(event.target.value)}
                  placeholder="Optional"
                  style={controlStyle}
                />
              </label>

              {tradeError ? <div style={tradeErrorStyle}>{tradeError}</div> : null}
              {tradeSuccess ? <div style={tradeSuccessStyle}>{tradeSuccess}</div> : null}

              <button
                type="submit"
                disabled={submittingTrade}
                style={{
                  ...submitTradeButtonStyle,
                  background:
                    side === "Buy"
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : "linear-gradient(135deg, #f87171, #ef4444)",
                }}
              >
                {submittingTrade
                  ? "Submitting..."
                  : side === "Buy"
                    ? `Buy / Cover ${selectedPair}`
                    : `Sell / Short ${selectedPair}`}
              </button>
            </form>

            <div style={recentOrdersCardStyle}>
              <div style={toolLabelStyle}>Recent Orders</div>
              {recentOrders.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  No recent orders for this pair yet.
                </div>
              ) : (
                <div style={recentOrdersListStyle}>
                  {recentOrders.map((order) => (
                    <div key={order.id} style={recentOrderItemStyle}>
                      <div style={{ fontWeight: 700 }}>
                        {order.side} {order.quantity} {order.pair}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {formatCurrency(
                          order.executedPrice || order.requestedPrice || 0,
                          4
                        )}{" "}
                        - {order.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
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

const workspaceStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.9fr) minmax(320px, 0.9fr)",
  gap: 18,
  flex: 1,
  minHeight: 0,
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

const tradePanelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  minHeight: 0,
};

const tradeHeaderStyle = {
  borderRadius: 18,
  border: "1px solid rgba(51, 65, 85, 0.8)",
  background: "rgba(15, 23, 42, 0.75)",
  padding: 14,
};

const tradeStatsCardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(51, 65, 85, 0.8)",
  background: "rgba(15, 23, 42, 0.75)",
  padding: 14,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const tradeStatItemStyle = {
  padding: 10,
  borderRadius: 14,
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(30, 41, 59, 0.9)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const tradeFormStyle = {
  borderRadius: 18,
  border: "1px solid rgba(51, 65, 85, 0.8)",
  background: "rgba(15, 23, 42, 0.75)",
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const submitTradeButtonStyle = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  color: "#0b1120",
  cursor: "pointer",
  fontWeight: 800,
};

const tradeErrorStyle = {
  fontSize: 12,
  color: "#fca5a5",
};

const tradeSuccessStyle = {
  fontSize: 12,
  color: "#86efac",
};

const recentOrdersCardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(51, 65, 85, 0.8)",
  background: "rgba(15, 23, 42, 0.75)",
  padding: 14,
};

const recentOrdersListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const recentOrderItemStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(30, 41, 59, 0.9)",
};
