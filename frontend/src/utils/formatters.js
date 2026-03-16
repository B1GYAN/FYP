export function formatCurrency(value, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

export function formatPercent(value, digits = 2) {
  const fixed = Number(value || 0).toFixed(digits);
  return `${Number(fixed) >= 0 ? "+" : ""}${fixed}%`;
}
