/**
 * ============================================================================
 * TaskFlow - Client HTTP API
 * ============================================================================
 * Client HTTP centralisé avec gestion des tokens JWT Bearer, normalisation
 * des URLs et extraction robuste des messages d'erreurs backend.
 * ============================================================================
 */

const RAW_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
// S'assure que l'URL de base contient le préfixe /api
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE.replace(/\/$/, "")}/api`;

async function request(path, options = {}) {
  const token = localStorage.getItem("token") || localStorage.getItem("taskflow_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Nettoyage de l'URL pour éviter les doublons /api/api
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.replace(/^\/api/, "");
  }

  const fullUrl = `${API_BASE}${cleanPath}`;
  const res = await fetch(fullUrl, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMessage = body.error || body.message || `Erreur HTTP ${res.status}`;
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
