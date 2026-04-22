describe("Watchlist and Charts Flow", () => {
  it("adds a pair to the watchlist and shows the replay lock for a standard user", () => {
    cy.registerUserByApi().then((user) => {
      cy.loginByApi(user, "/watchlist");

      cy.contains("Build the tape").should("be.visible");
      cy.get('[data-cy="watchlist-input"]').clear().type("ETH/USDT");
      cy.get('[data-cy="watchlist-add"]').click();

      cy.contains("ETH/USDT").should("be.visible");

      cy.visit("/charts");
      cy.contains("Charts that feel alive").should("be.visible");
      cy.contains("button", "Start Replay").click();
      cy.get('[data-cy="charts-replay-lock-notice"]')
        .should("be.visible")
        .and("contain", "Replay mode is available on Premium plans only.");
    });
  });
});
