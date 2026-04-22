describe("Premium Billing Flow", () => {
  it("completes the demo Skrill checkout and upgrades the user to premium", () => {
    cy.intercept("POST", "**/api/billing/skrill/checkout").as("billingCheckout");
    cy.intercept("POST", "**/api/billing/payments/*/demo-complete").as(
      "billingDemoComplete"
    );
    cy.intercept("GET", "**/api/billing/payments/*").as("billingPayment");
    cy.intercept("GET", "**/api/auth/me").as("billingProfile");

    cy.registerUserByApi().then((user) => {
      cy.loginByApi(user, "/strategy");

      cy.get('[data-cy="premium-gate"]').should("be.visible");
      cy.contains("Strategy Lab is reserved for Premium members").should(
        "be.visible"
      );
      cy.get('[data-cy="header-plan"]').should("contain", "STANDARD");

      cy.get('[data-cy="billing-upgrade-button"]').click();
      cy.wait("@billingCheckout");

      cy.get('[data-cy="billing-demo-checkout"]').should("be.visible");
      cy.contains("Skrill Demo Checkout").should("be.visible");
      cy.get('[data-cy="billing-demo-complete"]').click();
      cy.wait("@billingDemoComplete");

      cy.url().should("include", "/billing/return");
      cy.get('[data-cy="billing-return"]').should("be.visible");
      cy.wait("@billingPayment");
      cy.wait("@billingProfile");

      cy.get('[data-cy="billing-return-title"]').should(
        "contain",
        "Premium upgrade simulated successfully"
      );
      cy.get('[data-cy="billing-return-status"]').should("contain", "PROCESSED");
      cy.get('[data-cy="billing-return-plan"]').should(
        "contain",
        "PREMIUM_MONTHLY"
      );
      cy.get('[data-cy="header-plan"]').should("contain", "PREMIUM");

      cy.get('[data-cy="billing-return-dashboard-link"]').click();
      cy.url().should("include", "/dashboard");

      cy.visit("/strategy");
      cy.contains("Strategy Lab").should("be.visible");
      cy.get('[data-cy="premium-gate"]').should("not.exist");
    });
  });
});
