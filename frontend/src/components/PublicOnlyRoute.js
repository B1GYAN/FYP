import { Navigate } from "react-router-dom";
import { hasStoredAuthSession, useAuth } from "../context/AuthContext";

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const hasPersistedSession = hasStoredAuthSession();

  if (isBootstrapping) {
    return <div style={{ padding: 24, color: "#e5e7eb" }}>Loading session...</div>;
  }

  if (isAuthenticated && hasPersistedSession) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
