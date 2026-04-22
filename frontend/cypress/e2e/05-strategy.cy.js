describe("Strategy Lab Flow", () => {
  it("runs a backtest for a premium user", () => {
    cy.registerUserByApi().then((user) => {
      cy.loginByApi(user, "/dashboard");
      cy.upgradeCurrentUserToPremium();

      cy.visit("/strategy");
      cy.contains("Strategy Lab").should("be.visible");
      cy.get('[data-cy="strategy-run-backtest"]').click();

      cy.contains("Backtest Results", { timeout: 15000 }).should("be.visible");
      cy.contains("Total return:").should("be.visible");
      cy.contains("Win rate:").should("be.visible");
    });
  });
});
