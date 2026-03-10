// src/components/wizard/SectionCard.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import FieldRenderer from "./FieldRenderer";

// ✅ New: the ONLY source for PMI Lens UI (TBS → PMBOK7 mapping + explanations)
import { PMI_TBS_MAPPING_V2 } from "../../data/PMI_TBS_MAPPING_V2";
import OptionsDataEntry from "./OptionsDataEntry"; // ajuste le chemin si besoin
import AlternativesManager from "../alternatives/AlternativesManager";
import ScreeningGateTable from "../bc01/s2_3/ScreeningGateTable";
import { parseCriteriaFromS2_1 } from "../../engine/bc01/s2_1/s2_1Utils";
import ScreeningGateCriteriaTable from "../bc01/s2_1/ScreeningGateCriteriaTable";
import S2_1Section from "../bc01/s2_1/S2_1Section";

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function safeStr(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function getTbsKey(section) {
  // We prioritize the true TBS ref (e.g., "5.0", "1.4.2", "Executive Summary")
  // Then fallback to section.id
  const ref = safeStr(section?.ref).trim();
  if (ref) return ref;
  return safeStr(section?.id).trim();
}

function getLensForSection(section) {
  const key = getTbsKey(section);

  // PMI_TBS_MAPPING_V2 can be either:
  // A) { byRef: { "5.0": {...} }, byId: { "S5": {...} } }
  // or B) flat: { "5.0": {...}, "S5": {...} }
  if (!PMI_TBS_MAPPING_V2) return null;

  if (PMI_TBS_MAPPING_V2.byRef?.[key]) return PMI_TBS_MAPPING_V2.byRef[key];
  if (PMI_TBS_MAPPING_V2.byId?.[key]) return PMI_TBS_MAPPING_V2.byId[key];

  if (PMI_TBS_MAPPING_V2[key]) return PMI_TBS_MAPPING_V2[key];

  // Some schemas use titles as "ref" accidentally; try also section.title as a last resort
  const titleKey = safeStr(section?.title).trim();
  if (titleKey && PMI_TBS_MAPPING_V2.byRef?.[titleKey]) return PMI_TBS_MAPPING_V2.byRef[titleKey];
  if (titleKey && PMI_TBS_MAPPING_V2[titleKey]) return PMI_TBS_MAPPING_V2[titleKey];

  return null;
}

function buildPrincipleLabel(p) {
  // Expected shape:
  // { number: 1, name: "Focus on Value", statement: "maximize value for stakeholders." }
  if (!p) return "";
  const n = p.number != null ? `Principle ${p.number}` : "Principle";
  const name = p.name ? ` — ${p.name}` : "";
  return `${n}${name}`.trim();
}

function buildDomainLabel(d) {
  // Expected shape:
  // { number: 8, name: "Delivery & Performance", statement: "drive delivery and overall performance." }
  if (!d) return "";
  const n = d.number != null ? `Domain ${d.number}` : "Domain";
  const name = d.name ? ` — ${d.name}` : "";
  return `${n}${name}`.trim();
}


function deriveShortLabelFromStatement(statement = "") {
  // Keep it strictly derived from the mapping statement (no invention)
  return safeStr(statement).trim();
}

function buildLensModalTitle(kind, number, name) {
  const type =
    kind === "principle"
      ? "Project Management Principle"
      : "Project Management Domain of Performance";

  const n = number != null ? ` ${number}` : "";
  const tail = name ? `: ${name}` : "";
  return `PMBOK® 7 – ${type}${n}${tail}`;
}


function buildMappedLine(section, lens) {
  const left = `${safeStr(section?.title)} |`.trim();

  const p = lens?.principle
    ? `${buildPrincipleLabel(lens.principle)}: ${safeStr(lens.principle.statement)}`
    : null;

  const d = lens?.domain
    ? `${buildDomainLabel(lens.domain)}: ${safeStr(lens.domain.statement)}`
    : null;

  const parts = [left, p, d].filter(Boolean);
  return parts.join(" | ");
}

function fmtNum(n, digits = 2) {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtMoney(n) {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtPct(n) {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(1)}%`;
}

function hasBlockFlag(flags = []) {
  return Array.isArray(flags) && flags.some((f) => String(f).startsWith("BLOCK") || String(f).includes("BLOCK"));
}

function hasWarnFlag(flags = []) {
  return Array.isArray(flags) && flags.some((f) => String(f).startsWith("WARN") || String(f).includes("WARN"));
}

// -------------------------------------------------------
// Minimal Modal (local) — replaces the old PMIReferenceModal behavior
// -------------------------------------------------------
function SimpleModal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[min(720px,92vw)] rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <div className="text-base font-bold text-gray-900 leading-snug">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-xs font-medium text-gray-500">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 hover:bg-gray-100 text-gray-600"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------
export default function SectionCard({
  section,
  data,
  onChange,
  allSections,
  validationResults,
  onAIDraft,
  draftBuffer,
  onApplyDraft,
  engineOutput, // ⭐ NEW
  step1, // ✅ Step 1 context (normalized inputs)
  formData, // ✅ full snapshot if needed
  onPrefill, // ✅ New for AI integration
  isPrefilling, // ✅ New for AI integration
  issueSeverity = "OK",  // "OK" | "WARN" | "BLOCK"
  fieldSeverityMap = {}, // { "sectionId::fieldKey": "OK"|"WARN"|"BLOCK" }
}) {
	
 console.log("SectionCard rendering:", section.id, section.ref, section.title);

  const { id, title, ref, hasContent, description } = section || {};
  
  // ✅ HARD OVERRIDE: Section 2.2 should be a multi-option manager (not a container)
  // This MUST be before any early returns or container logic
  if (id === "S2_2_LIST_OPTIONS") {
    const s22SeverityExtra =
      issueSeverity === "BLOCK" ? "border-l-4 border-l-red-500 bg-red-50/40" :
      issueSeverity === "WARN"  ? "border-l-4 border-l-amber-400 bg-amber-50/40" : "";
    return (
      <div id={id} className={`rounded-xl bg-white border border-blue-200 shadow-sm overflow-hidden ${s22SeverityExtra}`}>
        <div className="px-5 py-4 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-gray-600">
                {ref || "2.2"}
              </div>
              <div className="text-base font-bold text-gray-900">
                {title || "List the Possible Options"}
              </div>
            </div>
          </div>
          {description && (
            <div className="mt-2 text-sm text-gray-600">
              {description}
            </div>
          )}
        </div>
        <div className="px-5 py-4">
          <AlternativesManager
            value={data?.alternatives || []}
            onChange={(nextOptions) => {
              const updated = { ...(data || {}), alternatives: nextOptions };
              onChange(updated);
            }}
            s2_1Data={formData?.S2_1_EVAL_CRITERIA ?? {}}
            onResearchOptions={async () => {
              try {
                // Call backend Perplexity research endpoint
                const response = await fetch('/api/llm/research-options', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ step1: step1 || {} })
                });

                if (!response.ok) {
                  throw new Error('Research request failed');
                }

                // IMPORTANT:
                // AlternativesManager expects this function to RETURN { options: [...] }.
                // It will do canonical normalization + merge preserving accepted options.
                const result = await response.json();
                return result;

              } catch (error) {
                console.error('Research failed:', error);
                throw error;
              }
            }}
            onBenchmarkOption={async (option) => {
              // POST to benchmark-costs with a single-option array.
              // Returns the matching result object or null if nothing was found.
              const benchResponse = await fetch('/api/llm/benchmark-costs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  step1: step1 || {},
                  options: [{
                    id:          option.id,
                    name:        option.name,
                    type:        option.type,
                    description: option.description,
                  }],
                }),
              });
              if (!benchResponse.ok) {
                throw new Error(`Benchmark request failed: ${benchResponse.status}`);
              }
              const benchData = await benchResponse.json();
              const results   = Array.isArray(benchData?.results) ? benchData.results : [];
              // Prefer the result that matches our option id; fall back to first result.
              return results.find((r) => r?.id === option.id) ?? results[0] ?? null;
            }}
          />
        </div>
      </div>
    );
  }
  
  const calculatedBlock = useMemo(() => {
  if (!engineOutput) return null;

  switch (id) {
    case "S3_2_COSTS":
      return engineOutput.financialsByOption;

    case "S3_3_CBA":
      return engineOutput.financialKPIs;

    case "S3_6_BENCHMARK":
      return engineOutput.benchmarkScores;

    case "S3_8_PROS_CONS":
      return engineOutput.comparativeTable;

    default:
      return null;
  }
}, [engineOutput, id]);


  // ✅ Persistent applied flag (no timeout)
  const [applied, setApplied] = useState(false);

  const children = allSections?.filter((s) => s.parentId === id) || [];
  const isContainer = !hasContent;
  
    const calcModel = useMemo(() => {
    if (!engineOutput?.scoredOptions?.length) return null;

    // Base rows = one per option
    const rows = engineOutput.scoredOptions.map((s) => ({
      optionId: s.optionId,
      name: s.name,
      tco: s.financial?.tco,
      npv: s.financial?.npv,
      roi: s.financial?.roi,
      paybackYears: s.financial?.paybackYears,
      financialScore1to5: s.financialScore1to5,
      strategicScore1to5: s.strategicScore1to5,
      feasibilityScore1to5: s.feasibilityScore1to5,
      finalScore0to100: s.finalScore0to100,
      rank: s.rank,
      flags: (s.flags || []).map((f) => `${f.level}:${f.code}`),
    }));

    // Decide what table to show per section
    switch (id) {
      case "S3_2_COSTS":
        return {
          title: "Costs & TCO (Calculated)",
          columns: [
            { key: "name", label: "Option" },
            { key: "tco", label: "TCO (PV)", format: "money" },
            { key: "paybackYears", label: "Payback (yrs)", format: "num" },
            { key: "financialScore1to5", label: "Fin Score (1–5)", format: "num" },
          ],
          rows,
        };

      case "S3_3_CBA":
        return {
          title: "Financial Analysis (Calculated)",
          columns: [
            { key: "name", label: "Option" },
            { key: "npv", label: "NPV", format: "money" },
            { key: "roi", label: "ROI", format: "pct" },
            { key: "paybackYears", label: "Payback (yrs)", format: "num" },
            { key: "financialScore1to5", label: "Fin Score (1–5)", format: "num" },
          ],
          rows,
        };

      case "S3_6_BENCHMARK":
        // Until you add explicit benchmarking outputs, show what exists (scores + flags)
        return {
          title: "Benchmark Signals (Derived)",
          columns: [
            { key: "name", label: "Option" },
            { key: "financialScore1to5", label: "Fin (1–5)", format: "num" },
            { key: "strategicScore1to5", label: "Strat (1–5)", format: "num" },
            { key: "feasibilityScore1to5", label: "Feas (1–5)", format: "num" },
            { key: "flags", label: "Flags", format: "flags" },
          ],
          rows,
        };

      case "S3_8_PROS_CONS":
        return {
          title: "Comparative Summary (Calculated)",
          columns: [
            { key: "rank", label: "Rank", format: "rank" },
            { key: "name", label: "Option" },
            { key: "financialScore1to5", label: "Fin (1–5)", format: "num" },
            { key: "strategicScore1to5", label: "Strat (1–5)", format: "num" },
            { key: "feasibilityScore1to5", label: "Feas (1–5)", format: "num" },
            { key: "finalScore0to100", label: "Final (0–100)", format: "num1" },
            { key: "flags", label: "Flags", format: "flags" },
          ],
          rows,
        };

      default:
        return null;
    }
  }, [engineOutput, id]);

  // ── Screening gate: stable prop references ──────────────────────────────────
  // ROOT-CAUSE FIX for the "Maximum update depth exceeded" infinite render loop.
  //
  // Without memoization:
  //   • parseCriteriaFromS2_1() returns a NEW array on every call.
  //   • `formData?.S2_1_EVAL_CRITERIA ?? {}` creates a NEW {} every render when
  //     S2.1 is unset.
  //   • `formData?.S2_2_LIST_OPTIONS?.alternatives ?? []` creates a NEW [] every
  //     render when S2.2 is unset.
  //
  // All three feed useScreeningGate → its INIT useEffect has customCriteria and
  // options in its dep array → fires every render → dispatch(INIT) → new state →
  // onChange effect fires → onChangeRef.current(contract) → Step3Generate updates
  // formData → SectionCard re-renders → new customCriteria → LOOP.
  //
  // Fix: memoize both values so their object identities are stable across renders.
  const screeningCustomCriteria = useMemo(
    () => parseCriteriaFromS2_1(formData?.S2_1_EVAL_CRITERIA ?? {}),
    [formData?.S2_1_EVAL_CRITERIA] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const screeningAlternatives = useMemo(
    () => formData?.S2_2_LIST_OPTIONS?.alternatives ?? [],
    [formData?.S2_2_LIST_OPTIONS?.alternatives] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Level 5: evidence keyed by optionId for reactive screening computation.
  // Derived from the already-memoized screeningAlternatives to avoid identity churn.
  const evidenceByOptionId = useMemo(() => {
    const map = {};
    for (const a of screeningAlternatives) {
      if (a?.id && a?.evidenceByCriterionId && typeof a.evidenceByCriterionId === "object") {
        map[String(a.id)] = a.evidenceByCriterionId;
      }
    }
    return map;
  }, [screeningAlternatives]);
  // ────────────────────────────────────────────────────────────────────────────

  const depth = useMemo(() => {
    if (!ref) return 1;
    if (String(ref).toLowerCase().startsWith("phase")) return 1;
    return String(ref).split(".").length;
  }, [ref]);

  const cardTone = useMemo(() => {
    if (depth <= 1) return { wrap: "bg-slate-50 border-slate-200", inner: "bg-white" };
    if (depth === 2) return { wrap: "bg-blue-50 border-blue-200", inner: "bg-white" };
    if (depth === 3) return { wrap: "bg-sky-50 border-sky-200", inner: "bg-white" };
    return { wrap: "bg-white border-gray-200", inner: "bg-white" };
  }, [depth]);

  const headerSize = useMemo(() => {
    if (depth <= 1) return "text-lg";
    if (depth === 2) return "text-base";
    if (depth === 3) return "text-sm";
    return "text-sm";
  }, [depth]);

  // Sections whose formData value is a typed structured blob (not a flat Record<string,string>).
  // FieldRenderer writes only keys declared in section.fields (e.g. "screeningNarrative").
  // A plain spread is still safe here because data IS the blob itself, and we never
  // shadow required structural keys via FieldRenderer.
  // Adding this Set makes the intent explicit and documents the contract for future sections.
  // ── PATCH A: soft migration narrative→optionsJson ──────────────────────────
  // For saves created before the schema fix: if a section has an "optionsJson"
  // field but only has data.narrative, promote once at mount to align keys.
  // Safe: runs only once, onChange is stable (parent memoizes it).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const hasJsonEditorField = section?.fields?.some((f) => f?.key === "optionsJson");
    if (hasJsonEditorField && !data?.optionsJson && data?.narrative) {
      onChange({ ...(data || {}), optionsJson: data.narrative });
    }
  }, []); // intentionally mount-only

  // ── PATCH D: Prerequisites gate ──────────────────────────────────────────
  // Evaluates section.prerequisites against the full formData snapshot.
  // Returns null (all satisfied) or the first failing prerequisite object.
  //
  // Prerequisite shape (from BC01_SCHEMA.v2):
  //   { sectionId, fieldKey?, equals?, mustBeTruthy?, message? }
  //
  // equals comparison: boolean === boolean (not "true" string).
  // formData[sectionId] holds the section's data blob.
  const failedPrerequisite = useMemo(() => {
    const prereqs = section?.prerequisites;
    if (!Array.isArray(prereqs) || !prereqs.length) return null;
    if (!formData) return null; // formData not provided → skip gate

    for (const prereq of prereqs) {
      const { sectionId: prereqSectionId, fieldKey: prereqFieldKey, equals, mustBeTruthy, message } = prereq || {};
      const sectionData = formData?.[prereqSectionId];

      if (prereqFieldKey) {
        // Check a specific field value
        const fieldVal = sectionData?.[prereqFieldKey];

        if (equals !== undefined) {
          // Boolean-aware equality: coerce both sides to boolean if either is boolean
          const expectedBool = typeof equals === "boolean";
          const actual = expectedBool
            ? (fieldVal === true || fieldVal === "true") // toggle can be stored as bool or string
            : fieldVal;
          const expected = equals;
          if (actual !== expected) return { ...prereq, _failedOn: "equals" };
        }

        if (mustBeTruthy) {
          if (!fieldVal) return { ...prereq, _failedOn: "mustBeTruthy" };
        }
      } else {
        // Section-level check: section must have some data
        if (mustBeTruthy && (!sectionData || Object.keys(sectionData).length === 0)) {
          return { ...prereq, _failedOn: "mustBeTruthy" };
        }
      }
    }
    return null; // all satisfied
  }, [section?.prerequisites, formData]);

  const STRUCTURED_BLOB_SECTIONS = new Set(["S2_3_SCREENING"]);

  const handleFieldChange = (fieldKey, value) => {
    if (fieldKey === "narrative") setApplied(false);
    if (STRUCTURED_BLOB_SECTIONS.has(id)) {
      // Deep-merge into structured blob: preserve decisions, viableOptionIds, etc.
      onChange({ ...(data || {}), [fieldKey]: value });
    } else {
      onChange({ ...(data || {}), [fieldKey]: value });
    }
  };

  // -------------------------------------------------------

// -------------------------------------------------------
// Draft staging
// Step3Generate passes the section-specific slice:
//   draftBuffer[section.id] → { [fieldKey]: { text, createdAt } }
// SectionCard receives that slice directly as the `draftBuffer` prop.
// -------------------------------------------------------
const draftEntry = useMemo(() => {
  if (!draftBuffer || typeof draftBuffer !== "object") return null;

  // draftBuffer is already the section-specific slice:
  //   { [fieldKey]: { text: string, createdAt: number } }
  // Find the first entry with a non-empty text string.
  const entries = Object.entries(draftBuffer);
  for (const [fk, val] of entries) {
    if (val && typeof val === "object" && typeof val.text === "string" && val.text.trim()) {
      return { fieldKey: fk, ...val };
    }
  }

  return null;
}, [draftBuffer]);

const [editedDraft, setEditedDraft] = useState("");
const [toast, setToast] = useState(null);

// Seed local editor only once when draft arrives (don't overwrite user edits)
useEffect(() => {
  const incoming = draftEntry?.text;
  if (typeof incoming === "string" && incoming.trim()) {
    setEditedDraft((prev) => (prev ? prev : incoming));
  }
}, [draftEntry?.text]);

const handleApplyDraft = useCallback(() => {
  const txt = typeof editedDraft === "string" ? editedDraft.trim() : "";
  if (!txt) {
    setToast({ type: "warn", msg: "Nothing to apply." });
    return;
  }

  // ✅ Use the fieldKey from the draft entry (e.g. "screeningNarrative", "methodologyNarrative")
  // rather than hardcoding "narrative". Fallback to "narrative" for legacy draft shapes.
  const targetFieldKey = draftEntry?.fieldKey || "narrative";
  const res = onApplyDraft?.(id, targetFieldKey, txt);

  if (res?.success) {
    setApplied(true);
    setEditedDraft(""); // clear so the next AI draft for this field seeds fresh
    setToast(null);
    return;
  }

  if (res?.reason === "blocked") {
    setToast({ type: "error", msg: "Blocked — please fix issues first." });
    return;
  }

  setToast({ type: "warn", msg: "Nothing to apply." });
}, [editedDraft, id, onApplyDraft, setApplied]);

// ✅ New PMI Lens behavior (TBS mapping) (TBS mapping)
  const lens = useMemo(() => getLensForSection(section), [section]);

  // Normalize lens items so UI supports BOTH legacy format:
  //  - lens.principle / lens.domain (single item)
  // and v2 format:
  //  - lens.principlesDetailed[] / lens.domainsDetailed[] (multiple pills)
  const deriveNameFromText = (text = "") => {
    const m = safeStr(text).match(/^[A-Z]\d+\s+–\s+([^:]+)\s*:/);
    return m?.[1]?.trim() || "";
  };

  const deriveStatementFromText = (text = "") => {
    const m = safeStr(text).match(/:\s*(.+)$/);
    return m?.[1]?.trim() || "";
  };

  const toLensItem = (raw, kind) => {
    if (!raw) return null;
    const code = raw.code || `${kind === "principle" ? "P" : "D"}${raw.number ?? ""}`;
    const number = raw.number ?? parseInt(String(code).replace(/^[A-Z]/i, ""), 10);
    const name = raw.name || raw.shortLabel || deriveNameFromText(raw.text) || "";
    const statement = raw.statement || raw.hint || deriveStatementFromText(raw.text) || "";
    const text = raw.text || (name && statement ? `${code} – ${name}: ${statement}` : raw.statement || "");
    const hint = raw.hint || statement; // hint preferred later; fallback = statement (no invention)
    const shortLabel = raw.shortLabel || name;

    return { kind, code, number, name, statement, text, hint, shortLabel };
  };

  const principles = useMemo(() => {
    const arr = Array.isArray(lens?.principlesDetailed) ? lens.principlesDetailed : [];
    const detailed = arr.map((x) => toLensItem(x, "principle")).filter(Boolean);
    const legacy = lens?.principle ? [toLensItem(lens.principle, "principle")].filter(Boolean) : [];
    return detailed.length ? detailed : legacy;
  }, [lens]);

  const domains = useMemo(() => {
    const arr = Array.isArray(lens?.domainsDetailed) ? lens.domainsDetailed : [];
    const detailed = arr.map((x) => toLensItem(x, "domain")).filter(Boolean);
    const legacy = lens?.domain ? [toLensItem(lens.domain, "domain")].filter(Boolean) : [];
    return detailed.length ? detailed : legacy;
  }, [lens]);

  const hasLensUI = Boolean(
    (lens?.principlesDetailed && lens.principlesDetailed.length) ||
    (lens?.domainsDetailed && lens.domainsDetailed.length) ||
    lens?.principle ||
    lens?.domain ||
    lens?.explanationEn
  );

  const [modal, setModal] = useState(null);
  // modal shape: { kind: "lens" | "explanation", title: string, body: string }

  const openLensModal = useCallback(() => {
    if (!lens) return;

    const p = principles?.[0];
    const d = domains?.[0];
    const lines = [];
    if (p) lines.push(`${p.code}${p.shortLabel ? ` · ${p.shortLabel}` : ""}: ${safeStr(p.statement)}`);
    if (d) lines.push(`${d.code}${d.shortLabel ? ` · ${d.shortLabel}` : ""}: ${safeStr(d.statement)}`);

    setModal({
      kind: "lens",
      title: "PMI Lens (PMBOK® Guide 7th Edition)",
      body: lines.join("\n") || "No PMI Lens mapping found for this section yet.",
    });
  }, [lens, principles, domains]);

  const openExplanationModal = useCallback(() => {
    const explanation = safeStr(lens?.explanationEn).trim();
    setModal({
      kind: "explanation",
      title: "Explanation",
      body: explanation || "No English explanation found for this section yet.",
    });
  }, [lens]);

  const openLensItemModal = useCallback((item) => {
  if (!item) return;
  setModal({
    kind: "lens",
    title: buildLensModalTitle(item.kind, item.number, item.name),
    hint: safeStr(item.hint).trim(),
    body: safeStr(item.text || item.statement).trim(),
  });
}, []);


  // ── Section-level severity highlight ─────────────────────────────────────
  // Overrides cardTone background when an issue exists; left-bar is 4px colored.
  const wrapClass =
    issueSeverity === "BLOCK"
      ? "border rounded-xl border-gray-200 border-l-4 border-l-red-500 bg-red-50/40 shadow-sm"
      : issueSeverity === "WARN"
      ? "border rounded-xl border-gray-200 border-l-4 border-l-amber-400 bg-amber-50/40 shadow-sm"
      : `border rounded-xl ${cardTone.wrap} shadow-sm`;

  return (
    <div id={id} className={wrapClass}>
      <div className={`rounded-xl ${cardTone.inner}`}>
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {/* ✅ Put number beside title (not on a separate line) */}
              <h3 className={`${headerSize} font-bold text-gray-900 leading-snug`}>
                {ref ? <span className="mr-2 text-gray-500 font-semibold">{ref}</span> : null}
                {title}
                {applied && !isContainer && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Applied ✓
                  </span>
                )}
              </h3>

              {description && (
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
              )}
            </div>
          </div>

          {/* ✅ PMI Lens (NEW UI) */}
          {hasLensUI && (
            <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                  PMI Lens
                </div>
                
                {!!lens?.explanationEn && (
                  <button
                    type="button"
                    onClick={openExplanationModal}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-50"
                  >
                    Explanation
                  </button>
                )}
              </div>

              {(principles.length > 0 || domains.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {principles.map((p) => (
                    <button
                      key={`P-${p.code}-${p.text}`}
                      type="button"
                      onClick={() => openLensItemModal(p)}
                      className="px-2 py-1 text-xs font-semibold rounded-full border bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                      title={p.text}
                    >
                      {p.shortLabel ? `${p.code} · ${p.shortLabel}` : p.code}
                    </button>
                  ))}

                  {domains.map((d) => (
                    <button
                      key={`D-${d.code}-${d.text}`}
                      type="button"
                      onClick={() => openLensItemModal(d)}
                      className="px-2 py-1 text-xs font-semibold rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      title={d.text}
                    >
                      {d.shortLabel ? `${d.code} · ${d.shortLabel}` : d.code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        {!isContainer && (
          <div className="px-5 py-4">
            <div className="space-y-3">
  {calcModel && (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-900">
        {calcModel.title}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-xs">
          <thead>
            <tr className="text-emerald-900/90">
              {calcModel.columns.map((c) => (
                <th key={c.key} className="text-left font-semibold py-2 px-2 border-b border-emerald-200">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calcModel.rows.map((r) => {
              const blocked = hasBlockFlag(r.flags);
              const warned = hasWarnFlag(r.flags);

              return (
                <tr
                  key={r.optionId}
                  className={`border-b border-emerald-100 ${
                    blocked ? "bg-red-50/40" : warned ? "bg-amber-50/40" : "bg-white/60"
                  }`}
                >
                  {calcModel.columns.map((c) => {
                    const v = r[c.key];

                    let cell = "—";
                    if (c.format === "money") cell = fmtMoney(v);
                    else if (c.format === "pct") cell = v == null ? "—" : fmtPct(v);
                    else if (c.format === "num") cell = fmtNum(v, 2);
                    else if (c.format === "num1") cell = fmtNum(v, 1);
                    else if (c.format === "rank")
                      cell = (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 font-bold">
                          #{v}
                        </span>
                      );
                    else if (c.format === "flags")
                      cell = Array.isArray(v) && v.length ? v.join(", ") : "—";
                    else cell = v == null ? "—" : String(v);

                    return (
                      <td key={c.key} className="py-2 px-2 align-top">
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[11px] text-emerald-900/70">
        Computed by scoreEngineV3. AI must explain only; it cannot change scores or invent numbers.
      </div>
    </div>
  )}

	  {/* ─── Schema-driven field rendering ──────────────────────────────────────
	       S2_2_LIST_OPTIONS → handled by early return above (single authority).
	       uiType "json_editor" → OptionsDataEntry  (schema-driven, not sectionId)
	       Everything else    → FieldRenderer
	       ──────────────────────────────────────────────────────────────────── */}

	  {/* ── Prerequisites gate banner ── */}
	  {failedPrerequisite && (
	    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
	      <span className="mt-0.5 text-amber-500 shrink-0" aria-hidden="true">⚠</span>
	      <div>
	        <div className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-0.5">
	          Prerequisite not met
	        </div>
	        <div className="text-sm text-amber-800">
	          {failedPrerequisite.message || "Complete the required section before editing this one."}
	        </div>
	      </div>
	    </div>
	  )}

	  {/* Fields — disabled overlay when prerequisite not met */}
	  <div className={failedPrerequisite ? "pointer-events-none opacity-40 select-none" : undefined}>
	    {(() => {
	      // ── S2_1_EVAL_CRITERIA: dedicated section component (Level 5 redesign) ─────
	      // Renders S2_1Section: 7 collapsible sub-sections with completion tracker.
	      // All field keys preserved (no schema breakage).
	      // S3 engine untouched. Gate engine untouched.
	      if (id === "S2_1_EVAL_CRITERIA") {
	        return (
	          <S2_1Section
	            data={data || {}}
	            onChange={(updated) => onChange(updated)}
	            onAIDraft={(payloadOrKey, maybeField) => {
	              if (typeof payloadOrKey === "object") return onAIDraft(payloadOrKey);
	              return onAIDraft({ fieldKey: payloadOrKey, field: maybeField });
	            }}
	          />
	        );
	      }

	      // ── screening_gate: schema-driven renderer for S2_3_SCREENING ──────────
	      const screeningGateField = section?.fields?.find((f) => f?.uiType === "screening_gate");
	      if (screeningGateField) {
	        // 5C: use section-local `data` as source of truth (avoids stale formData lag).
	        // formData is used for cross-section reads: S2.2 alternatives + S2.1 criteria.
	        //
	        // STABILITY FIX: pass `undefined` (not `{}`) when section has no saved data.
	        // `data || {}` from Step3Generate creates a new {} every render when the section
	        // is unset. Passing that {} as `existing` to useScreeningGate puts it in the INIT
	        // effect dep array, firing INIT on every render → state change → onChange → loop.
	        // Guard: only pass `data` when it actually contains keys (i.e. has been saved).
	        const existingScreening =
	          data && typeof data === "object" && Object.keys(data).length > 0
	            ? data
	            : undefined;
	        return (
	          <ScreeningGateTable
	            key={screeningGateField.id || screeningGateField.key /* 5B: key fallback */}
	            options={screeningAlternatives}          // ← memoized (was: inline ?? [])
	            value={existingScreening}                // ← undefined when empty (was: {})
	            customCriteria={screeningCustomCriteria} // ← memoized (was: inline parseCriteria call)
	            onChange={(contract) => onChange(contract)}
	            evidenceByOptionId={evidenceByOptionId}
	            onDraftNarrative={
	              onAIDraft
	                ? async () => {
	                    const text = await onAIDraft("screeningNarrative");
	                    return text;
	                  }
	                : undefined
	            }
	          />
	        );
	      }

	      // ── screening_gate_table: S2.1B criteria table editor ──────────────────
	      // Follows the exact same pattern as screening_gate and json_editor.
	      // Sections with this uiType render:
	      //   1. FieldRenderer for all fields above the table field (S2.1A)
	      //   2. ScreeningGateCriteriaTable for the table field itself (S2.1B)
	      //   3. FieldRenderer for all fields below (S3 criteria, hidden fields)
	      const gateTableFieldIdx = (section?.fields || []).findIndex(
	        (f) => f?.uiType === "screening_gate_table"
	      );
	      if (gateTableFieldIdx !== -1) {
	        const gateTableField = (section?.fields || [])[gateTableFieldIdx];
	        const allFields = (section?.fields || []).filter(Boolean);
	        const fieldsAbove = allFields.slice(0, gateTableFieldIdx);
	        const fieldsBelow = allFields.slice(gateTableFieldIdx + 1);
	        const sharedRendererProps = {
	          data,
	          onChange: (fieldKey, fieldValue) => {
	            onChange({ ...(data || {}), [fieldKey]: fieldValue });
	          },
	          sectionId: id,
	          validationResults: validationResults?.[id],
	          onAIDraft: (payloadOrKey, maybeField) => {
	            if (typeof payloadOrKey === "object") return onAIDraft(payloadOrKey);
	            return onAIDraft({ fieldKey: payloadOrKey, field: maybeField });
	          },
	          fieldSeverityMap,
	        };
	        return (
	          <>
	            {fieldsAbove.length > 0 && (
	              <FieldRenderer fields={fieldsAbove} {...sharedRendererProps} />
	            )}
	            <div className={fieldsAbove.length > 0 ? "mt-6 pt-6 border-t border-slate-200" : undefined}>
	              <ScreeningGateCriteriaTable
	                value={data?.[gateTableField.key] ?? ""}
	                methodologyLocked={!!data?.methodologyLocked}
	                lockedAt={data?.methodologyLockedAt}
	                onChangeJson={(nextJson) => {
	                  onChange({ ...(data || {}), [gateTableField.key]: nextJson });
	                }}
	              />
	            </div>
	            {fieldsBelow.length > 0 && (
	              <div className="mt-6">
	                <FieldRenderer fields={fieldsBelow} {...sharedRendererProps} />
	              </div>
	            )}
	          </>
	        );
	      }

	      // ── json_editor: OptionsDataEntry ─────────────────────────────────────
	      const jsonEditorField = section?.fields?.find((f) => f?.uiType === "json_editor");
	      if (jsonEditorField) {
	        const editorKey = jsonEditorField.key; // e.g. "optionsJson"
	        return (
	          <OptionsDataEntry
	            value={data?.[editorKey] ?? "[]"}
	            onChange={(jsonStr) => {
	              const updated = { ...(data || {}), [editorKey]: jsonStr };
	              onChange(updated);
	            }}
	            onPrefill={onPrefill}
	            isPrefilling={isPrefilling}
	          />
	        );
	      }

	      // ── default: FieldRenderer ─────────────────────────────────────────────
	      return (
	        <FieldRenderer
	          fields={(section?.fields || []).filter(Boolean)}
	          data={data}
	          onChange={(fieldKey, fieldValue) => {
	            // Safe merge — structured blobs: see STRUCTURED_BLOB_SECTIONS above.
	            const updated = { ...(data || {}), [fieldKey]: fieldValue };
	            onChange(updated);
	          }}
	          sectionId={id}
	          validationResults={validationResults?.[id]}
	          onAIDraft={(payloadOrKey, maybeField) => {
	            if (typeof payloadOrKey === "object") return onAIDraft(payloadOrKey);
	            return onAIDraft({ fieldKey: payloadOrKey, field: maybeField });
	          }}
	          fieldSeverityMap={fieldSeverityMap}
	        />
	      );
	    })()}
	  </div>


              {/* Draft buffer UI */}
              {draftEntry?.text && (
                <div className="mt-3 border border-blue-200 bg-blue-50/60 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                      AI Draft (staging)
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyDraft}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Apply to Preview
                    </button>
                  </div>

                  <textarea
                    className="w-full min-h-[140px] rounded-lg border border-blue-200 bg-white p-3 text-sm text-gray-900"
                    value={editedDraft}
                    onChange={(e) => setEditedDraft(e.target.value)}
                  />

                  {applied && (
                    <div className="mt-3 text-sm rounded-lg px-3 py-2 border bg-emerald-50 border-emerald-200 text-emerald-900">
                      Applied ✓ The document preview has been updated.
                    </div>
                  )}

                  <div className="mt-2 text-xs text-blue-900/70">
                    Apply updates the document preview only when you click “Apply to Preview”.
                  </div>
                </div>
              )}
              {toast && (
                <div
                  className={`mt-3 text-sm rounded-lg px-3 py-2 border ${
                    toast.type === "error"
                      ? "bg-red-50 border-red-200 text-red-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  {toast.msg}
                </div>
              )}
            </div>
          </div>
        )}
 
        {/* Children */}
        {id !== "S2_2_LIST_OPTIONS" && children.length > 0 && (
          <div className="px-4 pb-4">
            <div className="space-y-4">
              {children.map((child) => (
                <SectionCard
				  key={child.id}
				  section={child}
				  data={data?.[child.id] || {}}
				  onChange={(childData) => {
					const next = { ...(data || {}), [child.id]: childData };
					onChange(next);
				  }}
				  allSections={allSections}
				  validationResults={validationResults}
				  onAIDraft={onAIDraft}
				  draftBuffer={draftBuffer}
				  onApplyDraft={onApplyDraft}
				  engineOutput={engineOutput}
				  formData={formData}
				  step1={step1}
				  onPrefill={onPrefill}
				  isPrefilling={isPrefilling}
				/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <SimpleModal
          title={modal.title}
          subtitle={modal.kind === "lens" ? "Mapped statement" : ""}
          onClose={() => setModal(null)}
        >
          {/* ✅ Remove the confusing "Mapped statement" heading in content
              (subtitle is small + optional; we can also remove it entirely) */}
          {modal.hint && (
            <div className="mb-3 text-sm italic text-gray-600">
              {modal.hint}
            </div>
          )}

          <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
            {modal.body}
          </div>
        </SimpleModal>
      )}
    </div>
  );
}