import { Link } from "react-router-dom";
import learningHubIllustration from "../assets/learning-hub.svg";
import strategyLabIllustration from "../assets/strategy-lab.svg";
import terminalHero from "../assets/terminal-hero.svg";
import SkrillUpgradeButton from "./SkrillUpgradeButton";
import MainLayout from "../layout/MainLayout";
import { useAuth } from "../context/AuthContext";

export default function PremiumRoute({
  children,
  featureName,
  featureSummary,
  featureBullets = [],
}) {
  const { user, isPremium } = useAuth();

  if (isPremium) {
    return children;
  }

  const illustration = getPremiumIllustration(featureName);

  return (
    <MainLayout>
      <div
        data-cy="premium-gate"
        className="card"
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: 28,
          background:
            "radial-gradient(circle at top right, rgba(251, 191, 36, 0.12), transparent 28%), linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(7, 12, 23, 0.98))",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(120, 53, 15, 0.24)",
                border: "1px solid rgba(251, 191, 36, 0.28)",
                color: "#fde68a",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Premium Feature
            </div>

            <h1 className="page-title" style={{ marginBottom: 12 }}>
              {featureName} is reserved for Premium members
            </h1>
            <p className="page-subtitle" style={{ marginBottom: 18 }}>
              {featureSummary}
            </p>

            <div
              style={{
                padding: 18,
                borderRadius: 18,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                background: "rgba(8, 15, 28, 0.72)",
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                Current Plan
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                {user?.subscriptionTier || "STANDARD"}
              </div>
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                Upgrade this account to unlock the gated workspace below.
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
              {featureBullets.map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(8, 15, 28, 0.62)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    color: "#e2e8f0",
                    fontSize: 13,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <SkrillUpgradeButton
                label="Upgrade with Skrill"
                style={premiumPrimaryButtonStyle}
                errorStyle={{ maxWidth: 360 }}
              />
              <Link to="/dashboard" style={premiumSecondaryLinkStyle}>
                Back to Dashboard
              </Link>
              <Link to="/" style={premiumTertiaryLinkStyle}>
                View Plans
              </Link>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(148, 163, 184, 0.14)",
                background: "rgba(8, 15, 28, 0.78)",
              }}
            >
              <img
                src={illustration.image}
                alt={illustration.alt}
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 18,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                background: "rgba(8, 15, 28, 0.72)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#fbbf24",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 10,
                }}
              >
                {illustration.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>
                {illustration.title}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                {illustration.copy}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function getPremiumIllustration(featureName = "") {
  if (featureName.toLowerCase().includes("strategy")) {
    return {
      image: strategyLabIllustration,
      alt: "Strategy research illustration with analytics cards and backtest chart",
      label: "Research Workspace",
      title: "Premium opens the full strategy-testing environment.",
      copy:
        "The strategy module is represented with an analytics-style illustration so the gated screen feels like part of the product, not a dead end.",
    };
  }

  if (
    featureName.toLowerCase().includes("learn") ||
    featureName.toLowerCase().includes("lesson")
  ) {
    return {
      image: learningHubIllustration,
      alt: "Learning module illustration with lesson cards and progress visuals",
      label: "Adaptive Learning",
      title: "Premium adds guided education on top of paper trading.",
      copy:
        "The illustration matches the platform spec by showing lesson flow, progress, and quiz-style cards instead of generic stock art.",
    };
  }

  return {
    image: terminalHero,
    alt: "Trading workspace illustration with charts and watchlist",
    label: "Trading Workspace",
    title: "Premium layers deeper tools onto the existing terminal.",
    copy:
      "When no feature-specific image is available, the upgrade screen falls back to the platform-wide trading workspace illustration.",
  };
}

const premiumPrimaryButtonStyle = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(14, 165, 233, 0.24)",
  background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
  color: "#f8fafc",
  fontWeight: 800,
};

const premiumSecondaryLinkStyle = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(8, 15, 28, 0.62)",
  color: "#f8fafc",
  textDecoration: "none",
  fontWeight: 700,
};

const premiumTertiaryLinkStyle = {
  padding: "12px 16px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #f59e0b, #d97706)",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 800,
};
