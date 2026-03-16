# Demo Evidence Checklist

Use this checklist to capture screenshots and short demo clips after running the application locally. These are the highest-value artefacts for the final report, viva, and deployment submission.

## Core Screenshots
- Authentication:
  - Login page
  - Registration page
  - Authenticated dashboard after login
- Trading:
  - Order ticket before submission
  - Successful buy order confirmation state
  - Portfolio updated after buy
  - Validation error when trying to oversell
- Watchlist and Market Data:
  - Watchlist with live or fallback prices
  - Charts page showing candle table for selected pair/timeframe
- Adaptive Learning:
  - Learning dashboard with recommendations triggered by recent trades
  - Lesson library with completion status
  - Quiz open state and quiz result after submission
- Strategy Lab:
  - Strategy configuration form
  - Backtest results showing total return, win rate, max drawdown, and trade count

## Suggested Demo Script
1. Register a new user and log in.
2. Show the initial dashboard and virtual starting balance.
3. Add a pair to the watchlist and open the charts page.
4. Place a market buy order and return to the dashboard.
5. Attempt an invalid sell order to demonstrate validation.
6. Visit the learning page to show generated recommendations.
7. Open a lesson quiz and submit an attempt.
8. Run a strategy backtest and explain the returned metrics.

## Recommended Captions for Report
- Figure: User authentication flow with secure session handling.
- Figure: Virtual trading engine updating holdings and cash balance after a buy order.
- Figure: Adaptive learning recommendations generated from trading behaviour.
- Figure: Strategy Lab backtesting output using historical market data.

## Evidence Storage Tip
- Save screenshots in a folder such as `report-assets/screenshots/`.
- Name them consistently, for example:
  - `01-login-page.png`
  - `02-dashboard.png`
  - `03-buy-order-success.png`
  - `04-learning-recommendation.png`
  - `05-strategy-backtest.png`
