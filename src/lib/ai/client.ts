export type SuggestArgs = {
  intent: "draft" | "rewrite" | "intro";
  section: string;
  inputs?: any;
  style?: { tone?: string; readingLevel?: string; region?: string; temperature?: number };
  constraints?: { maxWords?: number; mustInclude?: string[] };
};

// Optional: point localhost UI to prod API
const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function aiSuggest(args: SuggestArgs) {
  const r = await fetch(`${API_BASE}/api/ai/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // { text, model, tokens, promptHash }
}

export async function aiExtractBusinessCase(content: string) {
  const r = await fetch(`${API_BASE}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docType: "businessCase", content, targets: ["purposeSummary","keyBenefits","drivers","alignment"] }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
