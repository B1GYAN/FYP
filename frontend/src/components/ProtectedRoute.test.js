import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { hasStoredAuthSession, useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
  hasStoredAuthSession: jest.fn(),
}));

describe("ProtectedRoute", () => {
  afterEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  test("redirects to login when the persisted token is missing", async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
    });
    hasStoredAuthSession.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  test("renders protected content when the persisted token still exists", async () => {
    window.localStorage.setItem(
      "papertrade_auth",
      JSON.stringify({
        token: "test-token",
      })
    );

    useAuth.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
    });
    hasStoredAuthSession.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });
});
