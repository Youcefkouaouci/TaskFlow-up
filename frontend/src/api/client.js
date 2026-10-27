const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) =>
    request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) =>
    request(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: (path, data) =>
    request(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: "DELETE" }),
};
