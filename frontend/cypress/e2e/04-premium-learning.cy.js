describe("Premium Upgrade and Learning Flow", () => {
  it("upgrades through the demo billing flow and unlocks the learning module", () => {
    cy.registerUserByApi().then((user) => {
      cy.loginByApi(user, "/learn");

      cy.get('[data-cy="premium-gate"]').should("be.visible");
      cy.contains("Learning Hub is reserved for Premium members").should("be.visible");
      cy.get('[data-cy="billing-upgrade-button"]').click();

      cy.contains("Skrill Demo Checkout").should("be.visible");
      cy.get('[data-cy="billing-demo-complete"]').click();

      cy.url().should("include", "/billing/return");
      cy.contains("Premium upgrade simulated successfully", { timeout: 15000 }).should("be.visible");

      cy.visit("/learn");
      cy.contains("Learning Module - Classes").should("be.visible");
      cy.get('[data-cy="learning-library"]').should("be.visible");
    });
  });

  it("lets a premium user complete a lesson and submit a quiz", () => {
    cy.intercept("GET", "**/api/learn/dashboard").as("getLearningDashboard");
    cy.intercept("PATCH", "**/api/learn/lessons/*/progress").as("updateLessonProgress");
    cy.intercept("GET", "**/api/learn/quizzes/*").as("getLessonQuiz");
    cy.intercept("POST", "**/api/learn/quizzes/*/attempts").as("submitLessonQuiz");

    cy.registerUserByApi().then((user) => {
      cy.loginByApi(user, "/learn");
      cy.upgradeCurrentUserToPremium();

      cy.visit("/learn");
      cy.wait("@getLearningDashboard");

      cy.get('[data-cy="learning-library"]').should("be.visible");
      cy.get('[data-cy="learning-lesson-card"]').first().as("firstLesson");
      cy.get("@firstLesson").find('[data-cy="learning-open-class"]').click();

      cy.url().should("include", "/learn/lessons/");
      cy.get('[data-cy="lesson-detail"]').should("be.visible");
      cy.get('[data-cy="lesson-status"]').should("contain", "NOT STARTED");

      cy.get('[data-cy="lesson-toggle-complete"]').click();
      cy.wait("@updateLessonProgress");
      cy.get('[data-cy="lesson-status"]').should("contain", "COMPLETED");

      cy.get('[data-cy="lesson-open-quiz"]').should("not.be.disabled").click();
      cy.wait("@getLessonQuiz");
      cy.get('[data-cy="lesson-quiz"]').should("be.visible");
      cy.get('[data-cy="lesson-quiz-question"]')
        .first()
        .find('[data-cy="lesson-quiz-option"]')
        .first()
        .click();

      cy.get('[data-cy="lesson-quiz-submit"]').click();
      cy.wait("@submitLessonQuiz");
      cy.get('[data-cy="lesson-quiz-score"]').should("contain", "Score:");

      cy.get('[data-cy="lesson-back-to-classes"]').click();
      cy.url().should("include", "/learn");
      cy.wait("@getLearningDashboard");
      cy.get('[data-cy="learning-lesson-card"]')
        .first()
        .find('[data-cy="learning-lesson-status"]')
        .should("contain", "COMPLETED");
    });
  });
});
