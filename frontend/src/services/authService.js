/**
 * ============================================================================
 * TaskFlow - Service d'Authentification (Auth API Service Layer)
 * ============================================================================
 * Connecté directement aux endpoints backend Express / MongoDB :
 * - POST /api/auth/login
 * - POST /api/auth/register
 * - GET /api/health
 * ============================================================================
 */

import { api } from "../api/client";

export async function checkBackendHealth() {
  try {
    const res = await api.get("/health");
    return { online: true, status: res.status };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

export async function loginUser(credentials) {
  const data = await api.post("/auth/login", {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  });

  const user = {
    id: data.userId,
    email: credentials.email.trim().toLowerCase(),
    name: data.name || credentials.email.split("@")[0],
    avatarUrl: data.avatarUrl || null,
    role: "Alternant",
  };

  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("taskflow_token", data.token);
    localStorage.setItem("taskflow_user", JSON.stringify(user));
  }

  return { token: data.token, user };
}

export async function registerUser(userData) {
  try {
    const data = await api.post("/auth/register", {
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      name: userData.name || userData.email.split("@")[0],
    });

    const user = {
      id: data.userId,
      email: userData.email.trim().toLowerCase(),
      name: data.name || userData.name || userData.email.split("@")[0],
      avatarUrl: data.avatarUrl || null,
      role: userData.role || "Alternant",
    };

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("taskflow_token", data.token);
      localStorage.setItem("taskflow_user", JSON.stringify(user));
    }

    return { token: data.token, user };
  } catch (err) {
    if (err.status === 409) {
      err.fieldErrors = { email: "Cet email est déjà associé à un compte" };
    }
    throw err;
  }
}

export async function forgotPassword(email) {
  try {
    return await api.post("/auth/forgot-password", {
      email: email.trim().toLowerCase(),
    });
  } catch (err) {
    if (!err.status || err.status === 404) {
      return { message: "Instructions envoyées à votre adresse e-mail." };
    }
    throw err;
  }
}

export async function logoutUser() {
  localStorage.removeItem("taskflow_token");
  localStorage.removeItem("taskflow_user");
  return Promise.resolve();
}

export function getCurrentUser() {
  const stored = localStorage.getItem("taskflow_user");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}
