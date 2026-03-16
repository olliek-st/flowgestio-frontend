// api/llm/research-options.js
// Vercel Serverless Function — generates structured project alternatives via Perplexity Sonar.
//
// Strict response contract (per option):
//   { id, name, type, description, shortDescription,
//     capex: number|null, opex: number|null,
//     costAssumptions: string, sources: string[],
//     origin: "ai", provider: string, promptVersion: string, rawHash: string }
//
// No extra fields. capex/opex are number|null — never a string.
// sources are 0–3 http(s):// URLs.
// rawHash is a full SHA-256 hex string.

import OpenAI from "openai";
import { createHash } from "node:crypto";

/* =========================
   Constants
   ========================= */
const HARD_TIMEOUT_MS = 25_000;
const DEFAULT_MODEL    = "sonar";
const PROMPT_VERSION   = "research-options-v2";

const VALID_TYPES = [
  "Buy", "Build", "Partner", "ProcessChange",
  "PolicyRegulatory", "Technology", "Other",
];

/* =========================
   Helpers
   ========================= */
function uid() {
  return `research_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

/** Full SHA-256 hex string — no truncation. */
function stableHash(str) {
  return createHash("sha256").update(str, "utf8").digest("hex");
}

function parseRequestBody(req) {
  const body = req?.body;
  if (!body) return {};
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return body;
}

function extractProjectContext(body) {
  const step1  = body?.step1 || {};
  const inputs = step1?.inputs || step1 || {};
  return {
    topic:               inputs.topic || inputs.projectTitle || inputs.title || step1.topic || "",
    industry:            inputs.industry || step1.industry || "",
    region:              inputs.region   || step1.region   || "",
    problemStatement:    inputs.problem  || inputs.businessNeed || inputs.problemStatement || "",
    organizationContext: inputs.org      || inputs.organizationName || step1.org || "",
  };
}

function buildSystemPrompt({ topic, industry, region }) {
  const lines = [
    "You are a business case analyst generating project implementation alternatives.",
    "Return ONLY a JSON object — no markdown, no prose outside the object.",
    "",
    "Schema:",
    '{ "options": [ { "name": string, "type": string, "description": string,',
    '  "capex": number|null, "opex": number|null,',
    '  "costAssumptions": string, "sources": string[] } ] }',
    "",
    "Field rules:",
    "- type: one of Buy | Build | Partner | ProcessChange | PolicyRegulatory | Technology | Other",
    "- description: 3–5 sentences — what it is, how it addresses the need, key assumptions.",
    "- capex: MUST be a number (integer or decimal) or null.",
    "  NEVER use strings like 'High', 'Medium', 'Low', 'N/A', or any text.",
    "  Use the one-time capital cost in CAD/USD if estimable from published benchmarks.",
    "  Return null when no reliable numeric estimate exists — do not invent numbers.",
    "- opex: MUST be a number (integer or decimal) or null. Annual operating cost in CAD/USD.",
    "  Same rules as capex — null when not reliably estimable. Never a string.",
    "- costAssumptions: 1 sentence explaining the cost basis, or why capex/opex are null.",
    "- sources: 0–3 URLs (http or https) from authoritative sources. [] if none.",
    "- DO NOT hallucinate numeric costs. Prefer null over invented numbers.",
    "- DO NOT include duplicate or near-duplicate options.",
    "- Generate 3–5 options including a Status Quo (current state) baseline.",
  ];

  if (industry) lines.push(`Industry context: ${industry}`);
  if (region)   lines.push(`Region / jurisdiction: ${region}`);
  if (topic)    lines.push(`Project topic: ${topic}`);

  return lines.join("\n");
}

function buildUserPrompt({ topic, industry, region, problemStatement, organizationContext }) {
  const parts = [];
  if (topic)               parts.push(`Project: ${topic}`);
  if (industry)            parts.push(`Industry: ${industry}`);
  if (region)              parts.push(`Region: ${region}`);
  if (problemStatement)    parts.push(`Business problem: ${problemStatement}`);
  if (organizationContext) parts.push(`Organization: ${organizationContext}`);
  parts.push(
    "Generate 3–5 realistic implementation alternatives (including Status Quo) for this project context.",
    "For each option, research realistic cost NUMBERS from public benchmarks if available.",
    "capex and opex MUST be numbers or null — never strings.",
    "Return the JSON object only.",
  );
  return parts.join("\n");
}

/**
 * Validate a single raw option from the AI response and build the canonical object.
 * Returns null if the option is not usable.
 * Never spreads the raw LLM object — constructs explicitly from extracted fields only.
 *
 * Strict output: { name, type, description, shortDescription, rawHash,
 *                  capex, opex, costAssumptions, sources }
 */
function validateOption(raw) {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name || "").trim();
  if (!name) return null;

  const type        = VALID_TYPES.includes(raw.type) ? raw.type : "Other";
  const description = String(raw.description || "").trim();

  // shortDescription: first sentence ≤160 chars, else first 160 chars
  const firstSentenceMatch = description.match(/^[^.!?]+[.!?]/);
  const shortDescription   = firstSentenceMatch
    ? firstSentenceMatch[0].trim().slice(0, 160)
    : description.slice(0, 160);

  // rawHash: full SHA-256 hex of canonical identity fields
  const rawHash = stableHash(`${name}|${type}|${description.slice(0, 200)}`);

  // capex / opex: number|null — any string from the model is coerced to null
  const capex = typeof raw.capex === "number" && isFinite(raw.capex) ? raw.capex : null;
  const opex  = typeof raw.opex  === "number" && isFinite(raw.opex)  ? raw.opex  : null;

  const costAssumptions = String(raw.costAssumptions || "").trim();

  // sources: allow http:// and https://, max 3, filter non-URLs
  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .filter((s) => typeof s === "string" && (s.startsWith("https://") || s.startsWith("http://")))
        .slice(0, 3)
    : [];

  // Explicit canonical construction — no extra fields, no spread of raw
  return {
    name,
    type,
    description,
    shortDescription,
    rawHash,
    capex,
    opex,
    costAssumptions,
    sources,
  };
}

/**
 * Parse JSON from AI response content, handling markdown fences.
 */
function parseAIContent(content) {
  let jsonStr = content;

  // Strip markdown code fences if present
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonStr = fenced[1].trim();

  // Direct parse
  try { return JSON.parse(jsonStr); } catch { /* fall through */ }

  // Extract outermost JSON object
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
  }

  return null;
}

/**
 * Build the strict canonical option object with provenance fields.
 * Explicitly lists every field — never spreads the validated object.
 */
function buildCanonicalOption(validated, provider) {
  return {
    id:               uid(),
    name:             validated.name,
    type:             validated.type,
    description:      validated.description,
    shortDescription: validated.shortDescription,
    capex:            validated.capex,
    opex:             validated.opex,
    costAssumptions:  validated.costAssumptions,
    sources:          validated.sources,
    origin:           "ai",
    provider,
    promptVersion:    PROMPT_VERSION,
    rawHash:          validated.rawHash,
  };
}

/**
 * Fallback mock options returned when Perplexity is unavailable.
 * Costs are null because we cannot research them without the API.
 * All required schema fields are present; no extra fields.
 */
function mockOptions({ topic = "project", industry = "Government" }) {
  const items = [
    {
      name: "Status Quo — Continue Current Approach",
      type: "Other",
      description:
        `Maintain existing processes and systems for ${topic}. This option serves as the mandatory baseline for comparison. No new capital investment is required; however, the underlying business need remains unaddressed and existing pain points persist.`,
      capex: 0,
      opex:  null,
      costAssumptions: "No new capital outlay. Existing operational costs continue unchanged.",
      sources: [],
    },
    {
      name: "Commercial Off-The-Shelf (COTS) Solution",
      type: "Buy",
      description:
        `Procure a commercially available product or SaaS platform to address ${topic} in the ${industry} sector. Fastest path to value with vendor-managed maintenance, regular updates, and established support models. Customization is limited to configuration.`,
      capex: null,
      opex:  null,
      costAssumptions:
        "Costs not estimable without market sounding or RFI. Pricing varies significantly by vendor and scale.",
      sources: [],
    },
    {
      name: "Custom Development",
      type: "Build",
      description:
        `Develop a bespoke solution in-house or via contracted software development to fully address ${topic}. Offers maximum fit to requirements and long-term organizational ownership. Carries higher delivery risk and longer time to value.`,
      capex: null,
      opex:  null,
      costAssumptions:
        "Costs depend on scope, team composition, and technology stack. A discovery phase is required to produce a reliable estimate.",
      sources: [],
    },
    {
      name: "Managed Service / Partnership",
      type: "Partner",
      description:
        `Engage a specialized third-party provider to deliver and operate the solution for ${topic}. Transfers operational complexity and staffing risk while retaining governance oversight. Suitable when specialized expertise is unavailable internally.`,
      capex: null,
      opex:  null,
      costAssumptions:
        "Typically priced as outcome-based, FTE-based, or subscription model. Requires market sounding to estimate.",
      sources: [],
    },
  ];

  return items.map((item) => {
    const firstSentenceMatch = item.description.match(/^[^.!?]+[.!?]/);
    const shortDescription   = firstSentenceMatch
      ? firstSentenceMatch[0].trim().slice(0, 160)
      : item.description.slice(0, 160);
    const rawHash = stableHash(`${item.name}|${item.type}|${item.description.slice(0, 200)}`);
    return { ...item, shortDescription, rawHash };
  });
}

/* =========================
   Vercel handler
   ========================= */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = parseRequestBody(req);
  const ctx  = extractProjectContext(body);

  // ── Mock path (no API key) ────────────────────────────────────────────────
  if (!process.env.PERPLEXITY_API_KEY) {
    return res.status(200).json({
      options: mockOptions(ctx).map((o) => buildCanonicalOption(o, "mock")),
      _mock: true,
    });
  }

  // ── Live Perplexity path ──────────────────────────────────────────────────
  const client = new OpenAI({
    apiKey:  process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });

  const messages = [
    { role: "system", content: buildSystemPrompt(ctx) },
    { role: "user",   content: buildUserPrompt(ctx) },
  ];

  let completion;
  try {
    const request = client.chat.completions.create({
      model:                 DEFAULT_MODEL,
      messages,
      temperature:           0.3,
      max_tokens:            2000,
      search_mode:           "web",
      search_recency_filter: "year",
    });
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error("TIMEOUT")), HARD_TIMEOUT_MS)
    );
    completion = await Promise.race([request, timeout]);
  } catch (err) {
    console.error("[research-options] Perplexity error:", err?.message);
    const reason = err?.message === "TIMEOUT" ? "request_timed_out" : "request_failed";
    return res.status(200).json({
      options: mockOptions(ctx).map((o) => buildCanonicalOption(o, "mock_fallback")),
      _error:  reason,
    });
  }

  // ── Parse and validate ────────────────────────────────────────────────────
  const content = completion?.choices?.[0]?.message?.content?.trim() || "{}";
  const parsed  = parseAIContent(content);

  if (!parsed || !Array.isArray(parsed.options)) {
    return res.status(200).json({
      options: mockOptions(ctx).map((o) => buildCanonicalOption(o, "mock_parse_fallback")),
      _error:  "parse_failed",
      _raw:    content.slice(0, 500),
    });
  }

  const mappedOptions = parsed.options
    .map(validateOption)
    .filter(Boolean)
    .map((o) => buildCanonicalOption(o, "perplexity"));

  if (mappedOptions.length === 0) {
    return res.status(200).json({
      options: mockOptions(ctx).map((o) => buildCanonicalOption(o, "mock_validation_fallback")),
      _error:  "no_valid_options",
    });
  }

  return res.status(200).json({
    provider:      "perplexity",
    promptVersion: PROMPT_VERSION,
    options:       mappedOptions,
  });
}
