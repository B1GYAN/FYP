import { useCallback } from "react";
import MainLayout from "../layout/MainLayout";
import StatCard from "../components/StatCard";
import LoadingCard from "../components/LoadingCard";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../config/apiClient";
import useAsyncData from "../hooks/useAsyncData";
import { formatCurrency, formatPercent } from "../utils/formatters";

export default function Dashboard() {
  const { token } = useAuth();
  const loadDashboard = useCallback(async () => {
    const [portfolio, transactions] = await Promise.all([
      apiRequest("/api/portfolio", { token }),
      apiRequest("/api/portfolio/transactions", { token }),
    ]);

    return { portfolio, transactions };
  }, [token]);
  const { data, loading, error } = useAsyncData(loadDashboard);

  if (loading) {
    return (
      <MainLayout>
        <LoadingCard text="Loading portfolio dashboard..." />
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

  const portfolio = data?.portfolio;
  const transactions = data?.transactions || [];

  return (
    <MainLayout>
      <h1 className="page-title">Dashboard: Portfolio Overview</h1>
      <p className="page-subtitle">
        High-level view of your simulated account equity, positions, and
        recent trades.
      </p>

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
          value={formatCurrency(portfolio.equityValue)}
          note={`${formatCurrency(portfolio.cashBalance)} cash`}
        />
        <StatCard
          label="Open P/L"
          value={formatCurrency(portfolio.unrealizedPl)}
          note={formatPercent(
            portfolio.equityValue
              ? (portfolio.unrealizedPl / portfolio.equityValue) * 100
              : 0
          )}
        />
        <StatCard
          label="Realized P/L"
          value={formatCurrency(portfolio.realizedPl)}
          note={`${portfolio.holdings.length} open holdings`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.5fr",
          gap: "16px",
        }}
      >
        <div className="card">
          <h2>Open Positions</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Entry</th>
                <th>Last</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-muted">
                    No open positions yet. Place a trade to start building your
                    portfolio.
                  </td>
                </tr>
              ) : (
                portfolio.holdings.map((holding) => (
                  <tr key={holding.id}>
                    <td>{holding.pair}</td>
                    <td
                      className={
                        holding.direction === "LONG" ? "text-green" : "text-red"
                      }
                    >
                      {holding.direction}
                    </td>
                    <td>{holding.absoluteQuantity}</td>
                    <td>{formatCurrency(holding.averagePrice, 4)}</td>
                    <td>{formatCurrency(holding.currentPrice, 4)}</td>
                    <td
                      className={
                        holding.unrealizedPl >= 0 ? "text-green" : "text-red"
                      }
                    >
                      {formatCurrency(holding.unrealizedPl)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
              {transactions.length === 0 ? (
                <li>No trades executed yet.</li>
              ) : (
                transactions.slice(0, 5).map((trade) => (
                  <li key={trade.id}>
                    {trade.side} {trade.quantity} {trade.pair} @{" "}
                    {formatCurrency(trade.price, 4)}
                  </li>
                ))
              )}
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
            Active positions value: {formatCurrency(portfolio.positionsValue)}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
