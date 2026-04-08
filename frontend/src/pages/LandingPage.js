import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const featureHighlights = [
  "Practice long and short intraday trading with a paper account.",
  "Monitor multi-timeframe charts, saved layouts, and watchlists.",
  "Unlock replay, learning, and strategy testing on Premium.",
];

const planCards = [
  {
    name: "Standard",
    price: "Free",
    accent: "#7dd3fc",
    features: [
      "Dashboard, trading ticket, watchlist, and live charts",
      "Paper portfolio tracking and order history",
      "Perfect for baseline trading practice",
    ],
  },
  {
    name: "Premium",
    price: "$19/mo",
    accent: "#fbbf24",
    features: [
      "Learning Hub lessons and quizzes",
      "Strategy Lab backtesting workspace",
      "Replay mode for candle-by-candle practice",
    ],
  },
];

export default function LandingPage() {
  const { isAuthenticated, isPremium } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 20px 48px",
        background:
          "radial-gradient(circle at top left, rgba(20, 184, 166, 0.2), transparent 28%), radial-gradient(circle at top right, rgba(251, 191, 36, 0.14), transparent 24%), linear-gradient(180deg, #020617 0%, #020617 100%)",
        color: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 42,
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em" }}>
              PaperTrade
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
              Crypto simulation terminal for practice, replay, and strategy study
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isAuthenticated ? (
              <Link to="/dashboard" style={landingPrimaryButtonStyle}>
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" style={landingSecondaryButtonStyle}>
                  Login
                </Link>
                <Link to="/register" style={landingPrimaryButtonStyle}>
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.85fr)",
            gap: 22,
            alignItems: "stretch",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              padding: 30,
              borderRadius: 28,
              border: "1px solid rgba(148, 163, 184, 0.12)",
              background:
                "linear-gradient(145deg, rgba(15, 23, 42, 0.94), rgba(7, 12, 23, 0.98))",
              boxShadow: "0 28px 70px rgba(2, 6, 23, 0.5)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(8, 15, 28, 0.76)",
                border: "1px solid rgba(45, 212, 191, 0.2)",
                color: "#99f6e4",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Subscription-ready Trading Platform
            </div>

            <h1 style={{ fontSize: "clamp(42px, 6vw, 72px)", lineHeight: 1, margin: 0 }}>
              Train like a trader.
              <br />
              Upgrade when you want deeper tools.
            </h1>
            <p
              style={{
                marginTop: 18,
                maxWidth: 720,
                fontSize: 16,
                color: "#cbd5e1",
                lineHeight: 1.8,
              }}
            >
              PaperTrade gives every user a live trading workspace and keeps replay,
              learning, and strategy research reserved for Premium members.
            </p>

            <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
              {featureHighlights.map((item) => (
                <div key={item} style={featureRowStyle}>
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                style={landingPrimaryButtonStyle}
              >
                {isAuthenticated ? "Go to Dashboard" : "Create Account"}
              </Link>
              <Link to="/charts" style={landingSecondaryButtonStyle}>
                Explore Charts
              </Link>
            </div>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 28,
              border: "1px solid rgba(148, 163, 184, 0.12)",
              background: "rgba(8, 15, 28, 0.82)",
            }}
          >
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
              Account Flow
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 14 }}>
              {isAuthenticated
                ? isPremium
                  ? "Premium account active"
                  : "Standard account active"
                : "Get started in under a minute"}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={miniMetricStyle}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Step 1</span>
                <strong>{isAuthenticated ? "Signed in" : "Create an account"}</strong>
              </div>
              <div style={miniMetricStyle}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Step 2</span>
                <strong>Select Standard or Premium</strong>
              </div>
              <div style={miniMetricStyle}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Step 3</span>
                <strong>Open the dashboard and start practicing</strong>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {planCards.map((plan) => (
            <div
              key={plan.name}
              style={{
                padding: 22,
                borderRadius: 24,
                border: `1px solid ${plan.accent === "#fbbf24"
                  ? "rgba(251, 191, 36, 0.26)"
                  : "rgba(125, 211, 252, 0.2)"}`,
                background: "rgba(8, 15, 28, 0.76)",
              }}
            >
              <div style={{ fontSize: 12, color: plan.accent, textTransform: "uppercase" }}>
                {plan.name} Plan
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, marginTop: 10 }}>
                {plan.price}
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                {plan.features.map((feature) => (
                  <div key={feature} style={featureRowStyle}>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const landingPrimaryButtonStyle = {
  padding: "13px 18px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #14b8a6, #0f766e)",
  color: "#ecfeff",
  textDecoration: "none",
  fontWeight: 800,
};

const landingSecondaryButtonStyle = {
  padding: "13px 18px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(8, 15, 28, 0.68)",
  color: "#f8fafc",
  textDecoration: "none",
  fontWeight: 700,
};

const featureRowStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "rgba(15, 23, 42, 0.7)",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  color: "#e2e8f0",
  fontSize: 14,
  lineHeight: 1.6,
};

const miniMetricStyle = {
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.1)",
  background: "rgba(15, 23, 42, 0.74)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
