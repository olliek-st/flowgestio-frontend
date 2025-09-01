// api/research.js
// Vercel serverless function: secure bridge to Perplexity Sonar (strict JSON out)

import { config as loadEnv } from "dotenv";
// Load appropriate env file based on environment
if (process.env.NODE_ENV === "production") {
  loadEnv({ path: ".env.production" });
} else {
  loadEnv({ path: ".env.local" });
  loadEnv(); // fallback to .env if .env.local doesn't exist
}

import OpenAI from "openai";
import { z } from "zod";

/** =========================
 *  Config
 *  ========================= */
const DEFAULT_MODEL = "sonar"; // Perplexity web-searching model
const DEFAULT_RECENCY_DAYS = 365;

// FIXED: Business case focused domains instead of PMI
const BUSINESS_CASE_DOMAINS = [
  "hbr.org", "mckinsey.com", "bcg.com", "bain.com", "deloitte.com",
  "pwc.com", "kpmg.com", "ey.com", "gartner.com", "forrester.com",
  "canada.ca", "ontario.ca", "sec.gov", "investopedia.com"
];

// PMI domains only for non-business case documents
const PMI_DOMAINS = ["pmi.org"];

const HARD_TIMEOUT_MS = 20_000;

/** =========================
 *  Request validation - ENHANCED
 *  ========================= */
const ReqSchema = z.object({
  topic: z.string().min(3),
  industry: z.string().optional(),
  region: z.string().optional(),
  recencyDays: z.number().int().positive().max(3650).optional(),
  domains: z.array(z.string().min(3)).optional(),
  
  // NEW: Business case specific fields
  documentType: z.string().optional(),
  excludeTerms: z.array(z.string()).optional(),
  priorityTerms: z.array(z.string()).optional(),
  queryIntent: z.string().optional(),
  projectContext: z.object({
    hasCapex: z.boolean().optional(),
    hasOpex: z.boolean().optional(),
    projectSize: z.string().optional(),
    problemDomain: z.string().optional()
  }).optional(),
  specificQueries: z.array(z.string()).optional()
}).strict();

/** =========================
 *  Helpers
 *  ========================= */
function daysToRecencyFilter(days) {
  if (!days) return "year";
  if (days <= 7) return "week";
  if (days <= 31) return "month";
  if (days <= 365) return "year";
  return "year";
}

function buildSystemPrompt(documentType, excludeTerms, priorityTerms) {
  const basePrompt = [
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

  // Add business case specific instructions
  if (documentType === "business-case") {
    basePrompt.push(
      "",
      "BUSINESS CASE FOCUS:",
      "- Prioritize financial justification, ROI analysis, cost-benefit examples",
      "- Include industry-specific business case metrics and benchmarks",
      "- Focus on investment analysis, payback periods, NPV examples",
      "- Avoid generic project management methodology content"
    );
  }

  // Add exclusion rules
  if (excludeTerms && excludeTerms.length > 0) {
    basePrompt.push(
      "",
      `EXCLUDE content about: ${excludeTerms.join(", ")}`
    );
  }

  // Add priority rules  
  if (priorityTerms && priorityTerms.length > 0) {
    basePrompt.push(
      `PRIORITIZE content about: ${priorityTerms.join(", ")}`
    );
  }

  return basePrompt.join("\n");
}

function buildUserPrompt({ topic, industry, region, recencyDays, specificQueries, projectContext }) {
  const prompt = [];
  
  // Use specific queries if provided, otherwise use topic
  if (specificQueries && specificQueries.length > 0) {
    prompt.push(`Research queries: ${specificQueries.join(" | ")}`);
  } else {
    prompt.push(`Topic: ${topic}`);
  }
  
  if (industry) prompt.push(`Industry: ${industry}`);
  if (region) prompt.push(`Region: ${region}`);
  
  // Add project context for business cases
  if (projectContext) {
    const context = [];
    if (projectContext.projectSize) context.push(`Project size: ${projectContext.projectSize}`);
    if (projectContext.problemDomain) context.push(`Problem domain: ${projectContext.problemDomain}`);
    if (context.length > 0) {
      prompt.push(`Project context: ${context.join(", ")}`);
    }
  }
  
  prompt.push(`Recency window (days): ${recencyDays ?? DEFAULT_RECENCY_DAYS}`);
  prompt.push("Task: Summarize and extract 4-8 verifiable facts with citations. Prefer authoritative business and financial sources.");
  
  return prompt.join("\n");
}

function selectDomains(documentType, customDomains) {
  // Use custom domains if provided
  if (customDomains && customDomains.length > 0) {
    return customDomains;
  }
  
  // Business case gets business-focused domains
  if (documentType === "business-case") {
    return BUSINESS_CASE_DOMAINS;
  }
  
  // Other PM documents can use PMI + business domains
  return [...BUSINESS_CASE_DOMAINS, ...PMI_DOMAINS];
}

function safeParseJSON(s) {
  try { return { data: JSON.parse(s), error: null }; }
  catch (err) { return { data: null, error: String(err) }; }
}

function parseRequestBody(req) {
  if (!req || typeof req !== "object") return {};
  const body = req.body;
  if (body == null) return {};
  if (typeof body === "string") {
    const { data } = safeParseJSON(body);
    return data || {};
  }
  return body;
}

/** Contract schema for JSON response enforcement (Perplexity structured output) */
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

/** Quick stub response helper (used for offline, errors, and timeouts) */
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

/** Run Perplexity with a hard timeout so we never hang the UI */
async function callPerplexity({ messages, search_recency_filter, search_domain_filter }) {
  const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });

  const p = client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: "json_schema", json_schema: RESPONSE_JSON_SCHEMA },
    search_mode: "web",
    search_recency_filter,
    search_domain_filter,
  });

  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("HARD_TIMEOUT")), HARD_TIMEOUT_MS)
  );

  return Promise.race([p, timeout]);
}

/** =========================
 *  Vercel Serverless Handler (Node runtime)
 *  ========================= */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-FlowGestio-Strict", "true");

  if (req.method === "OPTIONS") {
    // In case you ever call cross-origin; harmless to include
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Fast path if key missing
  if (!process.env.PERPLEXITY_API_KEY) {
    return res.status(200).json(stubResponse({ notes: ["missing_api_key"] }));
  }

  // Parse + validate
  const raw = parseRequestBody(req);
  const parsed = ReqSchema.safeParse(raw);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
  }
  
  const { 
    topic, industry, region, recencyDays, domains,
    documentType, excludeTerms, priorityTerms, specificQueries, projectContext
  } = parsed.data;

  // Build enhanced prompts
  const messages = [
    { role: "system", content: buildSystemPrompt(documentType, excludeTerms, priorityTerms) },
    { role: "user", content: buildUserPrompt({ topic, industry, region, recencyDays, specificQueries, projectContext }) },
  ];
  
  const search_recency_filter = daysToRecencyFilter(recencyDays ?? DEFAULT_RECENCY_DAYS);
  const search_domain_filter = selectDomains(documentType, domains);

  // Call Perplexity with a hard timeout
  let completion;
  try {
    completion = await callPerplexity({ messages, search_recency_filter, search_domain_filter });
  } catch (err) {
    const reason = (err && err.message === "HARD_TIMEOUT") ? "request_timed_out" : "request_failed";
    return res.status(200).json(stubResponse({ recencyDays, notes: [reason] }));
  }

  const model = completion?.model || DEFAULT_MODEL;
  const search_results = completion?.search_results || [];
  const usage = completion?.usage || null;

  // Parse structured JSON safely
  const content = completion?.choices?.[0]?.message?.content?.trim() || "{}";
  const { data: json, error: parseErr } = safeParseJSON(content);

  if (parseErr || !json || json.schema !== "perplexity.research.v1") {
    return res.status(200).json({
      ...stubResponse({ recencyDays, notes: ["parse_error"] }),
      _diagnostics: { model, search_results, raw: content?.slice(0, 4000), usage },
    });
  }

  // Normalize and filter facts
  const facts = Array.isArray(json.facts)
    ? json.facts
        .map((f) => ({
          claim: String(f?.claim ?? ""),
          url: String(f?.url ?? ""),
          snippet: String(f?.snippet ?? ""),
          source: String(f?.source ?? ""),
          published: String(f?.published ?? ""),
          confidence: typeof f?.confidence === "number" ? f.confidence : 0.5,
        }))
        .filter(fact => {
          // Additional server-side filtering for business cases
          if (documentType === "business-case" && excludeTerms) {
            const content = fact.claim.toLowerCase();
            return !excludeTerms.some(term => content.includes(term.toLowerCase()));
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
    _diagnostics: { 
      model, 
      search_results, 
      usage,
      domains_used: search_domain_filter,
      document_type: documentType 
    },
  });
}