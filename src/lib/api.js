// src/lib/api.js
const BASE = import.meta.env.VITE_API_BASE || "";

// Small fetch helper that returns JSON (or throws with a useful message)
async function http(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
    ...opts,
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }

  if (!res.ok) {
    const msg = (data && data.message) || text || "Request failed";
    throw new Error(msg);
  }
  return data;
}

export const api = {
  newsletterSubscribe: (data) =>
    http("/newsletter/subscribe", { method: "POST", body: JSON.stringify(data) }),

  betaRequest: (data) =>
    http("/beta/request", { method: "POST", body: JSON.stringify(data) }),

  signup: (data) =>
    http("/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (data) =>
    http("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () => http("/auth/logout", { method: "POST" }),

  me: () => http("/users/me"),
};
