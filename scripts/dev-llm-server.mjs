#!/usr/bin/env node
import http from "node:http";
import { URL } from "node:url";

const PORT = process.env.LLM_DEV_PORT ? Number(process.env.LLM_DEV_PORT) : 4001;

// Minimal JSON helpers
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Mock draft generator (safe fallback)
function mockDraft({ sectionId, fieldKey, section }) {
  const title = section?.title || sectionId || "Section";
  return `MOCK DRAFT (${title} / ${fieldKey || "field"}):\n\nWrite a concise, decision-ready paragraph here.`;
}

/**
 * NOTE: This dev server intentionally does NOT implement full OpenAI calling logic
 * because we want it lightweight and predictable. If you want real OpenAI drafts
 * locally, we can add it later, but mock mode is enough to validate the frontend flow.
 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    return res.end();
  }

  if (req.method === "POST" && url.pathname === "/api/llm/draft-section") {
    try {
      const body = await readJson(req);
      const text = mockDraft(body);
      return sendJson(res, 200, { text });
    } catch (err) {
      return sendJson(res, 400, { error: "Invalid JSON body" });
    }
  }

  // Not found
  return sendJson(res, 404, { error: "Not Found", path: url.pathname });
});

server.listen(PORT, () => {
  console.log(`[llm-dev] LLM dev server running on http://localhost:${PORT}`);
  console.log(`[llm-dev] Route: POST /api/llm/draft-section`);
});
