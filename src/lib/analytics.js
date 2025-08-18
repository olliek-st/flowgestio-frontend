import posthog from "posthog-js";

export function initAnalytics() {
  if (import.meta.env.PROD && !window.__PH_INITIALIZED__) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      capture_pageview: true,
      persistence: "localStorage",
    });
    window.__PH_INITIALIZED__ = true;
  }
}

export function track(event, properties) {
  try { posthog.capture(event, properties); } catch {}
}

export function identify(userId, props) {
  try { posthog.identify(userId, props); } catch {}
}
