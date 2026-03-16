import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  window.localStorage.setItem(
    "papertrade_auth",
    JSON.stringify({
      token: "test-token",
      user: {
        id: "1",
        fullName: "Test User",
        email: "test@example.com",
      },
    })
  );

  global.fetch = jest.fn((url) => {
    if (String(url).includes("/api/auth/me")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "1",
            fullName: "Test User",
            email: "test@example.com",
            portfolio: {
              cashBalance: 10000,
              equityValue: 10000,
              realizedPl: 0,
            },
          }),
      });
    }

    if (String(url).includes("/api/portfolio/transactions")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          cashBalance: 10000,
          equityValue: 10000,
          realizedPl: 0,
          unrealizedPl: 0,
          positionsValue: 0,
          holdings: [],
        }),
    });
  });
});

afterEach(() => {
  window.localStorage.clear();
  jest.resetAllMocks();
});

test("renders dashboard heading", async () => {
  render(<App />);
  const heading = await screen.findByText(/portfolio overview/i);
  expect(heading).toBeInTheDocument();
});
