// src/layout/MainLayout.js
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      {/* Top header */}
      <header className="app-header">
        <div className="app-logo">PaperTrade</div>
        <div className="app-header-info">
          <span>
            Welcome, <strong>{user?.fullName || "Trader"}</strong>
          </span>
          <span>
            Equity: <strong>$10,000</strong>
          </span>
          <span>
            Today&apos;s P/L:{" "}
            <strong className="text-green">+$250</strong>
          </span>
          <span className="text-muted">Simulated Account</span>
          <button className="header-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* Body: sidebar + main content */}
      <div className="app-body">
        {/* Sidebar */}
        <aside className="app-sidebar">
          <div className="nav-section-title">Main</div>
          <ul className="nav-list">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
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
                Learning
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/strategy"
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                Strategy Lab
              </NavLink>
            </li>
          </ul>
        </aside>

        {/* Main content */}
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
