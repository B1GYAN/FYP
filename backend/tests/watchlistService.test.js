jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../src/services/marketDataService", () => ({
  enrichPairs: jest.fn((items) => Promise.resolve(items)),
  listSupportedAssets: jest.fn(),
}));

const db = require("../db");
const marketDataService = require("../src/services/marketDataService");
const {
  getAllWatchlistItems,
  createWatchlistItem,
} = require("../src/services/watchlistService");

describe("watchlist service", () => {
  beforeEach(() => {
    db.query.mockReset();
    db.getClient.mockReset();
    marketDataService.enrichPairs.mockReset();
    marketDataService.enrichPairs.mockImplementation((items) =>
      Promise.resolve(items)
    );
    marketDataService.listSupportedAssets.mockReset();
  });

  test("filters unsupported watchlist entries before returning them", async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 3,
      rows: [
        {
          id: "watch-1",
          symbol: "BTC",
          quote: "USDT",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "watch-2",
          symbol: "BTC",
          quote: "GBP",
          created_at: "2026-01-01T00:00:01.000Z",
        },
        {
          id: "watch-3",
          symbol: "BNB",
          quote: "USDT",
          created_at: "2026-01-01T00:00:02.000Z",
        },
      ],
    });
    marketDataService.listSupportedAssets.mockResolvedValue([
      { pair: "BTC/USDT" },
      { pair: "BNB/USDT" },
    ]);

    const result = await getAllWatchlistItems("user-1");

    expect(result).toEqual([
      expect.objectContaining({
        pair: "BTC/USDT",
        symbol: "BTC",
        quote: "USDT",
      }),
      expect.objectContaining({
        pair: "BNB/USDT",
        symbol: "BNB",
        quote: "USDT",
      }),
    ]);
    expect(result).toHaveLength(2);
    expect(marketDataService.enrichPairs).toHaveBeenCalledWith([
      expect.objectContaining({
        pair: "BTC/USDT",
      }),
      expect.objectContaining({
        pair: "BNB/USDT",
      }),
    ]);
  });

  test("rejects unsupported pairs when creating a watchlist item", async () => {
    marketDataService.listSupportedAssets.mockResolvedValue([
      { pair: "BTC/USDT" },
    ]);

    await expect(createWatchlistItem("user-1", "BTC/GBP")).rejects.toMatchObject({
      statusCode: 400,
      message:
        "Pair BTC/GBP is not supported. Use a listed market pair such as BTC/USDT.",
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  test("creates a supported pair after normalizing the input", async () => {
    marketDataService.listSupportedAssets.mockResolvedValue([
      { pair: "ETH/USDT" },
    ]);
    db.query
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "watch-4",
            symbol: "ETH",
            quote: "USDT",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      });

    const result = await createWatchlistItem("user-1", "eth");

    expect(result).toEqual(
      expect.objectContaining({
        pair: "ETH/USDT",
        symbol: "ETH",
        quote: "USDT",
      })
    );
    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM watchlist"),
      ["user-1", "ETH", "USDT"]
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO watchlist"),
      ["user-1", "ETH", "USDT"]
    );
  });
});
