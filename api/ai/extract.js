// Vercel Serverless Function (Node)
// Path: api/ai/extract.js
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "*";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { content = "" } = body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        fields: {
          purposeSummary: "[MOCK] Purpose summary from pasted Business Case.",
          keyBenefits: ["[MOCK] Benefit A", "[MOCK] Benefit B"],
          drivers: ["[MOCK] Compliance", "[MOCK] Cost saving"],
          alignment: "[MOCK] Aligns to departmental strategy.",
        },
        model: "mock",
        promptHash: "mock-" + Date.now(),
      });
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You extract concise Business Case highlights: purpose summary, key benefits, drivers, and alignment.",
          },
          { role: "user", content },
        ],
        temperature: 0.3,
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      return res.status(502).send(`Upstream error: ${t}`);
    }

    const json = await upstream.json();
    const text = json?.choices?.[0]?.message?.content || "";
    // naive parse – replace with stricter format if desired
    res.status(200).json({
      fields: { purposeSummary: text },
      model: json?.model || "gpt-4o-mini",
      promptHash: (json?.id || "").slice(-8),
    });
  } catch (e) {
    res.status(500).send(e?.message || "Server error");
  }
}
