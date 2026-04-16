import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/formatters";
import {
  loadChartPreferences,
  persistChartPreferences,
  SESSION_MODE_EVENT,
  SESSION_MODE_OPTIONS,
} from "../utils/chartWorkspace";

export default function MainLayout({ children }) {
  const { user, token, isPremium, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionMode, setSessionMode] = useState(
    () => loadChartPreferences().sessionMode
  );
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [portfolioSyncedAt, setPortfolioSyncedAt] = useState(null);

  useEffect(() => {
    function syncSessionMode(event) {
      const nextMode = event?.detail || loadChartPreferences().sessionMode;
      setSessionMode(nextMode);
    }

    window.addEventListener(SESSION_MODE_EVENT, syncSessionMode);

    return () => {
      window.removeEventListener(SESSION_MODE_EVENT, syncSessionMode);
    };
  }, []);

  useEffect(() => {
    if (isPremium || sessionMode !== "REPLAY") {
      return;
    }

    const nextPreferences = {
      ...loadChartPreferences(),
      sessionMode: "LIVE",
    };

    persistChartPreferences(nextPreferences);
    setSessionMode("LIVE");
  }, [isPremium, sessionMode]);

  useEffect(() => {
    if (!token) {
      setPortfolioSummary(null);
      setPortfolioSyncedAt(null);
      return undefined;
    }

    let active = true;

    async function loadPortfolioSummary() {
      try {
        const summary = await apiRequest("/api/portfolio", { token });

        if (!active) {
          return;
        }

        setPortfolioSummary(summary);
        setPortfolioSyncedAt(new Date());
      } catch (error) {
        if (active) {
          console.error("Failed to refresh header portfolio summary:", error);
        }
      }
    }

    loadPortfolioSummary();

    const intervalId = window.setInterval(loadPortfolioSummary, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [location.pathname, token]);

  function applySessionMode(nextMode) {
    const normalizedMode =
      nextMode === "REPLAY" && !isPremium ? "LIVE" : nextMode;
    const nextPreferences = {
      ...loadChartPreferences(),
      sessionMode: normalizedMode,
    };

    persistChartPreferences(nextPreferences);
    setSessionMode(normalizedMode);
    window.dispatchEvent(
      new CustomEvent(SESSION_MODE_EVENT, {
        detail: normalizedMode,
      })
    );

    if (location.pathname !== "/charts") {
      navigate("/charts");
    }
  }

  const activeSessionMode =
    SESSION_MODE_OPTIONS.find((option) => option.value === sessionMode) ||
    SESSION_MODE_OPTIONS[0];
  const openPlValue = portfolioSummary?.unrealizedPl;
  const openPlClassName =
    typeof openPlValue !== "number"
      ? ""
      : openPlValue >= 0
        ? " header-pill-positive"
        : " header-pill-negative";
  const positionsCount = portfolioSummary?.holdings?.length ?? "--";
  const syncedLabel = portfolioSyncedAt
    ? `Synced ${portfolioSyncedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Awaiting sync";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-logo-mark">PT</div>
          <div>
            <div className="app-logo">PaperTrade</div>
            <div className="app-logo-subtitle">Crypto simulation terminal</div>
          </div>
        </div>

        <div className="app-header-info">
          <span className="header-pill">
            Trader <strong>{user?.fullName || "Trader"}</strong>
          </span>
          <span className="header-pill">
            Plan <strong>{user?.subscriptionTier || "STANDARD"}</strong>
          </span>
          <span className="header-pill">
            Equity{" "}
            <strong>
              {portfolioSummary ? formatCurrency(portfolioSummary.equityValue) : "--"}
            </strong>
          </span>
          <span className={`header-pill${openPlClassName}`}>
            Open P/L{" "}
            <strong>
              {portfolioSummary ? formatCurrency(portfolioSummary.unrealizedPl) : "--"}
            </strong>
          </span>
          <span className="header-pill">
            Positions <strong>{positionsCount}</strong>
          </span>
          <span className="header-status">
            <span className="header-status-dot" />
            Simulated Account • {syncedLabel}
          </span>
          <button className="header-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <div className="sidebar-panel">
            <div className="nav-section-title">Workspace</div>
            <div className="sidebar-title">Trading Desk</div>
            <div className="sidebar-copy">
              Monitor price action, practice execution, and review simulated
              performance from one place.
            </div>
          </div>

          <div className="nav-section-title">Main</div>
          <ul className="nav-list">
            <li>
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                <span className="nav-link-icon">01</span>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/trade"
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                <span className="nav-link-icon">02</span>
                Trading
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/watchlist"
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                <span className="nav-link-icon">03</span>
                Watchlist
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/charts"
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                <span className="nav-link-icon">04</span>
                Charts
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/learn"
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                <span className="nav-link-icon">05</span>
                Learning
                <span style={navPremiumBadgeStyle}>Premium</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/strategy"
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                <span className="nav-link-icon">06</span>
                Strategy Lab
                <span style={navPremiumBadgeStyle}>Premium</span>
              </NavLink>
            </li>
          </ul>

          <div className="sidebar-mini-card">
            <div className="sidebar-mini-label">Session Mode</div>
            <div className="sidebar-mini-value">{activeSessionMode.label}</div>
            <div className="sidebar-mini-copy">
              {activeSessionMode.description}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginTop: 14,
              }}
            >
              {SESSION_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applySessionMode(option.value)}
                  disabled={option.value === "REPLAY" && !isPremium}
                  style={sessionModeButtonStyle(
                    option.value === sessionMode,
                    option.value === "REPLAY" && !isPremium
                  )}
                >
                  {option.shortLabel}
                  {option.value === "REPLAY" && !isPremium ? " Lock" : ""}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="app-main">
          <div className="page-transition">{children}</div>
        </main>
      </div>
    </div>
  );
}

function sessionModeButtonStyle(isActive, isLocked = false) {
  return {
    padding: "9px 10px",
    borderRadius: 12,
    border: isActive
      ? "1px solid rgba(45, 212, 191, 0.42)"
      : "1px solid rgba(148, 163, 184, 0.16)",
    background: isActive
      ? "linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(8, 145, 178, 0.18))"
      : "rgba(8, 15, 28, 0.62)",
    color: isActive ? "#ecfeff" : "#cbd5e1",
    cursor: isLocked ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 700,
    opacity: isLocked ? 0.55 : 1,
  };
}

const navPremiumBadgeStyle = {
  marginLeft: "auto",
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(251, 191, 36, 0.12)",
  color: "#fcd34d",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};
