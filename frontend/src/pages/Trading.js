import React, { useCallback, useState } from "react";
import MainLayout from "../layout/MainLayout";
import LoadingCard from "../components/LoadingCard";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import useAsyncData from "../hooks/useAsyncData";
import { formatCurrency } from "../utils/formatters";

export default function Trading() {
  const { token } = useAuth();
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [side, setSide] = useState("Buy");
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState("Market");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [timeInForce, setTimeInForce] = useState("Day");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTradingWorkspace = useCallback(async () => {
    const [portfolio, orders, market] = await Promise.all([
      apiRequest("/api/portfolio", { token }),
      apiRequest("/api/portfolio/orders", { token }),
      apiRequest("/api/market/overview"),
    ]);

    return { portfolio, orders, market };
  }, [token]);
  const { data, setData, loading, error } = useAsyncData(loadTradingWorkspace);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setSubmitError("");

      const result = await apiRequest("/api/trading/orders", {
        token,
        method: "POST",
        body: JSON.stringify({
          side,
          symbol,
          quantity: Number(quantity),
          orderType,
          limitPrice: orderType === "Limit" ? Number(limitPrice) || null : null,
          stopLoss: stopLoss ? Number(stopLoss) : null,
          timeInForce,
          note: "Submitted from trading page",
        }),
      });

      setData((prev) => ({
        ...prev,
        portfolio: result.portfolio,
        orders: [result.order, ...(prev?.orders || [])],
      }));

      setQuantity(1);
      setLimitPrice("");
      setStopLoss("");
    } catch (submitErr) {
      setSubmitError(submitErr.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSymbol("BTC/USDT");
    setSide("Buy");
    setQuantity(1);
    setOrderType("Market");
    setLimitPrice("");
    setStopLoss("");
    setTimeInForce("Day");
    setSubmitError("");
  }

  if (loading) {
    return (
      <MainLayout>
        <LoadingCard text="Loading trading workspace..." />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="card" style={{ color: "#fecaca" }}>
          {error}
        </div>
      </MainLayout>
    );
  }

  const market = data?.market || [];
  const selectedMarket = market.find((item) => item.pair === symbol);
  const positions = data?.portfolio?.holdings || [];
  const orders = data?.orders || [];
  const selectedPosition = positions.find((position) => position.pair === symbol);
  const sideIntent =
    side === "Buy"
      ? "Build or add to a long, or cover an existing short."
      : "Reduce a long, or open or extend a short position.";

  return (
    <MainLayout>
      <h1 className="page-title">Trading Module - Intraday Orders</h1>
      <p className="page-subtitle">
        Trade both directions. Buy can build longs or cover shorts, and sell can
        reduce longs or open fresh short exposure.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="card">
          <h2>Order Ticket</h2>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div>
                <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                  Trading Pair
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  style={inputStyle}
                >
                  <option>BTC/USDT</option>
                  <option>ETH/USDT</option>
                  <option>SOL/USDT</option>
                  <option>ADA/USDT</option>
                  <option>BNB/USDT</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#cbd5f5" }}>Action</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value)}
                  style={inputStyle}
                >
                  <option>Buy</option>
                  <option>Sell</option>
                </select>
              </div>
            </div>

            <div
              style={{
                marginBottom: "12px",
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
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {side === "Buy" ? "Long / Cover Intent" : "Short / Reduce Intent"}
              </div>
              <div style={{ color: "#94a3b8", lineHeight: 1.6 }}>{sideIntent}</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div>
                <label style={{ fontSize: 13, color: "#cbd5f5" }}>Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                  Order Type
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  style={inputStyle}
                >
                  <option>Market</option>
                  <option>Limit</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                Limit Price (USDT)
              </label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="Required for limit orders"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                Stop-Loss (optional)
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Used by the learning engine"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                Time in Force
              </label>
              <select
                value={timeInForce}
                onChange={(e) => setTimeInForce(e.target.value)}
                style={inputStyle}
              >
                <option>Day</option>
                <option>GTC</option>
              </select>
            </div>

            {submitError ? (
              <div style={{ marginBottom: 10, fontSize: 12, color: "#fca5a5" }}>
                {submitError}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: side === "Buy" ? "#22c55e" : "#f87171",
                  color: "#0b0f19",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Submitting..." : side === "Buy" ? "Submit Buy / Cover" : "Submit Sell / Short"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#f9fafb",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card">
            <h2>Account Snapshot</h2>
            <p className="text-muted" style={{ fontSize: 13 }}>
              Cash balance: {formatCurrency(data.portfolio.cashBalance)} | Equity:{" "}
              {formatCurrency(data.portfolio.equityValue)}
            </p>
            <p className="text-muted" style={{ fontSize: 13 }}>
              Current price for {symbol}:{" "}
              {selectedMarket ? formatCurrency(selectedMarket.price, 4) : "--"}
            </p>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 0 }}>
              Active position for {symbol}:{" "}
              {selectedPosition
                ? `${selectedPosition.direction} ${selectedPosition.absoluteQuantity}`
                : "Flat"}
            </p>
          </div>

          <div className="card">
            <h2>Open Positions</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Qty</th>
                  <th>Avg Price</th>
                  <th>Exposure</th>
                  <th>Unrealized P/L</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-muted">
                      No open positions.
                    </td>
                  </tr>
                ) : (
                  positions.map((position) => (
                    <tr key={position.id}>
                      <td>{position.pair}</td>
                      <td
                        className={
                          position.direction === "LONG" ? "text-green" : "text-red"
                        }
                      >
                        {position.direction}
                      </td>
                      <td>{position.absoluteQuantity}</td>
                      <td>{formatCurrency(position.averagePrice, 4)}</td>
                      <td>{formatCurrency(position.exposureValue)}</td>
                      <td
                        className={
                          position.unrealizedPl >= 0 ? "text-green" : "text-red"
                        }
                      >
                        {formatCurrency(position.unrealizedPl)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Recent Orders</h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {orders.length === 0 ? (
                <li className="text-muted">No orders placed yet.</li>
              ) : (
                orders.map((order) => (
                  <li
                    key={order.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "#0f172a",
                      border: "1px solid #1f2937",
                      fontSize: 13,
                    }}
                  >
                    {order.side} {order.quantity} {order.pair} @{" "}
                    {formatCurrency(
                      order.executedPrice || order.requestedPrice || 0,
                      4
                    )}{" "}
                    - {order.status}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

const inputStyle = {
  marginTop: 4,
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #1f2937",
  background: "#111827",
  color: "#f9fafb",
};
