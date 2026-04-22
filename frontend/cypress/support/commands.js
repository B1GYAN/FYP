const AUTH_STORAGE_KEY = "papertrade_auth";
const DEFAULT_PASSWORD = "Password123!";

function buildUniqueUser(overrides = {}) {
  const uniqueId = `${Date.now()}-${Cypress._.random(1000, 9999)}`;

  return {
    fullName: `Cypress User ${uniqueId}`,
    email: `cypress.${uniqueId}@example.com`,
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}

function getApiUrl() {
  return Cypress.env("apiUrl") || "http://localhost:5001";
}

Cypress.Commands.add("registerUserByApi", (overrides = {}) => {
  const user = buildUniqueUser(overrides);

  return cy
    .request({
      method: "POST",
      url: `${getApiUrl()}/api/auth/register`,
      body: {
        fullName: user.fullName,
        email: user.email,
        password: user.password,
      },
    })
    .then((response) => {
      expect(response.status).to.eq(201);

      return {
        ...user,
        token: response.body.token,
        authUser: response.body.user,
      };
    });
});

Cypress.Commands.add("loginByUi", (user) => {
  cy.visit("/login");
  cy.get('[data-cy="login-email"]').type(user.email);
  cy.get('[data-cy="login-password"]').type(user.password);
  cy.get('[data-cy="login-submit"]').click();
});

Cypress.Commands.add("loginByApi", (user, visitPath = "/dashboard") => {
  return cy
    .request({
      method: "POST",
      url: `${getApiUrl()}/api/auth/login`,
      body: {
        email: user.email,
        password: user.password,
      },
    })
    .then((response) => {
      expect(response.status).to.eq(200);

      const session = {
        token: response.body.token,
        user: response.body.user,
      };

      return cy
        .visit(visitPath, {
          onBeforeLoad(win) {
            win.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
          },
        })
        .then(() => ({
          ...user,
          token: response.body.token,
          authUser: response.body.user,
        }));
    });
});

Cypress.Commands.add("upgradeCurrentUserToPremium", () => {
  return cy.window().then((win) => {
    const rawSession = win.localStorage.getItem(AUTH_STORAGE_KEY);
    expect(rawSession, "stored auth session").to.not.be.null;

    const session = JSON.parse(rawSession);
    const headers = {
      Authorization: `Bearer ${session.token}`,
    };

    return cy
      .request({
        method: "POST",
        url: `${getApiUrl()}/api/billing/skrill/checkout`,
        headers,
      })
      .then((checkoutResponse) => {
        expect(
          checkoutResponse.body.mode,
          "billing demo mode must be enabled in backend/.env"
        ).to.eq("DEMO");

        return cy
          .request({
            method: "POST",
            url: `${getApiUrl()}/api/billing/payments/${checkoutResponse.body.paymentId}/demo-complete`,
            headers,
          })
          .then((paymentResponse) => {
            expect(paymentResponse.status).to.eq(200);

            return cy.request({
              method: "GET",
              url: `${getApiUrl()}/api/auth/me`,
              headers,
            });
          })
          .then((profileResponse) => {
            expect(profileResponse.status).to.eq(200);
            expect(profileResponse.body.isPremium).to.eq(true);

            win.localStorage.setItem(
              AUTH_STORAGE_KEY,
              JSON.stringify({
                token: session.token,
                user: profileResponse.body,
              })
            );

            return profileResponse.body;
          });
      });
  });
});
