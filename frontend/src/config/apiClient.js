import { buildApiUrl } from "./api";

export async function apiRequest(path, options = {}) {
  const { token, headers = {}, ...rest } = options;

  const response = await fetch(buildApiUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return body;
}
