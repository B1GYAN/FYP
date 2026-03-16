import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";
import LoadingCard from "../components/LoadingCard";
import { apiRequest } from "../config/apiClient";
import useAsyncData from "../hooks/useAsyncData";
import { formatCurrency, formatPercent } from "../utils/formatters";

export default function Charts() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1H");
  const { data, loading, error } = useAsyncData(
    async () =>
      apiRequest(
        `/api/market/charts?pair=${encodeURIComponent(
          selectedPair
        )}&timeframe=${encodeURIComponent(timeframe)}`
      ),
    [selectedPair, timeframe]
  );

  if (loading) {
    return (
      <MainLayout>
        <LoadingCard text="Loading chart data..." />
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

  return (
    <MainLayout>
      <h1 className="page-title">Charts</h1>
      <p className="page-subtitle">
        Near-live pricing and recent candle data for your selected pair.
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
            onChange={(e) => setSelectedPair(e.target.value)}
            style={{
              marginTop: 4,
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
            <option>BNB/USDT</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, color: "#cbd5f5", marginBottom: 4 }}>
            Timeframe
          </label>
          <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
            {["15M", "1H", "4H", "1D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border:
                    timeframe === tf
                      ? "1px solid #7c3aed"
                      : "1px solid #374151",
                  background: timeframe === tf ? "#7c3aed" : "transparent",
                  color: "#f9fafb",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16, fontSize: 13, color: "#cbd5f5" }}>
          Current price: <strong>{formatCurrency(data.currentPrice, 4)}</strong>{" "}
          | 24h change:{" "}
          <strong className={data.changePercent >= 0 ? "text-green" : "text-red"}>
            {formatPercent(data.changePercent)}
          </strong>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Open</th>
              <th>High</th>
              <th>Low</th>
              <th>Close</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.candles.slice(-12).reverse().map((candle) => (
              <tr key={candle.time}>
                <td>{new Date(candle.time).toLocaleString()}</td>
                <td>{formatCurrency(candle.open, 4)}</td>
                <td>{formatCurrency(candle.high, 4)}</td>
                <td>{formatCurrency(candle.low, 4)}</td>
                <td>{formatCurrency(candle.close, 4)}</td>
                <td>{candle.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
