import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";

export default function StrategyLab() {
  const { token } = useAuth();
  const [timeframe, setTimeframe] = useState("1H");
  const [symbol, setSymbol] = useState("BTC");
  const [startingBalance, setStartingBalance] = useState(10000);
  const [fastMa, setFastMa] = useState(5);
  const [slowMa, setSlowMa] = useState(12);
  const [rsiSellThreshold, setRsiSellThreshold] = useState(70);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function runBacktest() {
    try {
      setRunning(true);
      setError("");
      const data = await apiRequest("/api/strategy/backtest", {
        token,
        method: "POST",
        body: JSON.stringify({
          symbol,
          quote: "USDT",
          timeframe,
          startingBalance: Number(startingBalance),
          fastMa: Number(fastMa),
          slowMa: Number(slowMa),
          rsiSellThreshold: Number(rsiSellThreshold),
        }),
      });
      setResult(data);
    } catch (runError) {
      setError(runError.message || "Backtest failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <MainLayout>
      <h1 className="page-title">Strategy Lab — Backtesting Workspace</h1>
      <p className="page-subtitle">
        Test a simple moving-average crossover strategy with an RSI-based exit
        rule against historical market data.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 2fr",
          gap: "16px",
        }}
      >
        <div className="card">
          <h2>Backtest Settings</h2>

          <Field label="Symbol">
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={controlStyle}>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="SOL">SOL</option>
            </select>
          </Field>

          <Field label="Timeframe">
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={controlStyle}>
              <option value="15M">15 minutes</option>
              <option value="1H">1 hour</option>
              <option value="4H">4 hours</option>
              <option value="1D">1 day</option>
            </select>
          </Field>

          <Field label="Starting Balance (USDT)">
            <input type="number" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} style={controlStyle} />
          </Field>

          <Field label="Fast Moving Average">
            <input type="number" value={fastMa} onChange={(e) => setFastMa(e.target.value)} style={controlStyle} />
          </Field>

          <Field label="Slow Moving Average">
            <input type="number" value={slowMa} onChange={(e) => setSlowMa(e.target.value)} style={controlStyle} />
          </Field>

          <Field label="RSI Sell Threshold">
            <input type="number" value={rsiSellThreshold} onChange={(e) => setRsiSellThreshold(e.target.value)} style={controlStyle} />
          </Field>

          <button
            onClick={runBacktest}
            disabled={running}
            data-cy="strategy-run-backtest"
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
            {running ? "Running Backtest..." : "Run Backtest"}
          </button>

          {error ? (
            <p style={{ marginTop: 8, fontSize: 12, color: "#fecaca" }}>{error}</p>
          ) : null}
        </div>

        <div className="card">
          <h2>Backtest Results</h2>

          {result ? (
            <>
              <p style={{ fontSize: 13, marginBottom: 10 }}>
                Timeframe: <strong>{timeframe}</strong> | Starting balance:{" "}
                <strong>${startingBalance}</strong> | MA setup:{" "}
                <strong>{fastMa}/{slowMa}</strong>
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
                  <strong className={result.totalReturn >= 0 ? "text-green" : "text-red"}>
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
                  Number of trades: <strong>{result.tradeCount}</strong>
                </li>
                <li>
                  Final equity: <strong>${result.finalEquity}</strong>
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
                Latest signals:{" "}
                {result.trades.length === 0
                  ? "No closed trades generated."
                  : result.trades
                      .slice(-3)
                      .map((trade) => `${trade.side} @ ${trade.price}`)
                      .join(" | ")}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>
              Configure your strategy on the left and run a backtest to generate
              total return, win rate, max drawdown, and trade count.
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, color: "#cbd5f5" }}>{label}</label>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

const controlStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #1f2937",
  background: "#111827",
  color: "#f9fafb",
};
