// src/pages/Dashboard.js
import MainLayout from "../layout/MainLayout";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  return (
    <MainLayout>
      <h1 className="page-title">Dashboard — Portfolio Overview</h1>
      <p className="page-subtitle">
        High-level view of your simulated account equity, positions, and
        recent trades.
      </p>

      {/* Top stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          label="Account Equity"
          value="$10,000"
          note="+$250 today"
        />
        <StatCard label="Open P/L" value="+$120" note="+1.2%" />
        <StatCard
          label="Win Rate"
          value="58%"
          note="Last 30 simulated trades"
        />
      </div>

      {/* Lower section: positions + trades + chart */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.5fr",
          gap: "16px",
        }}
      >
        {/* Open Positions */}
        <div className="card">
          <h2>Open Positions</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Entry</th>
                <th>Last</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AAPL</td>
                <td>10</td>
                <td>$180.00</td>
                <td>$185.50</td>
                <td className="text-green">+$55</td>
              </tr>
              <tr>
                <td>TSLA</td>
                <td>5</td>
                <td>$240.00</td>
                <td>$235.20</td>
                <td className="text-red">-$24</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right side: recent trades + chart placeholder */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card">
            <h2>Recent Trades</h2>
            <ul
              style={{
                fontSize: "13px",
                paddingLeft: "18px",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              <li>BUY 10 AAPL @ 180.00 — Simulated</li>
              <li>SELL 5 TSLA @ 235.20 — Simulated</li>
              <li>BUY 2 MSFT @ 420.00 — Simulated</li>
            </ul>
          </div>

          <div
            className="card"
            style={{
              minHeight: "130px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            Performance chart placeholder (equity curve)
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
