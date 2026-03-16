// src/pages/StrategyLab.js
import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";

export default function StrategyLab() {
  const [timeframe, setTimeframe] = useState("6M");
  const [startingBalance, setStartingBalance] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [result, setResult] = useState(null);

  function runBacktest() {
    const rand = Math.random();
    const totalReturn = (rand * 40 - 10).toFixed(2); // -10% to +30%
    const maxDrawdown = (rand * 20).toFixed(2); // 0–20%
    const winRate = (50 + rand * 30).toFixed(1); // 50–80%
    const trades = Math.floor(20 + rand * 40);

    setResult({
      totalReturn,
      maxDrawdown,
      winRate,
      trades,
    });
  }

  return (
    <MainLayout>
      <h1 className="page-title">Strategy Lab — Backtesting Workspace</h1>
      <p className="page-subtitle">
        Experiment with risk parameters and timeframes to understand how a
        strategy might perform historically (simulated).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 2fr",
          gap: "16px",
        }}
      >
        {/* LEFT: configuration */}
        <div className="card">
          <h2>Backtest Settings</h2>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: "#cbd5f5" }}>
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
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
              <option value="3M">Last 3 months</option>
              <option value="6M">Last 6 months</option>
              <option value="1Y">Last 1 year</option>
              <option value="5Y">Last 5 years</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: "#cbd5f5" }}>
              Starting Balance (USDT)
            </label>
            <input
              type="number"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "#cbd5f5" }}>
              Risk per Trade (%)
            </label>
            <input
              type="number"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(e.target.value)}
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

          <button
            onClick={runBacktest}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "none",
              background: "#0ea5e9",
              color: "#f9fafb",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Run Backtest (Simulated)
          </button>

          <p className="text-muted" style={{ marginTop: 8, fontSize: 11 }}>
            In the full system this will call a backend service to run a real
            backtest on historical data and return detailed metrics.
          </p>
        </div>

        {/* RIGHT: results */}
        <div className="card">
          <h2>Backtest Results</h2>

          {result ? (
            <>
              <p style={{ fontSize: 13, marginBottom: 10 }}>
                Timeframe: <strong>{timeframe}</strong> | Starting balance:{" "}
                <strong>${startingBalance}</strong> | Risk/trade:{" "}
                <strong>{riskPerTrade}%</strong>
              </p>

              <ul
                style={{
                  fontSize: 13,
                  marginBottom: 12,
                  paddingLeft: 18,
                  lineHeight: 1.6,
                }}
              >
                <li>
                  Total return:{" "}
                  <strong
                    className={
                      Number(result.totalReturn) >= 0
                        ? "text-green"
                        : "text-red"
                    }
                  >
                    {result.totalReturn}%
                  </strong>
                </li>
                <li>
                  Max drawdown: <strong>{result.maxDrawdown}%</strong>
                </li>
                <li>
                  Win rate: <strong>{result.winRate}%</strong>
                </li>
                <li>
                  Number of trades: <strong>{result.trades}</strong>
                </li>
              </ul>

              <div
                style={{
                  borderTop: "1px solid #1f2937",
                  paddingTop: 10,
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                Equity curve / distribution charts can be added here in future
                milestones to give a richer visual understanding of the
                strategy&apos;s behavior.
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>
              Configure your strategy parameters on the left and click{" "}
              <strong>Run Backtest</strong> to generate simulated results.
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
