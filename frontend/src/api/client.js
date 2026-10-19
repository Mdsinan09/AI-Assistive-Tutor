/**
 * Centralized API Client with Auth Header Injection and Error Normalization
 */

const ENV_API_BASE = import.meta.env.VITE_API_BASE_URL;

const API_BASE = ENV_API_BASE
  ? ENV_API_BASE.replace(/\/+$/, "")
  : typeof window !== "undefined"
  ? "" // Always use relative URLs in browser to route through Vite proxy on any port (5173, 5174, etc.)
  : "http://127.0.0.1:8000";

let onUnauthorizedCallback = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorizedCallback = fn;
}

export function getAuthToken() {
  return localStorage.getItem("tutor_token") || null;
}

export async function request(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };

  const token = getAuthToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set application/json default
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Your session has expired. Please sign in again.");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server request failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("Failed to fetch")) {
      throw new Error("Unable to connect to the Assistive Tutor server. Ensure the backend is running on port 8000.");
    }
    throw err;
  }
}
