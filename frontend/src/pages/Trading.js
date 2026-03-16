// src/pages/Trading.js
import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";

const API_BASE = "http://localhost:4000";

export default function Trading() {
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [side, setSide] = useState("Buy");
  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState("Market");
  const [limitPrice, setLimitPrice] = useState("");
  const [timeInForce, setTimeInForce] = useState("Day");

  const [positions, setPositions] = useState([
    { symbol: "BTC/USDT", qty: 0.1, avgPrice: 42000, unrealizedPL: 120 },
    { symbol: "ETH/USDT", qty: 0.5, avgPrice: 2300, unrealizedPL: -35 },
  ]);

  const [orders, setOrders] = useState([
    { id: 1, text: "BUY 0.10 BTC/USDT @ 40,500 — Filled (Simulated)" },
    { id: 2, text: "SELL 0.50 ETH/USDT @ 2,350 — Filled (Simulated)" },
  ]);

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const qtyNumber = Number(qty) || 0;
    if (!symbol || qtyNumber <= 0) return;

    const priceText =
      orderType === "Market"
        ? "MKT"
        : limitPrice
        ? Number(limitPrice).toFixed(2)
        : "LIMIT";

    const localText = `${side.toUpperCase()} ${qtyNumber} ${symbol.toUpperCase()} @ ${priceText} — Simulated`;

    // 1) Update local UI immediately (for responsiveness)
    const localOrder = { id: Date.now(), text: localText };
    setOrders((prev) => [localOrder, ...prev]);

    const sign = side === "Buy" ? 1 : -1;

    setPositions((prev) => {
      const existing = prev.find(
        (p) => p.symbol.toUpperCase() === symbol.toUpperCase()
      );
      if (!existing) {
        return [
          ...prev,
          {
            symbol: symbol.toUpperCase(),
            qty: sign * qtyNumber,
            avgPrice: limitPrice ? Number(limitPrice) : 100,
            unrealizedPL: 0,
          },
        ];
      }

      return prev.map((p) => {
        if (p.symbol.toUpperCase() !== symbol.toUpperCase()) return p;
        return {
          ...p,
          qty: p.qty + sign * qtyNumber,
        };
      });
    });

    // 2) Also send to backend for persistence (best-effort)
    try {
      setSubmitting(true);
      setSubmitError("");

      const res = await fetch(`${API_BASE}/api/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side,
          symbol,
          qty: qtyNumber,
          price: orderType === "Market" ? 0 : Number(limitPrice) || 0,
          note: "Submitted from Trading UI (simulated)",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${res.status}`);
      }

      // backendTrade is not strictly needed right now, but you *could* use it
      // const backendTrade = await res.json();
    } catch (err) {
      console.error("Failed to send trade to backend:", err);
      setSubmitError("Order recorded locally but backend call failed.");
    } finally {
      setSubmitting(false);
    }

    // Reset qty but keep symbol/side
    setQty(1);
  }

  function handleReset() {
    setSymbol("BTC/USDT");
    setSide("Buy");
    setQty(1);
    setOrderType("Market");
    setLimitPrice("");
    setTimeInForce("Day");
    setSubmitError("");
  }

  return (
    <MainLayout>
      <h1 className="page-title">Trading Module — Place Orders</h1>
      <p className="page-subtitle">
        This form simulates order placement and also records trades through the
        backend API.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 2fr",
          gap: "16px",
        }}
      >
        {/* LEFT: Order ticket */}
        <div className="card">
          <h2>Order Ticket (Simulated)</h2>
          <form onSubmit={handleSubmit}>
            {/* Row 1: symbol + side */}
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
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#f9fafb",
                  }}
                >
                  <option>BTC/USDT</option>
                  <option>ETH/USDT</option>
                  <option>SOL/USDT</option>
                  <option>ADA/USDT</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#cbd5f5" }}>Side</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value)}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#f9fafb",
                  }}
                >
                  <option>Buy</option>
                  <option>Sell</option>
                </select>
              </div>
            </div>

            {/* Row 2: qty + order type */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div>
                <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#f9fafb",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                  Order Type
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#f9fafb",
                  }}
                >
                  <option>Market</option>
                  <option>Limit</option>
                </select>
              </div>
            </div>

            {/* Limit price */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                Limit Price (USDT)
              </label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="Used when Order Type = Limit"
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1f2937",
                  background: "#111827",
                  color: "#f9fafb",
                }}
              />
            </div>

            {/* Time in force */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: 13, color: "#cbd5f5" }}>
                Time in Force
              </label>
              <select
                value={timeInForce}
                onChange={(e) => setTimeInForce(e.target.value)}
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1f2937",
                  background: "#111827",
                  color: "#f9fafb",
                }}
              >
                <option>Day</option>
                <option>GTC</option>
              </select>
            </div>

            {/* Error, if backend fails */}
            {submitError && (
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 12,
                  color: "#fca5a5",
                }}
              >
                {submitError}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background:
                    side === "Buy" ? "#22c55e" : "#f87171",
                  opacity: submitting ? 0.8 : 1,
                  color: "#0b0f19",
                  fontWeight: 600,
                  cursor: submitting ? "default" : "pointer",
                }}
              >
                {submitting ? "Submitting..." : "Submit Order"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #4b5563",
                  background: "transparent",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: same as before – market snapshot, positions, orders, news */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto auto auto",
            gap: "16px",
          }}
        >
          <div className="card">
            <h2>Market Snapshot (Simulated)</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Last</th>
                  <th>24h Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>BTC/USDT</td>
                  <td>$42,310</td>
                  <td className="text-green">+2.1%</td>
                </tr>
                <tr>
                  <td>ETH/USDT</td>
                  <td>$2,310</td>
                  <td className="text-red">-0.8%</td>
                </tr>
                <tr>
                  <td>SOL/USDT</td>
                  <td>$98.20</td>
                  <td className="text-green">+4.3%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Open Positions (Simulated)</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Qty</th>
                  <th>Avg Price</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.symbol}>
                    <td>{p.symbol}</td>
                    <td>{p.qty}</td>
                    <td>${p.avgPrice.toFixed(2)}</td>
                    <td
                      className={
                        p.unrealizedPL >= 0 ? "text-green" : "text-red"
                      }
                    >
                      {p.unrealizedPL >= 0 ? "+" : ""}
                      {p.unrealizedPL}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.6fr",
              gap: "16px",
            }}
          >
            <div className="card">
              <h2>Recent Orders</h2>
              <ul
                style={{
                  fontSize: 13,
                  paddingLeft: 18,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {orders.map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>Latest News for {symbol}</h2>
              <ul
                style={{
                  fontSize: 13,
                  paddingLeft: 18,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                <li>
                  {symbol} volatility expected to increase this week
                  (simulated).
                </li>
                <li>
                  Funding rates normalize as traders reduce leverage
                  (simulated).
                </li>
                <li>
                  Market sentiment: cautiously bullish on majors (simulated).
                </li>
              </ul>
              <p
                className="text-muted"
                style={{ marginTop: 8, fontSize: 11 }}
              >
                * In a later milestone this will be powered by a real news API
                for the selected asset.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
