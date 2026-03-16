// src/pages/Charts.js
import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";

export default function Charts() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1H");

  return (
    <MainLayout>
      <h1 className="page-title">Charts</h1>
      <p className="page-subtitle">
        Visualize price action using candlestick charts and different time
        frames (placeholder).
      </p>

      {/* Controls */}
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
          <label style={{ fontSize: 13, color: "#cbd5f5" }}>
            Trading Pair
          </label>
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
                  background:
                    timeframe === tf ? "#7c3aed" : "transparent",
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

      {/* Chart placeholder */}
      <div
        className="card"
        style={{
          height: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: 13,
        }}
      >
        [ Candlestick chart placeholder for {selectedPair} —{" "}
        {timeframe} timeframe ]
      </div>
    </MainLayout>
  );
}
