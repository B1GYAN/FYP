const trades = [
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

function getTrades() {
  return trades;
}

function createTrade({ side, symbol, qty, price, note }) {
  const trade = {
    id: Date.now(),
    side: side.toUpperCase(),
    symbol: symbol.toUpperCase(),
    qty: Number(qty),
    price: Number(price),
    note: note || "Simulated order",
    createdAt: new Date().toISOString(),
  };

  trades.unshift(trade);

  return trade;
}

module.exports = {
  getTrades,
  createTrade,
};
