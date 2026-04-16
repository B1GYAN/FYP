import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingCard from "../components/LoadingCard";
import MainLayout from "../layout/MainLayout";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatPercent } from "../utils/formatters";

const REFRESH_INTERVAL_MS = 5000;
const QUICK_ADD_LIMIT = 6;

export default function Watchlist() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [marketOverview, setMarketOverview] = useState([]);
  const [newPair, setNewPair] = useState("");
  const [selectedPair, setSelectedPair] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadWorkspace = useCallback(
    async ({ background = false, focusPair = "" } = {}) => {
      if (!token) {
        return;
      }

      try {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
          setError("");
        }

        const [watchlistResult, marketResult] = await Promise.allSettled([
          apiRequest("/api/watchlist", { token }),
          apiRequest("/api/market/overview"),
        ]);

        if (watchlistResult.status !== "fulfilled") {
          throw watchlistResult.reason;
        }

        const nextItems = watchlistResult.value;
        setItems(nextItems);
        setSelectedPair((current) => {
          const preferredPair = focusPair || current;

          if (preferredPair && nextItems.some((item) => item.pair === preferredPair)) {
            return preferredPair;
          }

          return nextItems[0]?.pair || "";
        });

        if (marketResult.status === "fulfilled") {
          setMarketOverview(marketResult.value);
        }

        setLastUpdated(new Date());
      } catch (loadError) {
        console.error("Failed to load watchlist workspace:", loadError);
        setError(loadError.message || "Failed to load watchlist from server.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadWorkspace();

    const intervalId = window.setInterval(() => {
      loadWorkspace({ background: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadWorkspace]);

  async function submitPair(pair) {
    try {
      setAdding(true);
      setError("");

      await apiRequest("/api/watchlist", {
        token,
        method: "POST",
        body: JSON.stringify({ pair }),
      });

      setNewPair("");
      await loadWorkspace({
        background: true,
        focusPair: pair,
      });
    } catch (submitError) {
      console.error("Failed to add pair:", submitError);
      setError(submitError.message || "Failed to add pair. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleAddPair(event) {
    event.preventDefault();
    const normalizedPair = normalizePair(newPair);

    if (!normalizedPair) {
      return;
    }

    await submitPair(normalizedPair);
  }

  const selectedItem = items.find((item) => item.pair === selectedPair) || items[0] || null;
  const selectedChange = getChangeValue(selectedItem);
  const advancers = items.filter((item) => getChangeValue(item) > 0);
  const decliners = items.filter((item) => getChangeValue(item) < 0);
  const unchangedCount = items.length - advancers.length - decliners.length;
  const breadthScore = items.length ? Math.round((advancers.length / items.length) * 100) : 0;
  const averageChange = items.length
    ? items.reduce((total, item) => total + getChangeValue(item), 0) / items.length
    : 0;
  const strongestMover = items.length
    ? [...items].sort(
        (left, right) => Math.abs(getChangeValue(right)) - Math.abs(getChangeValue(left))
      )[0]
    : null;
  const rankedPairs = [...items].sort(
    (left, right) => Math.abs(getChangeValue(right)) - Math.abs(getChangeValue(left))
  );
  const heatmapItems = (
    marketOverview.length
      ? marketOverview
      : items.map((item) => ({
          pair: item.pair,
          price: item.price === "--" ? 0 : Number(item.price),
          change: getChangeValue(item),
          source: item.marketSource || "feed",
        }))
  )
    .sort((left, right) => Math.abs(getChangeValue(right)) - Math.abs(getChangeValue(left)))
    .slice(0, 8);
  const quickAddItems = marketOverview
    .filter((asset) => !items.some((item) => item.pair === asset.pair))
    .sort((left, right) => Math.abs(right.change) - Math.abs(left.change))
    .slice(0, QUICK_ADD_LIMIT);
  const selectedOverview =
    marketOverview.find((asset) => asset.pair === selectedItem?.pair) || selectedItem;
  const pulseLabel = refreshing
    ? "Refreshing live market feed"
    : lastUpdated
      ? `Live sync ${formatTimeLabel(lastUpdated)}`
      : "Waiting for first market sync";

  return (
    <MainLayout>
      <div className="watchlist-page">
        <section className="card page-hero watchlist-hero">
          <div className="watchlist-overline">
            <span className={`live-dot${refreshing ? " live-dot-refreshing" : ""}`} />
            Market Radar
          </div>

          <div className="watchlist-hero-header">
            <div>
              <h1 className="page-title watchlist-title">
                A faster watchlist that scans like a trading workspace.
              </h1>
              <p className="page-subtitle watchlist-subtitle">
                Built around the live market-summary rhythm on{" "}
                <a
                  href="https://www.tradingview.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="watchlist-inline-link"
                >
                  TradingView
                </a>
                : ranked movers, quick routing into charts, and stronger hierarchy
                than the old single-card table.
              </p>
            </div>

            <div className="watchlist-hero-actions">
              <div className="watchlist-sync-pill">
                <span className={`live-dot${refreshing ? " live-dot-refreshing" : ""}`} />
                {pulseLabel}
              </div>
              <div className="watchlist-button-row">
                <button
                  type="button"
                  className="watchlist-button watchlist-button-primary"
                  onClick={() => navigate("/charts")}
                >
                  Open Charts
                </button>
                <button
                  type="button"
                  className="watchlist-button"
                  onClick={() => navigate("/trade")}
                >
                  Open Trading
                </button>
              </div>
            </div>
          </div>

          <div className="watchlist-kpi-grid">
            <KpiCard
              label="Tracked Pairs"
              value={String(items.length).padStart(2, "0")}
              note={`${advancers.length} green, ${decliners.length} red, ${unchangedCount} flat`}
              accent="#7dd3fc"
            />
            <KpiCard
              label="Breadth"
              value={`${breadthScore}%`}
              note="Share of watchlist symbols trading positive over 24h"
              accent={breadthScore >= 50 ? "#6ee7b7" : "#fda4af"}
            />
            <KpiCard
              label="Average Move"
              value={formatPercent(averageChange)}
              note="Mean 24h move across all saved pairs"
              accent={averageChange >= 0 ? "#6ee7b7" : "#fda4af"}
            />
            <KpiCard
              label="Fastest Mover"
              value={strongestMover?.pair || "No pairs yet"}
              note={
                strongestMover
                  ? `${strongestMover.change} with ${strongestMover.marketSource || "market"} pricing`
                  : "Add a pair to begin monitoring market momentum"
              }
              accent="#fbbf24"
            />
          </div>
        </section>

        <section className="card watchlist-toolbar-card">
          <div className="watchlist-toolbar-head">
            <div>
              <h2>Build the tape</h2>
              <p className="watchlist-section-copy">
                Add pairs manually or pull from the current market overview.
              </p>
            </div>
            <div className="watchlist-mini-stat">
              {selectedItem ? `Focused on ${selectedItem.pair}` : "Select a pair to inspect"}
            </div>
          </div>

          <form className="watchlist-form" onSubmit={handleAddPair}>
            <label className="watchlist-input-group">
              <span className="watchlist-input-label">Add trading pair</span>
              <input
                value={newPair}
                onChange={(event) => setNewPair(event.target.value)}
                placeholder="BTC/USDT"
                className="watchlist-input"
              />
            </label>
            <button
              type="submit"
              disabled={adding}
              className="watchlist-button watchlist-button-primary watchlist-add-button"
            >
              {adding ? "Adding..." : "Add to Watchlist"}
            </button>
          </form>

          {quickAddItems.length ? (
            <div className="watchlist-chip-row">
              {quickAddItems.map((asset) => (
                <button
                  key={asset.pair}
                  type="button"
                  className="watchlist-chip"
                  onClick={() => submitPair(asset.pair)}
                  disabled={adding}
                >
                  <span>{asset.pair}</span>
                  <span
                    className={
                      asset.change >= 0
                        ? "watchlist-chip-move text-green"
                        : "watchlist-chip-move text-red"
                    }
                  >
                    {formatPercent(asset.change)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {error ? <div className="card watchlist-error-card">{error}</div> : null}

        {loading ? (
          <LoadingCard text="Loading watchlist workspace..." />
        ) : items.length === 0 ? (
          <div className="card watchlist-empty-state">
            <h2>Nothing is on the tape yet.</h2>
            <p className="watchlist-section-copy">
              Start with a pair like BTC/USDT or pull one of the live suggestions
              above to make the workspace feel active.
            </p>
            <div className="watchlist-button-row">
              <button
                type="button"
                className="watchlist-button watchlist-button-primary"
                onClick={() => navigate("/charts")}
              >
                Explore Charts
              </button>
              <button
                type="button"
                className="watchlist-button"
                onClick={() => navigate("/trade")}
              >
                Go to Trading
              </button>
            </div>
          </div>
        ) : (
          <div className="watchlist-shell">
            <div className="watchlist-main-column">
              <section className="card watchlist-table-card">
                <div className="watchlist-panel-header">
                  <div>
                    <h2>Saved Watchlist</h2>
                    <p className="watchlist-section-copy">
                      Click a row to route your focus into the spotlight panel.
                    </p>
                  </div>
                  <div className="watchlist-mini-stat">{items.length} active symbols</div>
                </div>

                <div className="watchlist-table-wrap">
                  <table className="table watchlist-table">
                    <thead>
                      <tr>
                        <th>Pair</th>
                        <th>Last</th>
                        <th>24h</th>
                        <th>Strength</th>
                        <th>Source</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const changeValue = getChangeValue(item);
                        const isActive = item.pair === selectedItem?.pair;

                        return (
                          <tr
                            key={item.id}
                            tabIndex={0}
                            className={isActive ? "watchlist-row-active" : "watchlist-row"}
                            onClick={() => setSelectedPair(item.pair)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedPair(item.pair);
                              }
                            }}
                          >
                            <td>
                              <div className="watchlist-pair-stack">
                                <strong>{item.pair}</strong>
                                <span>{describePair(item.pair)}</span>
                              </div>
                            </td>
                            <td>
                              {item.price === "--" ? "--" : formatCurrency(item.price, 4)}
                            </td>
                            <td>
                              <span
                                className={`watchlist-change-pill ${
                                  changeValue >= 0
                                    ? "watchlist-change-positive"
                                    : "watchlist-change-negative"
                                }`}
                              >
                                {item.change}
                              </span>
                            </td>
                            <td>
                              <StrengthMeter changeValue={changeValue} />
                            </td>
                            <td>{item.marketSource || "feed"}</td>
                            <td>{formatRelativeTime(item.lastUpdated)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card watchlist-heatmap-card">
                <div className="watchlist-panel-header">
                  <div>
                    <h2>Market Heat</h2>
                    <p className="watchlist-section-copy">
                      Quick cross-market context to make the page feel alive.
                    </p>
                  </div>
                  <div className="watchlist-mini-stat">
                    {marketOverview.length ? "Global overview" : "Watchlist fallback"}
                  </div>
                </div>

                <div className="watchlist-heatmap-grid">
                  {heatmapItems.map((asset) => {
                    const changeValue = getChangeValue(asset);

                    return (
                      <button
                        key={asset.pair}
                        type="button"
                        className="watchlist-heat-tile"
                        style={getHeatTileStyle(changeValue, asset.pair === selectedItem?.pair)}
                        onClick={() => {
                          if (items.some((item) => item.pair === asset.pair)) {
                            setSelectedPair(asset.pair);
                          } else {
                            submitPair(asset.pair);
                          }
                        }}
                      >
                        <div className="watchlist-heat-symbol">{asset.pair}</div>
                        <div className="watchlist-heat-price">
                          {formatCurrency(asset.price || 0, asset.price >= 100 ? 2 : 4)}
                        </div>
                        <div
                          className={
                            changeValue >= 0
                              ? "watchlist-heat-change text-green"
                              : "watchlist-heat-change text-red"
                          }
                        >
                          {formatPercent(changeValue)}
                        </div>
                        <div className="watchlist-heat-source">
                          {(asset.source || asset.marketSource || "feed").toUpperCase()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="watchlist-side-column">
              <section className="card watchlist-spotlight-card">
                <div className="watchlist-overline watchlist-overline-compact">
                  Spotlight
                </div>
                <h2>{selectedItem?.pair || "Select a pair"}</h2>
                <p className="watchlist-section-copy">
                  Move from scan to action without leaving the workspace.
                </p>

                {selectedItem ? (
                  <>
                    <div className="watchlist-spotlight-price">
                      {selectedItem.price === "--"
                        ? "--"
                        : formatCurrency(selectedItem.price, 4)}
                    </div>
                    <div
                      className={
                        selectedChange >= 0
                          ? "watchlist-spotlight-change text-green"
                          : "watchlist-spotlight-change text-red"
                      }
                    >
                      {selectedItem.change}
                    </div>

                    <div className="watchlist-detail-grid">
                      <DetailItem
                        label="Momentum"
                        value={getStrengthLabel(selectedChange)}
                      />
                      <DetailItem
                        label="Feed"
                        value={(selectedOverview?.source || selectedItem.marketSource || "feed").toUpperCase()}
                      />
                      <DetailItem
                        label="Updated"
                        value={formatRelativeTime(selectedItem.lastUpdated)}
                      />
                      <DetailItem
                        label="Added"
                        value={formatRelativeTime(selectedItem.addedAt)}
                      />
                    </div>

                    <div className="watchlist-button-row">
                      <button
                        type="button"
                        className="watchlist-button watchlist-button-primary"
                        onClick={() => navigate("/charts")}
                      >
                        Chart {selectedItem.pair}
                      </button>
                      <button
                        type="button"
                        className="watchlist-button"
                        onClick={() => navigate("/trade")}
                      >
                        Trade {selectedItem.symbol || selectedItem.pair.split("/")[0]}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-muted">Select a pair to see live details.</div>
                )}
              </section>

              <section className="card watchlist-tape-card">
                <div className="watchlist-panel-header">
                  <div>
                    <h2>Move Ranking</h2>
                    <p className="watchlist-section-copy">
                      Ranked by absolute 24h move so the loudest tape is always on top.
                    </p>
                  </div>
                </div>

                <div className="watchlist-tape-list">
                  {rankedPairs.map((item, index) => {
                    const changeValue = getChangeValue(item);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="watchlist-tape-item"
                        onClick={() => setSelectedPair(item.pair)}
                      >
                        <div className="watchlist-tape-rank">#{index + 1}</div>
                        <div className="watchlist-tape-copy">
                          <div className="watchlist-tape-pair">{item.pair}</div>
                          <div className="watchlist-tape-price">
                            {item.price === "--" ? "--" : formatCurrency(item.price, 4)}
                          </div>
                        </div>
                        <div
                          className={
                            changeValue >= 0
                              ? "watchlist-tape-move text-green"
                              : "watchlist-tape-move text-red"
                          }
                        >
                          {item.change}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function KpiCard({ label, value, note, accent }) {
  return (
    <div className="watchlist-kpi-card">
      <div className="watchlist-kpi-label">{label}</div>
      <div className="watchlist-kpi-value" style={{ color: accent || "#f8fafc" }}>
        {value}
      </div>
      <div className="watchlist-kpi-note">{note}</div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="watchlist-detail-item">
      <div className="watchlist-detail-label">{label}</div>
      <div className="watchlist-detail-value">{value}</div>
    </div>
  );
}

function StrengthMeter({ changeValue }) {
  const strengthWidth = `${Math.max(12, Math.min(Math.abs(changeValue) * 15, 100))}%`;

  return (
    <div className="watchlist-strength">
      <div className="watchlist-strength-bar">
        <span
          style={{
            width: strengthWidth,
            background:
              changeValue >= 0
                ? "linear-gradient(90deg, rgba(34, 197, 94, 0.4), rgba(74, 222, 128, 0.95))"
                : "linear-gradient(90deg, rgba(248, 113, 113, 0.4), rgba(251, 146, 146, 0.95))",
          }}
        />
      </div>
      <span>{getStrengthLabel(changeValue)}</span>
    </div>
  );
}

function normalizePair(value) {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("/")) {
    return trimmed;
  }

  return `${trimmed}/USDT`;
}

function getChangeValue(item) {
  const rawValue =
    typeof item?.change === "number" ? item.change : String(item?.change || "0").replace("%", "");
  const parsedValue = Number.parseFloat(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getStrengthLabel(changeValue) {
  const magnitude = Math.abs(changeValue);

  if (magnitude >= 4) {
    return "High";
  }

  if (magnitude >= 2) {
    return "Medium";
  }

  return "Low";
}

function describePair(pair) {
  const [symbol, quote = "USDT"] = pair.split("/");
  return `${symbol} priced in ${quote}`;
}

function formatRelativeTime(value) {
  if (!value) {
    return "--";
  }

  const target = new Date(value);
  const deltaMs = Date.now() - target.getTime();

  if (Number.isNaN(deltaMs)) {
    return "--";
  }

  const deltaSeconds = Math.max(0, Math.floor(deltaMs / 1000));

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  const deltaMinutes = Math.floor(deltaSeconds / 60);

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  return target.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getHeatTileStyle(changeValue, isSelected) {
  const strength = Math.max(0.16, Math.min(Math.abs(changeValue) / 8, 0.7));
  const borderColor = changeValue >= 0 ? `rgba(52, 211, 153, ${strength})` : `rgba(248, 113, 113, ${strength})`;
  const background = changeValue >= 0
    ? `linear-gradient(155deg, rgba(6, 95, 70, ${strength}), rgba(6, 11, 22, 0.96))`
    : `linear-gradient(155deg, rgba(127, 29, 29, ${strength}), rgba(6, 11, 22, 0.96))`;

  return {
    borderColor: isSelected ? "#7dd3fc" : borderColor,
    background,
    boxShadow: isSelected ? "0 0 0 1px rgba(125, 211, 252, 0.4)" : "none",
  };
}
