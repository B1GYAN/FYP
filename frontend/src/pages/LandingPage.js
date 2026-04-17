import { Link } from "react-router-dom";
import SkrillUpgradeButton from "../components/SkrillUpgradeButton";
import terminalHero from "../assets/terminal-hero.svg";
import learningHubIllustration from "../assets/learning-hub.svg";
import strategyLabIllustration from "../assets/strategy-lab.svg";
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

const showcaseCards = [
  {
    image: terminalHero,
    tag: "Trading Terminal",
    title: "Realtime paper trading workspace",
    copy:
      "A chart-first environment for watchlists, order flow, and portfolio practice without risking capital.",
    link: "/charts",
    cta: "View Charts",
  },
  {
    image: learningHubIllustration,
    tag: "Learning Hub",
    title: "Adaptive classes tied to trading behavior",
    copy:
      "Lessons and quizzes are meant to respond to recurring mistakes so the education module feels connected to practice.",
    link: "/learn",
    cta: "Open Learning",
  },
  {
    image: strategyLabIllustration,
    tag: "Strategy Lab",
    title: "Backtesting for research-focused users",
    copy:
      "Run simplified strategy tests against historical candle data and surface return, drawdown, win rate, and trade count.",
    link: "/strategy",
    cta: "Open Strategy Lab",
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
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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
              display: "grid",
              gap: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                Product Preview
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>
                {isAuthenticated
                  ? isPremium
                    ? "Premium workspace unlocked"
                    : "Standard workspace ready"
                  : "The platform now has a visual identity"}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                The illustrations below are custom local assets added to reflect the
                app specification: trading practice, guided learning, and strategy
                analysis.
              </div>
            </div>

            <div
              style={{
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid rgba(148, 163, 184, 0.12)",
                background: "linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(7, 12, 23, 0.96))",
              }}
            >
              <img
                src={terminalHero}
                alt="PaperTrade terminal illustration showing charts, watchlist, and analytics"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={miniMetricStyle}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Trading</span>
                <strong>Chart and watchlist led market workflow</strong>
              </div>
              <div style={miniMetricStyle}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Learning</span>
                <strong>Recommendation-driven classes and quizzes</strong>
              </div>
              <div style={miniMetricStyle}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Research</span>
                <strong>Backtesting workspace for strategy experiments</strong>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
            marginBottom: 18,
          }}
        >
          {planCards.map((plan) => (
            <div
              key={plan.name}
              style={{
                padding: 22,
                borderRadius: 24,
                border: `1px solid ${
                  plan.accent === "#fbbf24"
                    ? "rgba(251, 191, 36, 0.26)"
                    : "rgba(125, 211, 252, 0.2)"
                }`,
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

              {plan.name === "Premium" ? (
                <div style={{ marginTop: 18 }}>
                  {isAuthenticated ? (
                    isPremium ? (
                      <div style={planStatusStyle}>
                        This account already has Premium access.
                      </div>
                    ) : (
                      <SkrillUpgradeButton />
                    )
                  ) : (
                    <Link to="/register" style={landingSecondaryButtonStyle}>
                      Create account to upgrade
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          {showcaseCards.map((card) => (
            <div
              key={card.title}
              style={{
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(148, 163, 184, 0.12)",
                background: "rgba(8, 15, 28, 0.76)",
              }}
            >
              <img
                src={card.image}
                alt={card.title}
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "16 / 11",
                  objectFit: "cover",
                  background: "#09111f",
                }}
              />
              <div style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#7dd3fc",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    marginBottom: 10,
                  }}
                >
                  {card.tag}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginTop: 12 }}>
                  {card.copy}
                </div>
                <Link
                  to={card.link}
                  style={{
                    ...landingSecondaryButtonStyle,
                    display: "inline-block",
                    marginTop: 18,
                  }}
                >
                  {card.cta}
                </Link>
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

const planStatusStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(34, 197, 94, 0.22)",
  background: "rgba(20, 83, 45, 0.18)",
  color: "#bbf7d0",
  fontSize: 13,
  fontWeight: 700,
};
