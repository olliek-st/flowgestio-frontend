// /api/generate-section.js
// Vercel serverless function (ESM). No other files required.
// Uses OPENAI_API_KEY from your environment.

import OpenAI from "openai";

// /api/generate-section.js
// Vercel serverless function (ESM). No other files required.
// Uses OPENAI_API_KEY from your environment. POST only.

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// ---- CORS helpers -----------------------------------------------------------
function isOriginAllowed(origin) {
  if (!origin) return true; // allow same-origin / server-to-server
  if (ALLOWED_ORIGINS.length === 0) return true; // open if not configured
  try {
    const host = new URL(origin).host;
    return ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(host);
  } catch {
    return false;
  }
}

function setCors(res, origin) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
  }
}

function endJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

// ---- Small utils ------------------------------------------------------------
function safeJsonParse(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  try { return JSON.parse(body); } catch { return {}; }
}

function logHit(endpoint, req, meta = {}) {
  try {
    // Keep it minimal to avoid logging sensitive inputs
    // eslint-disable-next-line no-console
    console.log(`>>> ${endpoint}`, JSON.stringify({
      t: new Date().toISOString(),
      ua: req.headers["user-agent"],
      origin: req.headers.origin,
      hasKey: !!process.env.OPENAI_API_KEY,
      meta: {
        sectionId: meta?.currentSection?.id,
        sectionTitle: meta?.currentSection?.title,
        industry: meta?.meta?.industry
      }
    }));
  } catch {}
}

// ---- Vercel handler ---------------------------------------------------------
export default async function handler(req, res) {
  setCors(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== "POST") {
    return endJson(res, 405, { error: "METHOD_NOT_ALLOWED", message: "Use POST" });
  }

  try {
    const body = safeJsonParse(req.body);
    const {
      meta,
      currentSection,
      priorSections = [],
      research = null,
      tone = "professional, concise, PMI-aligned"
    } = body || {};

    if (!currentSection?.id || !currentSection?.title) {
      return endJson(res, 400, {
        error: "INVALID_INPUT",
        detail: "currentSection.id and title are required"
      });
    }

    logHit("/api/generate-section", req, { meta, currentSection });

    // ---- MOCK path (no key) so UI still works ------------------------------
    if (!process.env.OPENAI_API_KEY) {
      return endJson(res, 200, {
        id: currentSection.id,
        title: currentSection.title,
        content_md: `**[MOCK] ${currentSection.title}**\n\nThis is a placeholder section generated without an API key. Provide more details and click Generate again once OPENAI_API_KEY is set.`,
        connector_md: "Consider outlining the next section to maintain narrative flow.",
        suggestions: [
          { id: "s1", label: "Tighten focus", body_md: "Refine the key message to a single, outcome-oriented statement." },
          { id: "s2", label: "Add local context", body_md: "Insert one concrete local data point that illustrates the need." }
        ],
        guidelines: [
          { id: "g1", note_md: "Consider quantifying expected improvements using ranges rather than exact numbers." },
          { id: "g2", note_md: "Consider naming key stakeholders and how they will be affected." }
        ]
      });
    }

    // ---- Section context shaping -------------------------------------------
    const industry = (meta?.industry || "general").toString();

    const rawFields = currentSection?.fields || {};
    const filledFields = Object.fromEntries(
      Object.entries(rawFields).filter(([, v]) => (v ?? "").toString().trim().length > 0)
    );
    const emptyFields = Object.keys(rawFields).filter((k) => !filledFields.hasOwnProperty(k));

    const SECTION_HINT = ({
      exec_summary: "Purpose: crisp value proposition, 2–3 key objectives, 2–4 outcomes; avoid deep detail.",
      problem: "Purpose: articulate business need, evidence, who is impacted; avoid solutioning.",
      strategic_alignment: "Purpose: tie initiative to org strategy, KPIs, mandates; keep it directional.",
      scope: "Purpose: objectives, major deliverables, in/out of scope; avoid timeline & costs.",
      alternatives: "Purpose: baseline vs options; compare using alignment/cost/risk/benefit; avoid final pick.",
      recommendation: "Purpose: state chosen option and why; mention complexity & key cost components briefly.",
      benefits: "Purpose: quantify if known (ranges ok), list non-financial benefits; avoid double-counting.",
      costs: "Purpose: CapEx, OpEx, one-time implementation; group logically; ranges ok.",
      financials: "Purpose: analysis period, method, assumptions; avoid fabricating exact dollars; ranges ok.",
      risks: "Purpose: top 5–8 risks with likelihood/impact/mitigation; concise lines.",
      implementation: "Purpose: approach, phases, timeline bands, resources & training; avoid day-level dates.",
      success_criteria: "Purpose: financial/operational/strategic measures and benefits realization plan.",
      governance: "Purpose: approvals, decision gates, ownership, review cadence."
    }[currentSection.id]) || "Write the section in PMI business-case style.";

    const facts = Array.isArray(research?.facts) ? research.facts.slice(0, 8) : [];
    const factsBlock = facts.length
      ? facts.map((f, i) => `- [${i + 1}] ${f.claim} (${f.url})`).join("\n")
      : "–";

    const priorText =
      (priorSections || [])
        .map(s => `### ${s.title}\n${(s.content_md || "").trim()}`)
        .join("\n\n") || "–";

    // ---- Prompt -------------------------------------------------------------
    const system = `
You are a senior project manager writing a PMI-aligned Business Case for the ${industry} domain.
Write with ${tone}. Keep prose clear, specific, and non-repetitive. Maintain continuity with prior sections.
If exact figures are missing, avoid inventing numbers—use qualitative phrasing or ranges.
Return VALID JSON only, following the output shape exactly.
`.trim();

    const user = `
META
- Title: ${meta?.title ?? "Untitled"}
- Organization: ${meta?.org ?? ""}
- Author/Date: ${meta?.author ?? ""} / ${meta?.date ?? ""}
- Stated Goals: ${(meta?.goals || []).join("; ") || "–"}

PRIOR SECTIONS (finalized content so far)
${priorText}

RESEARCH (Perplexity)
- Summary: ${research?.summary || "–"}
- Facts:
${factsBlock}

CURRENT SECTION
- Id: ${currentSection.id}
- Title: ${currentSection.title}
- Section Type Hint: ${SECTION_HINT}

USER INPUT (raw form values)
- Filled fields:
${JSON.stringify(filledFields, null, 2) || "{}"}
- Empty fields:
${JSON.stringify(emptyFields, null, 2) || "[]"}

STRICT REQUIREMENTS
1) Produce "content_md": polished Markdown for THIS section only. Use the user's filled fields verbatim where sensible.
2) Produce "connector_md": 1–2 sentences that smoothly lead into the next PMI section.
3) Produce 2–4 "suggestions": each MUST reference at least one current field name or the fact it is empty.
   - If a field is empty, propose ONE concrete, plausible addition (no fabricated precise $$ or dates; use ranges/examples).
   - When a suggestion relies on RESEARCH facts, cite using [#] indices that match the Facts list above.
   - Suggestions must be specific to THIS section (no generic writing advice).
4) Produce 2–3 "guidelines": each MUST start with "Consider" and be tailored to THIS section type (see Section Type Hint).
5) Do NOT invent precise dollars, dates, or KPIs. Use ranges or qualitative terms if data is not provided.

OUTPUT JSON SHAPE
{
  "id": string,
  "title": string,
  "content_md": string,
  "connector_md": string,
  "suggestions": [{ "id": string, "label": string, "body_md": string }],
  "guidelines": [{ "id": string, "note_md": string }]
}
`.trim();

    // ---- OpenAI call with timeout ------------------------------------------
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_BUSINESSCASE || "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 2000,
      }),
      signal: controller.signal,
    }).catch((e) => {
      if (e.name === "AbortError") throw new Error("Upstream timeout");
      throw e;
    }).finally(() => clearTimeout(timeout));

    const raw = await upstream.text();
    if (!upstream.ok) {
      console.error("OpenAI non-OK:", upstream.status, raw?.slice?.(0, 1000));
      return endJson(res, 502, { error: "AI_SERVICE_ERROR", status: upstream.status, body: raw?.slice?.(0, 2000) });
    }

    // Some OpenAI responses double-wrap JSON. Handle gracefully.
    let inner = "{}";
    try {
      const parsed = JSON.parse(raw);
      inner = parsed?.choices?.[0]?.message?.content || "{}";
    } catch { inner = raw; }

    let out;
    try {
      out = JSON.parse(inner);
    } catch {
      // Fallback: try to return the raw content inside content_md
      out = {
        id: currentSection.id,
        title: currentSection.title,
        content_md: String(inner || ""),
        connector_md: "",
        suggestions: [],
        guidelines: [],
      };
    }

    // Normalize shape
    const normalized = {
      id: out.id || currentSection.id,
      title: out.title || currentSection.title,
      content_md: (out.content_md || "").trim(),
      connector_md: (out.connector_md || "").trim(),
      suggestions: Array.isArray(out.suggestions) ? out.suggestions : [],
      guidelines: Array.isArray(out.guidelines) ? out.guidelines : [],
    };

    return endJson(res, 200, normalized);
  } catch (e) {
    console.error("Handler error (/api/generate-section):", e);
    return endJson(res, 500, { error: "INTERNAL_ERROR", message: e?.message || "Server error" });
  }
}
