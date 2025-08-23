// api/waitlist.js
export default async function handler(req, res) {
  // CORS (simple + preflight)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { name, email } = body;

    if (!email) return res.status(400).json({ error: "Email required" });

    const upstream = process.env.WAITLIST_API_BASE && process.env.WAITLIST_API_BASE.replace(/\/+$/, "");
    if (upstream) {
      const url = `${upstream}/beta/request`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    return res.status(204).end();
  } catch (err) {
    return res.status(502).json({ error: "Upstream/parse error", detail: String(err?.message || err) });
  }
}
