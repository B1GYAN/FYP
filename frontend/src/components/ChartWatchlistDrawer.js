import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/formatters";

export default function ChartWatchlistDrawer({
  items,
  loading,
  error,
  selectedPair,
  favoritePairs,
  onSelectPair,
  onToggleFavorite,
}) {
  const nextItems = items.filter((item) => item.pair !== selectedPair);

  return (
    <div className="card chart-side-panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div>
          <h2 style={{ marginBottom: 4 }}>Watchlist Drawer</h2>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Quick pair switching and chart favorites.
          </div>
        </div>
        <Link to="/watchlist" style={watchlistManageLinkStyle}>
          Manage
        </Link>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading watchlist...</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: "#fecaca" }}>{error}</div>
      ) : nextItems.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          No other watchlist items yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {nextItems.map((item) => {
            const isFavorite = favoritePairs.includes(item.pair);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPair(item.pair)}
                style={watchlistItemButtonStyle}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700 }}>{item.pair}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {item.price === "--" ? "--" : formatCurrency(item.price, 4)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      className={
                        String(item.change || "").startsWith("+")
                          ? "text-green"
                          : "text-red"
                      }
                      style={{ fontWeight: 700 }}
                    >
                      {item.change}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFavorite(item.pair);
                        }}
                        style={{
                          fontSize: 12,
                          color: isFavorite ? "#fbbf24" : "#94a3b8",
                        }}
                      >
                        {isFavorite ? "Unstar" : "Star"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const watchlistManageLinkStyle = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(45, 212, 191, 0.22)",
  color: "#99f6e4",
  fontSize: 12,
};

const watchlistItemButtonStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.12)",
  background: "rgba(8, 15, 28, 0.68)",
  color: "#f8fafc",
  cursor: "pointer",
};
