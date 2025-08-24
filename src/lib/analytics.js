// src/lib/analytics.js
export function initAnalytics() {
  try {
    if (!import.meta.env.PROD) return;
    if (window.__PH_INITIALIZED__) return;

    const key  = import.meta.env.VITE_POSTHOG_KEY;
    const host = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

    if (!key || /your_key_here/i.test(String(key))) {
      console.info("[analytics] PostHog disabled (no key)");
      return;
    }

    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        autocapture: false,
        capture_pageview: true,
        persistence: "localStorage",
      });
      window.posthog = posthog;
      window.__PH_INITIALIZED__ = true;
    }).catch((e) => {
      console.warn("[analytics] init failed:", e);
    });
  } catch (e) {
    console.warn("[analytics] disabled:", e);
  }
}

export function track(event, properties) {
  try { window.posthog?.capture?.(event, properties); } catch {}
}

export function identify(userId, props) {
  try { window.posthog?.identify?.(userId, props); } catch {}
}
