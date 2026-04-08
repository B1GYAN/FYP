// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import PremiumRoute from "./components/PremiumRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Trading from "./pages/Trading";
import Watchlist from "./pages/Watchlist";
import Charts from "./pages/Charts";
import ChartFullscreen from "./pages/ChartFullscreen";
import Learning from "./pages/Learning";
import LessonDetail from "./pages/LessonDetail";
import StrategyLab from "./pages/StrategyLab";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade"
            element={
              <ProtectedRoute>
                <Trading />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <Watchlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charts"
            element={
              <ProtectedRoute>
                <Charts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charts/window"
            element={
              <ProtectedRoute>
                <ChartFullscreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learn"
            element={
              <ProtectedRoute>
                <PremiumRoute
                  featureName="Learning Hub"
                  featureSummary="Lessons, quizzes, and adaptive coaching are part of the Premium learning workflow."
                  featureBullets={[
                    "Structured classes with lesson progress and quiz unlocking",
                    "Adaptive recommendations tied to trading behavior",
                    "A cleaner education path for students and subscribers",
                  ]}
                >
                  <Learning />
                </PremiumRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/learn/lessons/:lessonId"
            element={
              <ProtectedRoute>
                <PremiumRoute
                  featureName="Lesson Detail"
                  featureSummary="Detailed lesson content and quiz access are reserved for Premium members."
                  featureBullets={[
                    "Full class content and completion tracking",
                    "Quiz access after lesson completion",
                    "Designed as part of the paid learning tier",
                  ]}
                >
                  <LessonDetail />
                </PremiumRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/strategy"
            element={
              <ProtectedRoute>
                <PremiumRoute
                  featureName="Strategy Lab"
                  featureSummary="Backtesting and strategy research are gated behind the Premium plan."
                  featureBullets={[
                    "Run MA and RSI strategy tests on historical data",
                    "Store backtest results and compare outcomes",
                    "Built as a paid research workspace for advanced users",
                  ]}
                >
                  <StrategyLab />
                </PremiumRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
