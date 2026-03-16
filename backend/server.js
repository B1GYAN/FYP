// server.js
// Express backend for PaperTrade with PostgreSQL-backed Watchlist

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;


// ---------- Middleware ----------
app.use(
  cors({
    origin: "http://localhost:3001", // React dev server
  })
);
app.use(express.json());

// ---------- Health check ----------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ===================================================
// WATCHLIST ENDPOINTS  (connected to PostgreSQL)
// Table: watchlist(id SERIAL, symbol VARCHAR, quote VARCHAR, created_at TIMESTAMP)
// ===================================================

// GET /api/watchlist  -> load all rows from DB
app.get("/api/watchlist", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, symbol, quote FROM watchlist ORDER BY id"
    );

    // Map DB rows into the shape the frontend expects
    const items = result.rows.map((row) => ({
      id: row.id,
      pair: `${row.symbol}/${row.quote}`,
      price: "--",      // can be filled later with real market data
      change: "0.0%",   // placeholder for 24h change
    }));

    res.json(items);
  } catch (err) {
    console.error("Error loading watchlist from DB:", err);
    res.status(500).json({ error: "Failed to load watchlist from database" });
  }
});

// POST /api/watchlist  -> insert new row into DB
// Frontend currently sends: { pair: "BTC/USDT" }
app.post("/api/watchlist", async (req, res) => {
  const { pair } = req.body;

  if (!pair || typeof pair !== "string") {
    return res.status(400).json({ error: "pair is required (e.g. BTC/USDT)" });
  }

  let symbol = "";
  let quote = "";

  const cleaned = pair.trim().toUpperCase();

  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    symbol = parts[0];
    quote = parts[1] || "USDT";
  } else {
    // fallback: simple split, not super important for demo
    symbol = cleaned;
    quote = "USDT";
  }

  try {
    const result = await db.query(
      "INSERT INTO watchlist (symbol, quote) VALUES ($1, $2) RETURNING id, symbol, quote",
      [symbol, quote]
    );

    const row = result.rows[0];

    const item = {
      id: row.id,
      pair: `${row.symbol}/${row.quote}`,
      price: "--",
      change: "0.0%",
    };

    res.status(201).json(item);
  } catch (err) {
    console.error("Error inserting into watchlist DB:", err);
    res.status(500).json({ error: "Failed to add pair to database" });
  }
});

// ===================================================
// TRADES ENDPOINTS (still in-memory for now)
// ===================================================

let trades = [
  {
    id: 1,
    side: "BUY",
    symbol: "BTC/USDT",
    qty: 0.1,
    price: 40500,
    createdAt: new Date().toISOString(),
    note: "Simulated order",
  },
  {
    id: 2,
    side: "SELL",
    symbol: "ETH/USDT",
    qty: 0.5,
    price: 2350,
    createdAt: new Date().toISOString(),
    note: "Simulated order",
  },
];

app.get("/api/trades", (req, res) => {
  res.json(trades);
});

app.post("/api/trades", (req, res) => {
  const { side, symbol, qty, price, note } = req.body;

  if (!side || !symbol || !qty || !price) {
    return res.status(400).json({
      error: "side, symbol, qty and price are required",
    });
  }

  const newTrade = {
    id: Date.now(),
    side: side.toUpperCase(),
    symbol: symbol.toUpperCase(),
    qty: Number(qty),
    price: Number(price),
    note: note || "Simulated order",
    createdAt: new Date().toISOString(),
  };

  trades.unshift(newTrade);
  res.status(201).json(newTrade);
});

// ---------- 404 fallback ----------
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`PaperTrade backend running on http://localhost:${PORT}`);
});
