import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiRequest } from "../config/apiClient";

const AUTH_STORAGE_KEY = "papertrade_auth";
const AuthContext = createContext(null);

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const initialAuthState = loadStoredAuth();
  const [authState, setAuthState] = useState(initialAuthState);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!initialAuthState?.token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const profile = await apiRequest("/api/auth/me", {
          token: initialAuthState.token,
        });
        const nextState = {
          token: initialAuthState.token,
          user: profile,
        };

        setAuthState(nextState);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
      } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthState(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    restoreSession();
  }, []);

  async function authenticate(path, payload) {
    const body = await apiRequest(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const nextState = {
      token: body.token,
      user: body.user,
    };

    setAuthState(nextState);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));

    return body;
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState(null);
  }

  const value = {
    user: authState?.user || null,
    token: authState?.token || null,
    isAuthenticated: Boolean(authState?.token),
    isBootstrapping,
    register: (payload) => authenticate("/api/auth/register", payload),
    login: (payload) => authenticate("/api/auth/login", payload),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
