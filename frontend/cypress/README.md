# Cypress Setup

This folder contains starter end-to-end tests for the PaperTrade project.

## Specs

- `01-auth.cy.js`
- `02-trading.cy.js`
- `03-watchlist-charts.cy.js`
- `04-premium-learning.cy.js`
- `05-strategy.cy.js`
- `06-billing.cy.js`

## Requirements

- Backend running at `http://localhost:5001`
- Frontend running at `http://localhost:3000`
- PostgreSQL database running locally
- `BILLING_DEMO_MODE=true` in `backend/.env` for the premium/billing specs

## Run

- `npm run cypress:open`
- `npm run cypress:run`
