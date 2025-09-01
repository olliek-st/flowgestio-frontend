// src/services/citationManager.js
// Safe, minimal citation manager (ES module)
// - In-memory store with de-duplication
// - Section-aware (sectionId optional)
// - Formatting adapters (APA7/PMI/IEEE)
// - verifyAll(): optimistic pass-by-default (replace later with real checks)

const _store = new Map();          // id -> citation
const _dedupe = new Map();         // dedupeKey -> id

/* ---------- utils ---------- */
function makeId() {
  return (globalThis.crypto?.randomUUID?.() || `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`);
}
function asString(v, fallback = "") {
  return (v === null || v === undefined) ? fallback : String(v);
}
function normPublished(p) {
  if (!p) return "";
  const d = new Date(p);
  return isNaN(d.getTime()) ? asString(p) : d.toISOString();
}
function sourceDomain(src, url) {
  if (typeof src === "string" && src.trim()) return src.trim();
  try { return url ? new URL(url).hostname : "Unknown"; } catch { return "Unknown"; }
}
function dedupeKey(f) {
  const url = asString(f.url).trim().toLowerCase();
  const claim = asString(f.claim).trim().toLowerCase();
  return `${url}::${claim}`;
}

/* ---------- normalize input into our internal shape ---------- */
function normalize(input = {}, sectionId = null) {
  const url = asString(input.url);
  const claim = asString(input.claim);
  const snippet = asString(input.snippet);
  const published = normPublished(input.published);
  const confidence = typeof input.confidence === "number" ? input.confidence : 0.5;

  // allow input.source as string or {domain:""}
  let source = input.source;
  if (typeof source !== "string") {
    source = input?.source?.domain || "";
  }
  source = sourceDomain(source, url);

  return { sectionId, claim, url, snippet, source, published, confidence };
}

/* ---------- formatting ---------- */
export function formatCitation(c, style = "APA7") {
  const year = c.published ? new Date(c.published).getFullYear() : "n.d.";
  const fullDate = c.published || "n.d.";
  const title = c.claim || "Untitled";
  const url = c.url || "";
  const src = c.source || "Source";

  switch (style) {
    case "PMI":
      return `${src}. (${fullDate}). ${title}. ${url}`;
    case "IEEE":
      return `${src}, "${title}," ${year}. [Online]. Available: ${url}`;
    case "APA7":
    default:
      return `${src} (${year}). ${title}. ${url}`;
  }
}

/* ---------- core API ---------- */
export function addCitation(sectionId, fact) {
  if (!fact || !fact.url) return null;
  const norm = normalize(fact, sectionId);
  const key = dedupeKey(norm);

  // De-dup on (url + claim)
  const existingId = _dedupe.get(key);
  if (existingId) {
    // If sectionId provided, ensure it sticks (first-wins unless we explicitly reassign)
    const existing = _store.get(existingId);
    if (existing && sectionId && !existing.sectionId) {
      existing.sectionId = sectionId;
      _store.set(existingId, existing);
    }
    return existingId;
  }

  const id = makeId();
  _store.set(id, { id, ...norm });
  _dedupe.set(key, id);
  return id;
}

// legacy alias; keep for backward compatibility
export function addFact(fact, sectionId = null) {
  return addCitation(sectionId, fact);
}

export function removeCitation(id) {
  if (!_store.has(id)) return;
  const c = _store.get(id);
  _store.delete(id);
  _dedupe.delete(dedupeKey(c));
}

export function updateCitation(id, patch = {}) {
  const cur = _store.get(id);
  if (!cur) return false;
  const next = { ...cur, ...patch };
  _store.set(id, next);
  return true;
}

export function attachToSection(id, sectionId) {
  return updateCitation(id, { sectionId });
}

export function list() {
  return Array.from(_store.values());
}

export function getCitations() {
  return list();
}

export function clear() {
  _store.clear();
  _dedupe.clear();
}

export function count() {
  return _store.size;
}

/* ---------- style helpers ---------- */
export function format(style = "APA7") {
  return list().map((c) => formatCitation(c, style));
}
export function formatAllAPA() {
  return format("APA7");
}

/* ---------- verification (safe no-op; replace later) ---------- */
export async function verifyAll() {
  // Default: optimistic pass. Replace with real HEAD/GET checks or server-side verifier later.
  return list().map((c) => ({ id: c.id, verified: true }));
}

/* ---------- grouping helper for UIs ---------- */
export function groupBySection() {
  const map = new Map(); // sectionId -> array
  list().forEach((c) => {
    const k = c.sectionId || "__unknown__";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(c);
  });
  return map;
}

/* ---------- exported manager object (for consumers expecting an object) ---------- */
export const citationManager = {
  addCitation,
  addFact,            // alias
  removeCitation,
  updateCitation,
  attachToSection,
  list,
  getCitations,
  clear,
  count,
  format,
  formatAllAPA,
  verifyAll,
  groupBySection,
};

export default citationManager;
