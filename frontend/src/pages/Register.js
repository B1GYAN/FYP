import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("STANDARD");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await register({ fullName, email, password, subscriptionTier });
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">PaperTrade</div>
        <h1 className="auth-title">Create your simulator account</h1>
        <p className="auth-subtitle">
          New users start with a virtual balance so they can practice safely.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Full Name
            <input
              className="auth-input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Bigyan Lama"
            />
          </label>

          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@example.com"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          <div className="auth-label">
            Choose Plan
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              {[
                {
                  value: "STANDARD",
                  title: "Standard",
                  copy: "Free live trading, watchlist, and dashboard access.",
                },
                {
                  value: "PREMIUM",
                  title: "Premium",
                  copy: "Unlock Learning Hub, Strategy Lab, and chart replay.",
                },
              ].map((plan) => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setSubscriptionTier(plan.value)}
                  style={planCardStyle(subscriptionTier === plan.value)}
                >
                  <strong>{plan.title}</strong>
                  <span style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                    {plan.copy}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function planCardStyle(isActive) {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: isActive
      ? "1px solid rgba(20, 184, 166, 0.42)"
      : "1px solid rgba(148, 163, 184, 0.14)",
    background: isActive
      ? "linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(8, 145, 178, 0.12))"
      : "rgba(8, 15, 28, 0.62)",
    color: "#f8fafc",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
  };
}
