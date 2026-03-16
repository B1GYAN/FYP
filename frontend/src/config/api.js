const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export default API_BASE_URL;
