import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await register({ fullName, email, password });
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
          New users start on the Standard plan with a virtual balance so they can
          practice safely. Premium upgrades now happen after sign in through Skrill.
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
            Plan
            <div style={planInfoStyle}>
              <strong>Standard account on signup</strong>
              <span style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                Upgrade to Premium later from inside the app using Skrill checkout.
              </span>
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

const planInfoStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(8, 15, 28, 0.62)",
  color: "#f8fafc",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
};
