import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";

const FINAL_STATUSES = new Set(["PROCESSED", "FAILED", "CANCELLED", "CHARGEBACK"]);

export default function BillingReturn() {
  const { token, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const returnState = searchParams.get("state");
  const returnMode = searchParams.get("mode");
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasRefreshedProfile = useRef(false);

  useEffect(() => {
    if (!paymentId || !token) {
      setLoading(false);
      setError("Missing billing payment reference.");
      return undefined;
    }

    let active = true;
    let intervalId;

    async function loadPayment() {
      try {
        const nextPayment = await apiRequest(`/api/billing/payments/${paymentId}`, {
          token,
        });

        if (!active) {
          return;
        }

        setPayment(nextPayment);
        setLoading(false);
        setError("");

        if (nextPayment.status === "PROCESSED" && !hasRefreshedProfile.current) {
          hasRefreshedProfile.current = true;
          await refreshProfile();
        }

        if (FINAL_STATUSES.has(nextPayment.status)) {
          window.clearInterval(intervalId);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setLoading(false);
        setError(loadError.message || "Unable to load payment status.");
        window.clearInterval(intervalId);
      }
    }

    loadPayment();
    intervalId = window.setInterval(loadPayment, 3000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [paymentId, refreshProfile, token]);

  const status = payment?.status || (returnState === "cancelled" ? "CANCELLED" : "PENDING");
  const isDemoPayment =
    returnMode === "demo" || payment?.provider === "SKRILL_DEMO";
  const title = getStatusTitle(status, isDemoPayment);
  const copy = getStatusCopy(status, returnState, isDemoPayment);

  return (
    <MainLayout>
      <div
        data-cy="billing-return"
        className="card"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: 28,
          background:
            "radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%), linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(7, 12, 23, 0.98))",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(8, 15, 28, 0.74)",
            border: "1px solid rgba(125, 211, 252, 0.2)",
            color: "#bae6fd",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Skrill Checkout
        </div>

        <h1 data-cy="billing-return-title" className="page-title" style={{ marginBottom: 12 }}>
          {title}
        </h1>
        <p className="page-subtitle" style={{ marginBottom: 18 }}>
          {copy}
        </p>

        {loading ? (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Checking payment status...
          </div>
        ) : error ? (
          <div style={{ color: "#fecaca", fontSize: 13 }}>{error}</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginBottom: 22,
            }}
          >
            <StatusRow
              dataCy="billing-return-plan"
              label="Plan"
              value={payment?.planCode || "PREMIUM_MONTHLY"}
            />
            <StatusRow
              dataCy="billing-return-amount"
              label="Amount"
              value={
                payment
                  ? `${Number(payment.amount).toFixed(2)} ${payment.currency}`
                  : "--"
              }
            />
            <StatusRow dataCy="billing-return-status" label="Status" value={status} />
            <StatusRow
              dataCy="billing-return-payment-id"
              label="Payment ID"
              value={payment?.id || paymentId}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link data-cy="billing-return-dashboard-link" to="/dashboard" style={primaryLinkStyle}>
            Back to Dashboard
          </Link>
          <Link data-cy="billing-return-plans-link" to="/" style={secondaryLinkStyle}>
            View Plans
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}

function StatusRow({ label, value, dataCy }) {
  return (
    <div
      data-cy={dataCy}
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(148, 163, 184, 0.12)",
        background: "rgba(8, 15, 28, 0.72)",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 13,
      }}
    >
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getStatusTitle(status, isDemoPayment = false) {
  if (status === "PROCESSED") {
    return isDemoPayment
      ? "Premium upgrade simulated successfully"
      : "Premium payment confirmed";
  }

  if (status === "CANCELLED") {
    return "Checkout was cancelled";
  }

  if (status === "FAILED" || status === "CHARGEBACK") {
    return "Premium payment did not complete";
  }

  return "Waiting for Skrill confirmation";
}

function getStatusCopy(status, returnState, isDemoPayment = false) {
  if (status === "PROCESSED") {
    return isDemoPayment
      ? "Demo Skrill mode marked this payment as successful so you can show the Premium upgrade flow during your project presentation."
      : "Skrill confirmed the payment and your account should now be upgraded to Premium.";
  }

  if (status === "CANCELLED" || returnState === "cancelled") {
    return "The checkout was cancelled before Skrill confirmed payment. You can try again whenever you are ready.";
  }

  if (status === "FAILED") {
    return "Skrill reported that the payment failed. Please try again or check your wallet details.";
  }

  if (status === "CHARGEBACK") {
    return "This payment was later reversed by Skrill. Premium access may no longer be active.";
  }

  return "You have returned from Skrill, but the secure payment callback has not finished updating the account yet.";
}

const primaryLinkStyle = {
  padding: "12px 16px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
  color: "#f8fafc",
  textDecoration: "none",
  fontWeight: 800,
};

const secondaryLinkStyle = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(8, 15, 28, 0.62)",
  color: "#f8fafc",
  textDecoration: "none",
  fontWeight: 700,
};
