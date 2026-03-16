# PaperTrade Application

PaperTrade is a final year project trading simulator built with React, Express, and PostgreSQL. It supports JWT authentication, virtual portfolio trading, market price/chart feeds, adaptive learning recommendations, lesson quizzes, and a simplified strategy backtesting lab.

## Current Assessment
- What exists:
  - JWT registration, login, logout, session restore, and protected routes.
  - Persisted portfolio engine with buy/sell validation, holdings updates, transaction history, and recent orders.
  - Market data service layer with cached external pricing and historical candle support, plus fallback data for demo reliability.
  - Rule-based adaptive learning engine tied to trading behavior.
  - Lesson, quiz, progress, and recommendation APIs with a connected frontend learning page.
  - Simplified strategy lab that backtests MA crossover plus RSI exit logic against historical candles.
  - Seed and schema scripts for the main database entities.
- What is missing:
  - Refresh token flow and stronger form validation.
  - More advanced chart visualization and richer backtesting analytics.
  - Full end-to-end automated test coverage.
- What is broken or limited:
  - PostgreSQL must be running locally on `localhost:5432` before auth, trading, and learning flows can use the real database.
  - External live prices depend on public API availability; the service falls back to seeded values if needed.

## Plan
- Immediate next steps:
  - Start PostgreSQL locally.
  - Run migrations and seed scripts.
  - Verify auth, trading, learning, and strategy flows in the browser.
  - See [docs/local-postgres.md](/Users/aaryankattel/Downloads/fyp/docs/local-postgres.md) for local database setup options.
- Phase breakdown:
  - Phase 1: setup cleanup and modular backend.
  - Phase 2: authentication.
  - Phase 3: persisted trading engine and portfolio APIs.
  - Phase 4: market data and charts feed.
  - Phase 5: adaptive learning plus lessons/quizzes.
  - Phase 6: strategy lab and backtesting.
  - Phase 7: tests, deployment readiness, and documentation polish.

## Changes Made
- Backend:
  - Modular Express structure under [backend/src/app.js](/Users/aaryankattel/Downloads/fyp/backend/src/app.js) and [backend/src/routes/index.js](/Users/aaryankattel/Downloads/fyp/backend/src/routes/index.js).
  - Auth flow in [backend/src/routes/authRoutes.js](/Users/aaryankattel/Downloads/fyp/backend/src/routes/authRoutes.js), [backend/src/services/authService.js](/Users/aaryankattel/Downloads/fyp/backend/src/services/authService.js), and [backend/src/middleware/authMiddleware.js](/Users/aaryankattel/Downloads/fyp/backend/src/middleware/authMiddleware.js).
  - Trading engine in [backend/src/services/tradingEngineService.js](/Users/aaryankattel/Downloads/fyp/backend/src/services/tradingEngineService.js) with portfolio helpers in [backend/src/services/portfolioService.js](/Users/aaryankattel/Downloads/fyp/backend/src/services/portfolioService.js).
  - Market data abstraction in [backend/src/services/marketDataService.js](/Users/aaryankattel/Downloads/fyp/backend/src/services/marketDataService.js).
  - Learning and lesson services in [backend/src/services/learningService.js](/Users/aaryankattel/Downloads/fyp/backend/src/services/lessonService.js).
  - Strategy backtesting in [backend/src/services/strategyService.js](/Users/aaryankattel/Downloads/fyp/backend/src/services/strategyService.js).
  - SQL schema and seeds in [backend/src/db/schema.sql](/Users/aaryankattel/Downloads/fyp/backend/src/db/schema.sql) and [backend/src/db/seed.sql](/Users/aaryankattel/Downloads/fyp/backend/src/db/seed.sql).
- Frontend:
  - Auth state and protected routing in [frontend/src/context/AuthContext.js](/Users/aaryankattel/Downloads/fyp/frontend/src/context/AuthContext.js) and [frontend/src/App.js](/Users/aaryankattel/Downloads/fyp/frontend/src/App.js).
  - Login and registration pages in [frontend/src/pages/Login.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/Login.js) and [frontend/src/pages/Register.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/Register.js).
  - API-driven pages for dashboard, trading, watchlist, charts, learning, and strategy lab in [frontend/src/pages/Dashboard.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/Dashboard.js), [frontend/src/pages/Trading.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/Trading.js), [frontend/src/pages/Watchlist.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/Watchlist.js), [frontend/src/pages/Charts.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/Charts.js), [frontend/src/pages/Learning.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/Learning.js), and [frontend/src/pages/StrategyLab.js](/Users/aaryankattel/Downloads/fyp/frontend/src/pages/StrategyLab.js).
  - Shared API/data helpers in [frontend/src/config/apiClient.js](/Users/aaryankattel/Downloads/fyp/frontend/src/config/apiClient.js) and [frontend/src/hooks/useAsyncData.js](/Users/aaryankattel/Downloads/fyp/frontend/src/hooks/useAsyncData.js).
- Testing:
  - Added backend Jest/Supertest scaffolding in [backend/jest.config.js](/Users/aaryankattel/Downloads/fyp/backend/jest.config.js) and [backend/tests](/Users/aaryankattel/Downloads/fyp/backend/tests).

## How to Run/Test
- Backend:
  - `cd backend`
  - `cp .env.example .env`
  - Fill in PostgreSQL credentials and `JWT_SECRET`
  - `npm install`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run dev`
- Frontend:
  - `cd frontend`
  - `npm install`
  - Optional: set `REACT_APP_API_BASE_URL=http://localhost:5001`
  - `npm start`
- Tests:
  - `cd frontend && npm test -- --watchAll=false`
  - `cd backend && npm test`

## Verification Status
- Completed:
  - Backend test suite passes.
  - Frontend test suite passes.
  - Default backend/frontend port conflict was fixed by moving the app to `5001`.
  - Backend `node_modules` and `.env` are no longer tracked in Git.
- Still required locally:
  - Start PostgreSQL and run migrations/seeds.
  - Walk through the live demo checklist in [docs/demo-evidence.md](/Users/aaryankattel/Downloads/fyp/docs/demo-evidence.md).

## Deployment Notes
- Frontend:
  - Vercel or Netlify
  - Set `REACT_APP_API_BASE_URL` to hosted backend URL
- Backend:
  - Render or Railway
  - Set `NODE_ENV=production`, `CLIENT_ORIGIN`, DB credentials, and `JWT_SECRET`
- Database:
  - Use hosted PostgreSQL and run `npm run db:migrate` then `npm run db:seed`

## Final Report Notes
- Implementation discussion ideas:
  - Explain the layered backend architecture: routes, controllers, services, middleware, and PostgreSQL access.
  - Justify JWT for stateless authentication and bcrypt for password security.
  - Describe the trading engine as a transaction-safe simulation that validates funds, quantities, and portfolio updates.
  - Present the adaptive learning module as a rule-based recommendation engine that maps trading mistakes to educational interventions.
  - Explain the strategy lab as a simplified but functional backtesting environment using historical candle data and technical indicators.
  - Discuss fallback market data as a reliability choice for student demos when public APIs are rate-limited or unavailable.

## Remaining Work
- Start PostgreSQL locally and run the real API flows end to end.
- Capture the final screenshots and short demo evidence for the dissertation/demo.
- Optionally add refresh tokens and richer analytics if you want to extend beyond submission scope.
