// Config-only rule evaluator for Bundle v1 rules (when/require)
// - does NOT replace ruleEngine.js
// - returns UI-compatible issues: { severity, sectionId, appliesTo:{fieldKey}, ruleId, message, ... }

function safeLower(s) {
  return String(s ?? "").toLowerCase();
}

function isNonEmpty(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return true;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}

function flattenText(value) {
  if (!isNonEmpty(value)) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) return value.map(flattenText).join(" ");

  if (typeof value === "object") {
    // Join all primitive-ish leaf values (shallow-ish is enough for v1)
    return Object.values(value).map(flattenText).join(" ");
  }
  return String(value);
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function containsAny({ view, path, terms }) {
  const raw = getByPath(view, path);

  // Heuristic fallback:
  // if path ends with ".text" but not found, try the parent object (section)
  let val = raw;
  if (!isNonEmpty(val) && path.endsWith(".text")) {
    const parentPath = path.replace(/\.text$/, "");
    val = getByPath(view, parentPath);
  }

  const hay = safeLower(flattenText(val));
  if (!hay) return false;

  return (terms || []).some((t) => {
    const needle = safeLower(t);
    return needle && hay.includes(needle);
  });
}

function matchStep1({ view, industry, subsector }) {
  const s1 = view?.meta?.step1 || {};
  const ind = s1?.industry || s1?.sector || "";
  const sub = s1?.subsector || s1?.subSector || "";

  const okIndustry = !industry?.length || industry.includes(ind);
  const okSub = !subsector?.length || subsector.includes(sub);

  return okIndustry && okSub;
}

function evalCondition(view, cond) {
  if (!cond || typeof cond !== "object") return false;

  // step1: { industry:[], subsector:[] }
  if (cond.step1) {
    return matchStep1({
      view,
      industry: cond.step1.industry,
      subsector: cond.step1.subsector,
    });
  }

  // containsAny: { path, terms }
  if (cond.containsAny) {
    return containsAny({
      view,
      path: cond.containsAny.path,
      terms: cond.containsAny.terms,
    });
  }

  return false;
}

function evalGroup(view, group) {
  if (!group) return true;

  if (group.any && Array.isArray(group.any)) {
    return group.any.some((c) => evalCondition(view, c));
  }

  if (group.all && Array.isArray(group.all)) {
    return group.all.every((c) => evalCondition(view, c));
  }

  // If group looks like a single condition object
  return evalCondition(view, group);
}

function evalRequire(view, require) {
  if (!require) return true;

  if (require.any && Array.isArray(require.any)) {
    // “any” means at least one passes
    return require.any.some((c) => evalCondition(view, c) || evalGroup(view, c));
  }

  if (require.all && Array.isArray(require.all)) {
    // “all” means all pass
    return require.all.every((c) => evalCondition(view, c) || evalGroup(view, c));
  }

  // fallback
  return true;
}

/**
 * Build activeDomains from presets
 */
function resolveActiveDomains({ config, view }) {
  const step1 = view?.meta?.step1 || {};
  const industry = step1?.industry || step1?.sector || "";
  const subsector = step1?.subsector || step1?.subSector || "";

  const preset = (config?.industryPresets || []).find(
    (p) => p.industry === industry && p.subsector === subsector
  );

  return preset?.activeDomains || [];
}

/**
 * Validate config-only rules
 * @param {Object} view - { meta:{step1}, sections:{...} } (recommended)
 * @param {Object} opts - { config, docType }
 */
export function validateConfigOnlyRules(view, { config, docType }) {
  const rules = config?.rulesByDocType?.[docType] || [];
  const activeDomains = resolveActiveDomains({ config, view });

  // If Step1 not chosen yet → no regulatory rules (noise control)
  if (!activeDomains.length) return [];

  const out = [];

  for (const r of rules) {
    if (!r) continue;

    // Domain gating
    if (r.domain && !activeDomains.includes(r.domain)) continue;

    // WHEN
    const whenOk = evalGroup(view, r.when);
    if (!whenOk) continue;

    // REQUIRE
    const reqOk = evalRequire(view, r.require);
    if (reqOk) continue;

    const sectionId = r.sectionId || null;

    out.push({
      severity: r.severity || "WARN",
      sectionId,
      appliesTo: { fieldKey: "" }, // v1 rules mostly section-level; you can extend later
      ruleId: r.id,
      name: r.id,
      message: r?.message?.body || r?.message?.title || "Regulatory validation failed",
      detailedMessage: r?.message?.body || r?.message?.title || "Regulatory validation failed",
      remedyLabel: "Review and fix",
      source: "Config-Only",
      domain: r.domain || "OTHER",
      targetSectionId: sectionId,
      targetFieldKey: "",
      sourceRefs: r.sourceRefs || [],
    });
  }

  return out;
}
