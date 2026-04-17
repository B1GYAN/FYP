import { apiRequest } from "../config/apiClient";

export async function requestSkrillCheckout(token) {
  return apiRequest("/api/billing/skrill/checkout", {
    token,
    method: "POST",
  });
}

export async function completeDemoPayment(token, paymentId) {
  return apiRequest(`/api/billing/payments/${paymentId}/demo-complete`, {
    token,
    method: "POST",
  });
}

export function submitHostedCheckout({ endpoint, method = "POST", fields = {} }) {
  const form = document.createElement("form");
  form.action = endpoint;
  form.method = method;
  form.style.display = "none";

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
