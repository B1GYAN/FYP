describe("Trading Flow", () => {
  it("places a buy order and shows the update on the dashboard", () => {
    cy.registerUserByApi().then((user) => {
      cy.loginByApi(user, "/trade");

      cy.contains("Trading Module - Intraday Orders").should("be.visible");
      cy.get('[data-cy="trading-quantity"]').clear().type("0.1");
      cy.get('[data-cy="trading-submit"]').click();

      cy.contains("Recent Orders").should("be.visible");
      cy.contains(/BTC\/USDT/i).should("exist");

      cy.visit("/dashboard");
      cy.contains("Dashboard: Portfolio Overview").should("be.visible");
      cy.contains("Recent Trades").should("be.visible");
      cy.contains(/BUY/i).should("exist");
    });
  });
});
