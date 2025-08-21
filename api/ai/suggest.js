// Vercel Serverless Function (Node)
// Path: api/ai/suggest.js
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "*"; // or set to your domains

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

    // MOCK response if no key provided (lets you demo the UX)
    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        text:
          "[MOCK] " +
          (body.intent === "rewrite"
            ? "Here’s a refined version of the purpose you entered."
            : "Here’s a concise project‑purpose draft based on your inputs."),
        model: "mock",
        promptHash: "mock-" + Date.now(),
      });
    }

    // Real call to OpenAI (minimal)
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You help draft clear, concise project-charter text." },
          { role: "user", content: JSON.stringify(body) },
        ],
        temperature: body?.style?.temperature ?? 0.3,
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      return res.status(502).send(`Upstream error: ${t}`);
    }

    const json = await upstream.json();
    const text = json?.choices?.[0]?.message?.content?.trim?.() || "[No content returned]";
    res.status(200).json({
      text,
      model: json?.model || "gpt-4o-mini",
      promptHash: (json?.id || "").slice(-8),
    });
  } catch (e) {
    res.status(500).send(e?.message || "Server error");
  }
}
