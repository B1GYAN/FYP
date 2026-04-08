// src/pages/Watchlist.js
import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/formatters";

export default function Watchlist() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [newPair, setNewPair] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // ---- Load watchlist from backend on mount ----
  useEffect(() => {
    async function fetchWatchlist() {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest("/api/watchlist", { token });
        setItems(data);
      } catch (err) {
        console.error("Failed to load watchlist:", err);
        setError("Failed to load watchlist from server.");
      } finally {
        setLoading(false);
      }
    }

    fetchWatchlist();
  }, [token]);

  // ---- Add pair via backend ----
  async function addPair(e) {
    e.preventDefault();
    const trimmed = newPair.trim();
    if (!trimmed) return;

    try {
      setAdding(true);
      setError("");

      const newItem = await apiRequest("/api/watchlist", {
        token,
        method: "POST",
        body: JSON.stringify({ pair: trimmed }),
      });
      setItems((prev) => [...prev, newItem]);
      setNewPair("");
    } catch (err) {
      console.error("Failed to add pair:", err);
      setError("Failed to add pair. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <MainLayout>
      <h1 className="page-title">Watchlist</h1>
      <p className="page-subtitle">
        Keep your highest-interest pairs close so you can move from scanning to
        charting and trading without friction.
      </p>

      {/* Add form */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: "#cbd5f5" }}>
            Add trading pair (e.g., BTC/USDT)
          </label>
          <input
            value={newPair}
            onChange={(e) => setNewPair(e.target.value)}
            placeholder="Symbol / Quote"
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
          onClick={addPair}
          disabled={adding}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "none",
            background: adding ? "#4b5563" : "#7c3aed",
            color: "#f9fafb",
            fontWeight: 600,
            cursor: adding ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            borderColor: "#f97373",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Main table / loading states */}
      <div className="card">
        <h2>Current Watchlist</h2>

        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
        ) : items.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            No pairs added yet. Use the form above to add your first symbol.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Pair</th>
                <th>Last Price (USDT)</th>
                <th>24h Change</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>{s.pair}</td>
                  <td>{s.price === "--" ? "--" : formatCurrency(s.price, 4)}</td>
                  <td
                    className={
                      s.change && s.change.toString().startsWith("+")
                        ? "text-green"
                        : "text-red"
                    }
                  >
                    {s.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="text-muted" style={{ marginTop: 8, fontSize: 11 }}>
          Monitoring {items.length} pair{items.length === 1 ? "" : "s"} from your
          saved watchlist.
        </p>
      </div>
    </MainLayout>
  );
}
