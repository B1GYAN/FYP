import { Link } from "react-router-dom";
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

  return (
    <MainLayout>
      <div
        className="card"
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: 28,
          background:
            "radial-gradient(circle at top right, rgba(251, 191, 36, 0.12), transparent 28%), linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(7, 12, 23, 0.98))",
        }}
      >
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
          <Link to="/" style={premiumPrimaryLinkStyle}>
            View Plans
          </Link>
          <Link to="/dashboard" style={premiumSecondaryLinkStyle}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}

const premiumPrimaryLinkStyle = {
  padding: "12px 16px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #f59e0b, #d97706)",
  color: "#0f172a",
  textDecoration: "none",
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
