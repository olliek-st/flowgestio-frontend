import { ConcurrentQueue } from "./concurrentQueue";

const API_BASE = ""; // Force relative URLs for Vite proxy

// Global queue for all research API calls
const researchQueue = new ConcurrentQueue(2, 1500, 4); // 2 concurrent, 1.5s base, 4 retries

/** Join base + path safely (avoid double slashes) */
function urlJoin(base, path) {
  if (!base) return path; // use relative path → Vite proxy kicks in
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Small helper to add a timeout to fetch */
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 30000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Run research - now using the concurrency-limited queue
 * @param {{ topic: string, industry?: string, region?: string }} params
 * @returns {Promise<any>}
 */
export async function runResearch({ topic, industry, region }) {
  const payload = { topic, industry, region }; // keep payload minimal & stable

  const endpoint = urlJoin(API_BASE, "/api/research");

  // Use the queue to throttle concurrent requests and handle retries
  return researchQueue.enqueue(async () => {
    let res;
    try {
      res = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        timeout: 30000,
      });
    } catch (err) {
      // Network / CORS / timeout etc.
      const reason = err?.name === "AbortError" ? "Request timed out" : (err?.message || "Network error");
      throw new Error(`Research request failed: ${reason}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // Detect rate limit and attach code for queue retry
      if (res.status === 429 || /rate limit/i.test(text)) {
        const err = new Error(`Research failed (HTTP ${res.status}) ${text}`);
        err.code = 429;
        throw err;
      }
      throw new Error(`Research failed (HTTP ${res.status}) ${text}`);
    }

    // Expected JSON: { schema, summary, facts[], notes[], recency_window_days, _diagnostics? }
    return res.json();
  }, topic);
}