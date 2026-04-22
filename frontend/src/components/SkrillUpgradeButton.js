import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  completeDemoPayment,
  requestSkrillCheckout,
  submitHostedCheckout,
} from "../utils/billing";

export default function SkrillUpgradeButton({
  label = "Upgrade with Skrill",
  style = {},
  errorStyle = {},
}) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [demoCheckout, setDemoCheckout] = useState(null);

  async function handleUpgrade() {
    try {
      setSubmitting(true);
      setError("");
      const checkout = await requestSkrillCheckout(token);

      if (checkout.mode === "DEMO") {
        setDemoCheckout(checkout);
        setSubmitting(false);
        return;
      }

      submitHostedCheckout(checkout);
    } catch (checkoutError) {
      setError(checkoutError.message || "Failed to start Skrill checkout");
      setSubmitting(false);
    }
  }

  async function handleDemoPayment() {
    if (!demoCheckout?.paymentId) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await completeDemoPayment(token, demoCheckout.paymentId);
      navigate(
        `/billing/return?paymentId=${encodeURIComponent(
          demoCheckout.paymentId
        )}&state=success&mode=demo`
      );
    } catch (demoError) {
      setError(demoError.message || "Failed to simulate Skrill payment");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={submitting}
        data-cy="billing-upgrade-button"
        style={{
          padding: "12px 16px",
          borderRadius: 14,
          border: "1px solid rgba(14, 165, 233, 0.22)",
          background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
          color: "#f8fafc",
          fontWeight: 800,
          cursor: submitting ? "default" : "pointer",
          ...style,
        }}
      >
        {submitting ? "Redirecting to Skrill..." : label}
      </button>

      {demoCheckout ? (
        <div
          data-cy="billing-demo-checkout"
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid rgba(14, 165, 233, 0.22)",
            background: "rgba(8, 15, 28, 0.72)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#7dd3fc", fontWeight: 700 }}>
            Skrill Demo Checkout
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
            Receiver email: <strong>{demoCheckout.recipientEmail}</strong>
            <br />
            Amount:{" "}
            <strong>
              {Number(demoCheckout.amount).toFixed(2)} {demoCheckout.currency}
            </strong>
            <br />
            {demoCheckout.instructions}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleDemoPayment}
              disabled={submitting}
              data-cy="billing-demo-complete"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(34, 197, 94, 0.22)",
                background: "linear-gradient(135deg, #22c55e, #15803d)",
                color: "#f8fafc",
                fontWeight: 800,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "Processing..." : "Simulate Successful Payment"}
            </button>
            <button
              type="button"
              onClick={() => setDemoCheckout(null)}
              disabled={submitting}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                background: "rgba(15, 23, 42, 0.82)",
                color: "#f8fafc",
                fontWeight: 700,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            fontSize: 12,
            color: "#fecaca",
            lineHeight: 1.6,
            ...errorStyle,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
