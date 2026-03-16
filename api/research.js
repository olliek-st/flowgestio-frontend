// api/research.js
// Vercel serverless function — secure bridge to Perplexity Sonar (strict JSON out)

import OpenAI from "openai";
import { z } from "zod";

/* =========================
   Config
   ========================= */
const DEFAULT_MODEL = "sonar";
const DEFAULT_RECENCY_DAYS = 365;
const HARD_TIMEOUT_MS = 20_000;

const BUSINESS_CASE_DOMAINS = [
  "hbr.org", "mckinsey.com", "bcg.com", "bain.com", "deloitte.com",
  "pwc.com", "kpmg.com", "ey.com", "gartner.com", "forrester.com",
  "canada.ca", "ontario.ca", "sec.gov", "investopedia.com", "https://www.canada.ca/en/treasury-board-secretariat/services/information-technology-project-management/project-management/business-case-guide.html"
];
const PMI_DOMAINS = ["pmi.org"];

/* =========================
   Validation
   ========================= */
const ReqSchema = z.object({
  topic: z.string().min(3),
  industry: z.string().optional(),
  region: z.string().optional(),
  recencyDays: z.number().int().positive().max(3650).optional(),
  domains: z.array(z.string().min(3)).optional(),
  documentType: z.string().optional(),
  excludeTerms: z.array(z.string()).optional(),
  priorityTerms: z.array(z.string()).optional(),
  queryIntent: z.string().optional(),
  projectContext: z.object({
    hasCapex: z.boolean().optional(),
    hasOpex: z.boolean().optional(),
    projectSize: z.string().optional(),
    problemDomain: z.string().optional(),
  }).optional(),
  specificQueries: z.array(z.string()).optional(),
}).strict();

/* =========================
   Helpers
   ========================= */
function daysToRecencyFilter(days) {
  if (!days) return "year";
  if (days <= 7) return "week";
  if (days <= 31) return "month";
  return "year";
}

function buildSystemPrompt(documentType, excludeTerms, priorityTerms) {
  const parts = [
    "You are a research assistant that returns ONLY compact JSON.",
    'Contract: { "schema":"perplexity.research.v1", "summary":string, "facts":[{ "claim":string,"url":string,"snippet":string,"source":string,"published":string,"confidence":number }], "notes":string[], "recency_window_days":number }',
    "Rules:",
    "- Output MUST be a single JSON object matching the contract.",
    "- facts[].url MUST be the citation URL used.",
    "- facts[].source MUST be the publisher/site name.",
    "- published is ISO date if known, else empty string.",
    "- confidence 0..1 based on quality & agreement.",
    "- Summary <= 120 words. No extra keys, no markdown."
  ];

  if (documentType === "business-case") {
    parts.push(
      "",
      "BUSINESS CASE FOCUS:",
      "- Prioritize financial justification, ROI analysis, cost-benefit examples",
      "- Include industry-specific business case metrics and benchmarks",
      "- Focus on investment analysis, payback periods, NPV examples",
      "- Avoid generic project management methodology content"
    );
  }

  if (excludeTerms?.length) parts.push("", `EXCLUDE content about: ${excludeTerms.join(", ")}`);
  if (priorityTerms?.length) parts.push(`PRIORITIZE content about: ${priorityTerms.join(", ")}`);

  return parts.join("\n");
}

function buildUserPrompt({ topic, industry, region, recencyDays, specificQueries, projectContext }) {
  const p = [];
  p.push(specificQueries?.length ? `Research queries: ${specificQueries.join(" | ")}` : `Topic: ${topic}`);
  if (industry) p.push(`Industry: ${industry}`);
  if (region) p.push(`Region: ${region}`);

  if (projectContext) {
    const ctx = [];
    if (projectContext.projectSize) ctx.push(`Project size: ${projectContext.projectSize}`);
    if (projectContext.problemDomain) ctx.push(`Problem domain: ${projectContext.problemDomain}`);
    if (ctx.length) p.push(`Project context: ${ctx.join(", ")}`);
  }

  p.push(`Recency window (days): ${recencyDays ?? DEFAULT_RECENCY_DAYS}`);
  p.push("Task: Summarize and extract 4-8 verifiable facts with citations. Prefer authoritative business and financial sources.");
  return p.join("\n");
}

function selectDomains(documentType, customDomains) {
  if (customDomains?.length) return customDomains;
  return documentType === "business-case"
    ? BUSINESS_CASE_DOMAINS
    : [...BUSINESS_CASE_DOMAINS, ...PMI_DOMAINS];
}

function safeParseJSON(s) {
  try { return { data: JSON.parse(s), error: null }; }
  catch (err) { return { data: null, error: String(err) }; }
}

function parseRequestBody(req) {
  const body = req?.body;
  if (body == null) return {};
  if (typeof body === "string") return safeParseJSON(body).data ?? {};
  return body;
}

const RESPONSE_JSON_SCHEMA = {
  name: "perplexity_research_contract",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      schema: { type: "string", const: "perplexity.research.v1" },
      summary: { type: "string" },
      facts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            claim: { type: "string" },
            url: { type: "string" },
            snippet: { type: "string" },
            source: { type: "string" },
            published: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["claim", "url", "snippet", "source", "published", "confidence"],
        },
      },
      notes: { type: "array", items: { type: "string" } },
      recency_window_days: { type: "number" },
    },
    required: ["schema", "summary", "facts", "notes", "recency_window_days"],
  },
  strict: true,
};

function stubResponse({ recencyDays, notes = [] }) {
  return {
    schema: "perplexity.research.v1",
    summary: "",
    facts: [],
    notes: ["no_live_citations", ...notes],
    recency_window_days: recencyDays ?? DEFAULT_RECENCY_DAYS,
    _diagnostics: { model: DEFAULT_MODEL, search_results: [], usage: null },
  };
}

async function callPerplexity({ messages, search_recency_filter, search_domain_filter }) {
  const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });

  const request = client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: "json_schema", json_schema: RESPONSE_JSON_SCHEMA },
    search_mode: "web",
    search_recency_filter,
    search_domain_filter,
  });

  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("HARD_TIMEOUT")), HARD_TIMEOUT_MS));
  return Promise.race([request, timeout]);
}

/* =========================
   Vercel handler
   ========================= */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-FlowGestio-Strict", "true");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.PERPLEXITY_API_KEY) {
    // Never throw — return deterministic stub so the wizard UI keeps flowing
    return res.status(200).json(stubResponse({ notes: ["missing_api_key"] }));
  }

  const raw = parseRequestBody(req);
  const parsed = ReqSchema.safeParse(raw);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
  }

  const {
    topic, industry, region, recencyDays, domains,
    documentType, excludeTerms, priorityTerms, specificQueries, projectContext
  } = parsed.data;

  const messages = [
    { role: "system", content: buildSystemPrompt(documentType, excludeTerms, priorityTerms) },
    { role: "user", content: buildUserPrompt({ topic, industry, region, recencyDays, specificQueries, projectContext }) },
  ];
  const search_recency_filter = daysToRecencyFilter(recencyDays ?? DEFAULT_RECENCY_DAYS);
  const search_domain_filter = selectDomains(documentType, domains);

  let completion;
  try {
    completion = await callPerplexity({ messages, search_recency_filter, search_domain_filter });
  } catch (err) {
    const reason = (err?.message === "HARD_TIMEOUT") ? "request_timed_out" : "request_failed";
    return res.status(200).json(stubResponse({ recencyDays, notes: [reason] }));
  }

  const model = completion?.model || DEFAULT_MODEL;
  const search_results = completion?.search_results || [];
  const usage = completion?.usage || null;

  const content = completion?.choices?.[0]?.message?.content?.trim() || "{}";
  const { data: json, error: parseErr } = safeParseJSON(content);

  if (parseErr || !json || json.schema !== "perplexity.research.v1") {
    return res.status(200).json({
      ...stubResponse({ recencyDays, notes: ["parse_error"] }),
      _diagnostics: { model, search_results, raw: content?.slice(0, 4000), usage },
    });
  }

  const facts = Array.isArray(json.facts) ? json.facts
    .map(f => ({
      claim: String(f?.claim ?? ""),
      url: String(f?.url ?? ""),
      snippet: String(f?.snippet ?? ""),
      source: String(f?.source ?? ""),
      published: String(f?.published ?? ""),
      confidence: typeof f?.confidence === "number" ? f.confidence : 0.5,
    }))
    .filter(fact => {
      if (documentType === "business-case" && Array.isArray(excludeTerms) && excludeTerms.length) {
        const c = (fact.claim || "").toLowerCase();
        return !excludeTerms.some(t => c.includes(String(t).toLowerCase()));
      }
      return true;
    })
  : [];

  return res.status(200).json({
    schema: "perplexity.research.v1",
    summary: String(json.summary ?? ""),
    facts,
    notes: Array.isArray(json.notes) ? json.notes.map(String) : [],
    recency_window_days: Number(json.recency_window_days ?? recencyDays ?? DEFAULT_RECENCY_DAYS),
    _diagnostics: { model, search_results, usage, domains_used: search_domain_filter, document_type: documentType },
  });
}
