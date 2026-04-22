describe("Authentication Flow", () => {
  it("registers through the UI and reaches the dashboard", () => {
    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const user = {
      fullName: `Cypress Register ${uniqueId}`,
      email: `cypress.register.${uniqueId}@example.com`,
      password: "Password123!",
    };

    cy.visit("/register");
    cy.get('[data-cy="register-full-name"]').type(user.fullName);
    cy.get('[data-cy="register-email"]').type(user.email);
    cy.get('[data-cy="register-password"]').type(user.password);
    cy.get('[data-cy="register-submit"]').click();

    cy.url().should("include", "/dashboard");
    cy.contains("Dashboard: Portfolio Overview").should("be.visible");
  });

  it("logs in through the UI for an existing user", () => {
    cy.registerUserByApi().then((user) => {
      cy.loginByUi(user);

      cy.url().should("include", "/dashboard");
      cy.contains("Dashboard: Portfolio Overview").should("be.visible");
      cy.contains("Recent Trades").should("be.visible");
    });
  });

  it("shows an error for invalid login credentials", () => {
    cy.visit("/login");
    cy.get('[data-cy="login-email"]').type("missing-user@example.com");
    cy.get('[data-cy="login-password"]').type("WrongPassword123!");
    cy.get('[data-cy="login-submit"]').click();

    cy.get('[data-cy="login-error"]')
      .should("be.visible")
      .and("contain.text", "Invalid email or password");
  });
});
