export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS,GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    // Quick probe to confirm the route is live
    return res.status(200).json({ ok: true, route: "/api/waitlist", method: "GET" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { name, email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email required" });

    // TODO: forward to your backend or store it (e.g., fetch to external API)
    // const base = process.env.WAITLIST_API_BASE;
    // if (base) {
    //   await fetch(`${base}/beta/request`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ name, email }),
    //   });
    // }

    // For now, just succeed silently.
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err?.message });
  }
}
