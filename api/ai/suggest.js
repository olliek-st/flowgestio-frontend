// Retired legacy endpoint (FG-LEGACY-API-EXPOSURE-01).
// Deterministic HTTP 410 for every request method. No provider calls,
// no environment or secret reads, no imports.
const BODY = JSON.stringify({
  error: "LEGACY_ENDPOINT_RETIRED",
  message: "This historical endpoint has been retired.",
});

export default function handler(req, res) {
  res.statusCode = 410;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(BODY);
}
