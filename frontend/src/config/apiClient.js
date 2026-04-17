import { buildApiUrl } from "./api";

export async function apiRequest(path, options = {}) {
  const { token, headers = {}, ...rest } = options;
  const requestUrl = buildApiUrl(path);
  let response;

  try {
    response = await fetch(requestUrl, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (error) {
    throw new Error(
      `Unable to reach the backend server at ${requestUrl}. Make sure the backend is running.`
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return body;
}
