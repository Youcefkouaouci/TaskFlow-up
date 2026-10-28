const RAW_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const API_BASE = RAW_BASE.endsWith("/api")
  ? RAW_BASE
  : `${RAW_BASE.replace(/\/$/, "")}/api`;

async function request(path, options = {}) {
  const token = localStorage.getItem("taskflow_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.replace(/^\/api/, "");
  }

  const fullUrl = `${API_BASE}${cleanPath}`;
  const res = await fetch(fullUrl, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      const hadToken = !!localStorage.getItem("taskflow_token");
      localStorage.removeItem("taskflow_token");
      localStorage.removeItem("taskflow_user");
      if (hadToken) {
        window.location.href = "/";
      }
    }
    const body = await res.json().catch(() => ({}));
    const errorMessage =
      (body.error && typeof body.error === "string"
        ? body.error
        : body.error?.message) ||
      body.message ||
      `Erreur HTTP ${res.status}`;
    const err = new Error(errorMessage);
    err.status = res.status;
    err.data = body;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, data, options) =>
    request(path, { ...options, method: "POST", body: JSON.stringify(data) }),
  put: (path, data, options) =>
    request(path, { ...options, method: "PUT", body: JSON.stringify(data) }),
  patch: (path, data, options) =>
    request(path, { ...options, method: "PATCH", body: JSON.stringify(data) }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
  getBaseUrl: () => API_BASE,
};
