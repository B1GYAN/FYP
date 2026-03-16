jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");

describe("health endpoint", () => {
  test("returns ok payload", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
