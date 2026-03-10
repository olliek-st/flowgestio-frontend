// src/components/wizard/steps/Step3Generate.jsx
// ✅ Option C
// ✅ DraftBuffer -> Apply gating
// ✅ Render STRICT TBS order using BC01_SECTION_ORDER
// ✅ Disable SectionCard recursive children to prevent duplicates + wrong Apply targets

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BC01_SECTIONS,
  BC01_SECTION_MAP,
  BC01_SECTION_ORDER,
} from "../../../schemas/BC01_SCHEMA.v2";

import { PMI_TBS_MAPPING_V2 } from "../../../data/PMI_TBS_MAPPING_V2";
import SectionCard from "../SectionCard";
import DocumentPreview from "../DocumentPreview"; 
import { getValidationSummary } from "../../../utils/validationUtils";

import { buildStep1Payload } from "../../../utils/buildStep1Payload";
import { validateSnapshot as validateRuleEngineSnapshot } from "../../../utils/ruleEngine";
import { buildEngineInputFromSnapshot, scoreEngineV3 } from "../../../utils/scoring/scoreEngineV3";
import { collectIssues } from "../../../engine/validation/collectIssues";
import IssuesDrawer from "../../validation/IssuesDrawer";

/* ---------------- PMI Lens Helper ---------------- */
function getPmiLensForSection(section) {
  if (!section) return null;

  const safeStr = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const ref = safeStr(section?.ref).trim();
  const key = ref || safeStr(section?.id).trim();

  if (!PMI_TBS_MAPPING_V2) return null;

  if (PMI_TBS_MAPPING_V2.byRef?.[key]) return PMI_TBS_MAPPING_V2.byRef[key];
  if (PMI_TBS_MAPPING_V2.byId?.[key]) return PMI_TBS_MAPPING_V2.byId[key];
  if (PMI_TBS_MAPPING_V2[key]) return PMI_TBS_MAPPING_V2[key];

  const titleKey = safeStr(section?.title).trim();
  if (titleKey && PMI_TBS_MAPPING_V2.byRef?.[titleKey]) return PMI_TBS_MAPPING_V2.byRef[titleKey];
  if (titleKey && PMI_TBS_MAPPING_V2[titleKey]) return PMI_TBS_MAPPING_V2[titleKey];

  return null;
}

/* ---------------- Tooltip UI ---------------- */
/**
 * Map an issue's sectionId to its nav-chip ID.
 * All registry issues emit full BC01_SCHEMA.v2 IDs — exact match always hits.
 * Unrecognised IDs pass through as orphans (should not occur post-migration).
 */
function normalizeSectionIdForNav(issueSectionId, navSectionIds) {
  if (!issueSectionId) return issueSectionId;
  if (navSectionIds.includes(issueSectionId)) return issueSectionId; // exact match
  return issueSectionId;                                              // orphan passthrough
}

// ── Severity helpers (module-level — no React dep) ───────────────────────────
const SEVERITY_RANK = { OK: 0, WARN: 1, BLOCK: 2 };
function maxSeverity(a, b) {
  return (SEVERITY_RANK[b] ?? 0) > (SEVERITY_RANK[a] ?? 0) ? b : a;
}

export default function Step3Generate({
  data,
  onNext,
  onBack,
  builderKind,
  selectedDocId,
  initialFormData,
}) {
  // 🔍 DEBUG — visible dès chaque render
  console.log(
    "[Step3Generate] initialFormData keys =",
    Object.keys(initialFormData || {})
  );
  
  // ✅ State init : priorité à initialFormData si présent
  
  const [formData, setFormData] = useState(() => {
    if (
      initialFormData &&
      typeof initialFormData === "object" &&
      Object.keys(initialFormData).length > 0
    ) {
      console.log("[Step3Generate] useState init from initialFormData");
      return initialFormData;
    }
    return {};
  });

  // ✅ Sync initialFormData → formData (SAFE, jamais destructif)
  useEffect(() => {
    if (
      !initialFormData ||
      typeof initialFormData !== "object" ||
      Object.keys(initialFormData).length === 0
    ) {
      return;
    }

    console.log("[Step3Generate] Applying initialFormData (effect)");

    setFormData((prev) => {
      if (!prev || Object.keys(prev).length === 0) return initialFormData;
      // Additive only: seed absent sections, never overwrite sections already written.
      const next = { ...prev };
      for (const [sid, fields] of Object.entries(initialFormData || {})) {
        if (next[sid] === undefined || next[sid] === null) {
          next[sid] = fields;
        }
      }
      return next;
    });
  }, [initialFormData]);
  
  console.log("[Step3Generate] formData.S1_1_BUSINESS_NEED:", formData.S1_1_BUSINESS_NEED);
  console.log("[Step3Generate] formData.S1_1_BUSINESS_NEED type:", typeof formData.S1_1_BUSINESS_NEED);

  // ------------------------------------------------------------------
  // Bridge 1 (2.2 → 3.0) REMOVED.
  // It seeded ALL "accepted" (immutably locked) options from S2.2 into S3.0,
  // bypassing screening. The correct and only seeding path is Bridge 2 below
  // (2.3 → 3.0), which gates on screening.confirmed and filters to
  // status_quo + viableOptionIds.
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // ✅ 2.3 → 3.0 Bridge (Confirmed Screening → Options Data Entry)
  // Goal D: When screening is confirmed, seed S3_0_OPTIONS_DATA with
  // BASELINE (Status Quo) + VIABLE options so the score engine has
  // authoritative inputs for S3.2 / S3.3 / S3.6 / S3.8.
  // ------------------------------------------------------------------
  useEffect(() => {
    const screening = formData?.S2_3_SCREENING;
    if (!screening?.confirmed) return;

    const viableIds = new Set((screening.viableOptionIds ?? []).map(String));
    if (viableIds.size === 0) return;

    const alts = formData?.S2_2_LIST_OPTIONS?.alternatives;
    if (!Array.isArray(alts) || alts.length === 0) return;

    // Include BASELINE (Status Quo) + VIABLE options
    const toSeed = alts.filter((o) => {
      const id = String(o?.id || "");
      const isBaseline =
        o?.type === "StatusQuo" ||
        o?.type === "status_quo" ||
        id === "status_quo" ||
        o?.isStatusQuo === true;
      return isBaseline || viableIds.has(id);
    });
    if (toSeed.length === 0) return;

    const safeParseArray = (s) => {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    setFormData((prev) => {
      const s30 = prev?.S3_0_OPTIONS_DATA;
      const narrativeStr =
        typeof s30 === "string"
          ? s30
          : typeof s30?.optionsJson === "string"
          ? s30.optionsJson
          : typeof s30?.narrative === "string"
          ? s30.narrative   // backward-compat for existing saves
          : "[]";

      // Build a lookup of existing rows by id so user-edited financials are preserved
      // for options that remain in the viable set.
      const existingByIdMap = new Map(
        safeParseArray(narrativeStr)
          .filter((o) => o?.id || o?.optionId)
          .map((o) => {
            const eid = String(o?.id ?? o?.optionId ?? "");
            return [eid, o];
          })
      );

      // REPLACE — build from toSeed exclusively. Stale/non-forwarded rows are dropped.
      const nextArr = [];

      for (const opt of toSeed) {
        const id = String(opt?.id || "");
        if (!id) continue;

        // Carry-over: option was already in S3.0 (user may have edited financials).
        const existing = existingByIdMap.get(id);
        if (existing) {
          nextArr.push(existing);
          continue;
        }

        // New viable option: seed from S2.2 financial data.
        const _bmCapex2 = opt?.costBenchmark?.capex;
        const _bmCapexMid2 =
          typeof _bmCapex2 === "number" ? _bmCapex2
          : (typeof _bmCapex2 === "object" && _bmCapex2?.low != null && _bmCapex2?.high != null)
            ? (_bmCapex2.low + _bmCapex2.high) / 2
            : null;
        const _fiCapex2 = opt?.financialInputs?.capex;
        const capex =
          _fiCapex2 != null
            ? Number(_fiCapex2)
            : Number(opt?.capex ?? opt?.capexEstimate) || _bmCapexMid2 || 0;

        const _bmOpex2 = opt?.costBenchmark?.opex;
        const _bmOpexMid2 =
          typeof _bmOpex2 === "number" ? _bmOpex2
          : (typeof _bmOpex2 === "object" && _bmOpex2?.low != null && _bmOpex2?.high != null)
            ? (_bmOpex2.low + _bmOpex2.high) / 2
            : null;
        const _fiOpex2 = opt?.financialInputs?.opexAnnual;
        const opexPerYear =
          _fiOpex2 != null
            ? Number(_fiOpex2)
            : Number(opt?.opexPerYear ?? opt?.opex ?? opt?.opexEstimate) || _bmOpexMid2 || 0;

        const _fiBenefits2 = opt?.financialInputs?.benefitsAnnual;
        const benefitsPerYear =
          _fiBenefits2 != null
            ? Number(_fiBenefits2)
            : Number(opt?.benefitsPerYear ?? opt?.benefits ?? opt?.benefitsEstimate ?? 0) || 0;

        nextArr.push({
          id,
          optionId: id,
          name: opt?.name || "",
          description: opt?.description || opt?.shortDescription || "",
          capex,
          opexPerYear,
          benefitsPerYear,
          opex: opexPerYear,
          benefits: benefitsPerYear,
        });
      }

      // Always write when screening is confirmed: this removes stale rows even when
      // all toSeed options were already present (the old guard `if (!changed)` blocked this).
      const nextNarrative = JSON.stringify(nextArr, null, 2);
      const nextS30 =
        s30 && typeof s30 === "object" && !Array.isArray(s30)
          ? { ...s30, optionsJson: nextNarrative }
          : { optionsJson: nextNarrative };

      return { ...prev, S3_0_OPTIONS_DATA: nextS30 };
    });
  }, [formData?.S2_3_SCREENING]); // eslint-disable-line react-hooks/exhaustive-deps

  const [draftBuffer, setDraftBuffer] = useState(() => ({}));  // ✅ Retourne {}
  const [validationResults, setValidationResults] = useState(() => ([]));  // ✅ Retourne []
  /** Revision counter — incremented in every save handler (edit+save are the same action here). */
  const [formRev, setFormRev] = useState(0);
  /** Ref holding the revision that was last validated. Updated synchronously in _execValidation. */
  const validatedRevRef = useRef(0);
  /** Derived — true when formData has advanced past the last validation run. No setState needed. */
  const isValidationStale = formRev !== validatedRevRef.current;
  const [execDrafting, setExecDrafting] = useState(false);  // ✅ OK (pas de lazy init)
  const [isPrefilling, setIsPrefilling] = useState(false); // ✅ Added for prefill integration

  // ✅ Keep ONLY bottom preview toggle
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ── Issues Drawer ──────────────────────────────────────────────────────────
  const [issuesDrawerOpen, setIssuesDrawerOpen] = useState(false);

  // ── Draft info banner (dismissible, persisted) ─────────────────────────────
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem("bc01_draft_banner_dismissed") === "true"
  );
  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("bc01_draft_banner_dismissed", "true");
  };

  // ── Project Title (editable in Step 3) ────────────────────────────────────
  const [localProjectTitle,  setLocalProjectTitle]  = useState("");
  const [titleSuggestions,   setTitleSuggestions]   = useState([]);
  const [isSuggestingTitle,  setIsSuggestingTitle]  = useState(false);
  const [titleSuggestError,  setTitleSuggestError]  = useState(null);
  // Seed once from step1Inputs when data arrives; don't overwrite user edits.
  const titleInitializedRef = useRef(false);

  const API_BASE = (import.meta?.env?.VITE_API_BASE || "").replace(/\/$/, "");

  const step1Envelope = useMemo(() => {
    const rawInputs =
      data && typeof data === "object"
        ? data.inputs && typeof data.inputs === "object"
          ? data.inputs
          : data
        : {};
    return buildStep1Payload(rawInputs);
  }, [data]);

  const step1Inputs = step1Envelope?.step1?.inputs || {};

  // Debug hook (useful for audits)
  useEffect(() => {
    window.__FG_STEP1__ = step1Inputs;
  }, [step1Inputs]);

  // Seed localProjectTitle once from step1Inputs (does not overwrite user edits)
  useEffect(() => {
    if (titleInitializedRef.current) return;
    const t =
      step1Inputs?.projectTitle ||
      step1Inputs?.title        ||
      step1Inputs?.topic        ||
      "";
    if (t) {
      setLocalProjectTitle(t);
      titleInitializedRef.current = true;
    }
  }, [step1Inputs?.projectTitle, step1Inputs?.title, step1Inputs?.topic]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Industry / regulatory context ────────────────────────────────────────
  // industry and subsector are NOT in step1Inputs (= data.inputs).
  // Canonical source: data.industry / data.subsector (top-level payload).
  // Fallback:         data.universal.context.* (same values, nested path).
  // jurisdiction:     free-form data.region — no enum, mapped for context shape.
  // NOTE: nested optional chains in dep arrays are intentional — we want a
  // stable memoized object that only reconstructs when these scalars change.
  const validationContext = useMemo(
    () => ({
      industry:     (data?.industry     ?? data?.universal?.context?.industry     ?? null) || null,
      subsector:    (data?.subsector    ?? data?.universal?.context?.subsector    ?? null) || null,
      jurisdiction: (data?.region       ?? data?.universal?.context?.region       ?? null) || null,
    }),
    // Primitive deps only — avoids re-running on unrelated object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data?.industry,
      data?.subsector,
      data?.region,
      data?.universal?.context?.industry,
      data?.universal?.context?.subsector,
      data?.universal?.context?.region,
    ]
  );

  const isNonEmpty = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return true;
    if (Array.isArray(v)) return v.length > 0;
    return false;
  };

  const extractDerivedValue = useCallback(
    (derivedFrom) => {
      if (!derivedFrom || typeof derivedFrom !== "string") return undefined;
      if (!derivedFrom.startsWith("step1.")) return undefined;
      const key = derivedFrom.slice("step1.".length);
      return step1Inputs?.[key];
    },
    [step1Inputs]
  );

  /* ---------------- Prefill Logic ---------------- */
  const handlePrefillFromAI = useCallback(async (option) => {
    if (!option || !option.id) {
      alert('Please save the option first before prefilling.');
      return;
    }

    setIsPrefilling(true);
    const base = API_BASE ? `${API_BASE}` : "";
    
    try {
      const response = await fetch(`${base}/api/llm/research-option-inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step1: step1Envelope.step1,
          option: {
            id: option.id,
            name: option.name,
            type: option.type,
            description: option.description || option.shortDescription,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const { inputs } = await response.json();
      
      // Update S3_0_OPTIONS_DATA in formData
      setFormData((prev) => {
	  const s30 = prev?.S3_0_OPTIONS_DATA;

	  const narrativeStr =
		typeof s30 === "string"
		  ? s30
		  : typeof s30?.optionsJson === "string"
		  ? s30.optionsJson
		  : typeof s30?.narrative === "string"
		  ? s30.narrative   // backward-compat for existing saves
		  : "[]";

	  let arr = [];
	  try {
		const parsed = JSON.parse(narrativeStr);
		arr = Array.isArray(parsed) ? parsed : [];
	  } catch {
		arr = [];
	  }

	  const updatedArr = arr.map((opt) => {
		const oid = String(opt?.id ?? opt?.optionId ?? "");
		return oid === String(option.id)
		  ? { ...opt, inputs3_0: inputs }
		  : opt;
	  });

	  const nextNarrative = JSON.stringify(updatedArr, null, 2);

	  const nextS30 =
		s30 && typeof s30 === "object" && !Array.isArray(s30)
		  ? { ...s30, optionsJson: nextNarrative }
		  : { optionsJson: nextNarrative };

	  return { ...prev, S3_0_OPTIONS_DATA: nextS30 };
	});
      
      alert('✓ Structured inputs generated! Review and adjust as needed.');
      
    } catch (error) {
      console.error('Prefill failed:', error);
      alert(`Failed to generate structured inputs: ${error.message}\n\nPlease try again.`);
    } finally {
      setIsPrefilling(false);
    }
  }, [API_BASE, step1Envelope]);

  // Prefill from derivedFrom (SAFE: complète seulement les champs vides / absents)
useEffect(() => {
  if (!step1Inputs) return;

  const buildDerivedPrefill = () => {
    const derivedPrefill = {};
    for (const section of BC01_SECTIONS) {
      const sid = section.id;
      for (const field of section.fields || []) {
        if (!field?.key) continue;
        const derived = extractDerivedValue(field.derivedFrom);
        if (isNonEmpty(derived)) {
          if (!derivedPrefill[sid]) derivedPrefill[sid] = {};
          derivedPrefill[sid][field.key] = derived;
        }
      }
    }

    // Ensure S1 narrative exists (if schema uses S1)
    derivedPrefill.S1 = derivedPrefill.S1 || {};
    if (!("narrative" in derivedPrefill.S1)) derivedPrefill.S1.narrative = "";

    return derivedPrefill;
  };

  const derivedPrefill = buildDerivedPrefill();

  setFormData((prev) => {
    const next = { ...(prev || {}) };

    for (const [sid, fieldsObj] of Object.entries(derivedPrefill)) {
      next[sid] = next[sid] || {};
      for (const [k, v] of Object.entries(fieldsObj || {})) {
        const current = next[sid]?.[k];
        // ✅ ne complète QUE si vide/absent (n'écrase jamais)
        if (!isNonEmpty(current)) {
          next[sid][k] = v;
        }
      }
    }

    return next;
  });
}, [step1Inputs, extractDerivedValue, initialFormData]);



  // ✅ Decision Engine (v3) — deterministic scoring & calculations
  // MOVED BEFORE draftField to avoid "Cannot access before initialization" error
  const engineOutput = useMemo(() => {
    console.group("🔧 scoreEngineV3 Execution");
    try {
      console.log("📌 formData keys:", Object.keys(formData || {}));
      console.log("📌 S2_1_EVAL_CRITERIA:", formData?.S2_1_EVAL_CRITERIA);
      console.log("📌 S3_0_OPTIONS_DATA:", formData?.S3_0_OPTIONS_DATA);
      console.log("📌 S3_0_VIABLE_OPTIONS:", formData?.S3_0_VIABLE_OPTIONS);

      const engineSnapshot = { ...(formData || {}) };
// Normalize options key for score engine (alias from schema) + normalize ids + apply viable filter
const viableIds = Array.isArray(engineSnapshot.S3_0_VIABLE_OPTIONS)
  ? engineSnapshot.S3_0_VIABLE_OPTIONS.map(String)
  : [];

// S3_0_OPTIONS_DATA can be:
// - an array (ideal)
// - a JSON string
// - an object { narrative: "[...]" } (current UI storage)
const rawOptions = (() => {
  const v = engineSnapshot.S3_0_OPTIONS_DATA;
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (v && typeof v === "object") {
    const raw = typeof v.optionsJson === "string" ? v.optionsJson
               : typeof v.narrative  === "string" ? v.narrative
               : null;
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }
  return [];
})();

const normalizedOptions = rawOptions.map((o, idx) => {
  const id =
    o?.id ??
    o?.optionId ??
    o?.key ??
    o?.code ??
    (o?.name ? String(o.name).trim().toLowerCase().replace(/\s+/g, "-") : null) ??
    `opt-${idx}`;

  return { ...o, id: String(id), optionId: String(id) };
});

const filteredOptions = viableIds.length
  ? normalizedOptions.filter((o) => viableIds.includes(String(o.id)))
  : normalizedOptions;

engineSnapshot.options = filteredOptions;

// 🔍 Logs (très utiles)
console.log("📌 viableIds:", viableIds);
console.log("📌 normalized option ids:", normalizedOptions.map((o) => o.id));
console.log("📌 filtered options count:", filteredOptions.length);

const engineInput = buildEngineInputFromSnapshot(engineSnapshot);
      console.log("✅ engineInput built:", engineInput);
      console.log("  - section2_1:", engineInput?.section2_1);
      console.log("  - options:", engineInput?.options);
      console.log("  - options.length:", engineInput?.options?.length);

      const result = scoreEngineV3(engineInput);
      console.log("✅ engineOutput:", result);
      console.log("  - scoredOptions.length:", result?.scoredOptions?.length);

      console.groupEnd();
      return result;
    } catch (e) {
      console.error("❌ scoreEngineV3 failed:", e);
      console.groupEnd();
      return null;
    }
  }, [formData]);

  /**
   * ✅ LLM draft helper (single field draft)
   */
const draftField = useCallback(
  async (sectionId, fieldKey) => {
    const base = API_BASE ? `${API_BASE}` : "";
    const endpoint = "/api/llm/draft-section";

    const section = BC01_SECTION_MAP[sectionId];
    const pmiLens = getPmiLensForSection(section);

    const body = {
      docId: "BC-01",
      sectionId,
      fieldKey,

      step1: step1Envelope.step1,
      step1Inputs,
      step1Envelope: step1Envelope.step1,

      snapshot: formData,
      context: formData,

      section,
      pmiLens,
    };

    // ✅ NOUVEAU: Enrichir le payload pour sections avec tableaux calculés
    const sectionsWithCalculatedTables = [
      "S3_2_COSTS",
      "S3_3_CBA",
      "S3_6_BENCHMARK",
      "S3_8_PROS_CONS"
    ];

    if (sectionsWithCalculatedTables.includes(sectionId) && engineOutput) {
      body.engineOutput = engineOutput;
      body.useContextAwarePrompt = true;
      console.log(`🎯 Frontend: Sending engineOutput for ${sectionId}`, engineOutput);
    }

    // Goal F: Ground S2.3 narrative + S2.4 rationale on actual screening results
    if (sectionId === "S2_3_SCREENING" || sectionId === "S2_4_RATIONALE") {
      const screening = formData?.S2_3_SCREENING;
      if (screening) {
        body.screeningResults = {
          confirmed:          screening.confirmed         ?? false,
          viableOptionIds:    screening.viableOptionIds   ?? [],
          decisions:          screening.decisions         ?? [],
          screeningNarrative: screening.screeningNarrative ?? "",
        };
      }

      const alts = formData?.S2_2_LIST_OPTIONS?.alternatives;
      if (Array.isArray(alts) && alts.length > 0) {
        const isStatusQuo = (o) =>
          o?.type === "StatusQuo" ||
          o?.type === "status_quo" ||
          o?.id   === "status_quo" ||
          o?.isStatusQuo === true;

        const viableIds = new Set((screening?.viableOptionIds ?? []).map(String));

        body.statusQuo        = alts.find(isStatusQuo) ?? null;
        body.optionsAccepted  = alts.filter((o) => !isStatusQuo(o) && (o?.accepted === true || viableIds.has(String(o?.id ?? ""))));
        body.optionsDiscarded = alts.filter((o) => !isStatusQuo(o) && o?.accepted !== true && !viableIds.has(String(o?.id ?? "")));
      }
    }

    const r = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(payload?.error || payload?.message || `LLM failed (${r.status})`);

    const out = (payload?.text || payload?.narrative || "").trim();
    if (!out) throw new Error("Empty AI response");
    return out;
  },
  [API_BASE, step1Envelope, step1Inputs, formData, engineOutput]
);

  /**
   * ✅ Auto-generate S1 once
   */
  useEffect(() => {
    const s1 = BC01_SECTION_MAP.S1;
    if (!s1?._isExecutiveSummary) return;
    if (!step1Inputs?.topic && !step1Inputs?.title && !step1Inputs?.projectTitle) return;

    const current = formData?.S1?.narrative;
    const alreadyAuto = formData?.S1?._autoDrafted;

    if (current && current.trim()) return;
    if (alreadyAuto) return;

    const run = async () => {
      try {
        setExecDrafting(true);
        const draft = await draftField("S1", "narrative");
        setFormData((prev) => ({
          ...prev,
          S1: { ...(prev.S1 || {}), narrative: draft, _autoDrafted: true },
        }));
      } catch (e) {
        console.error("S1 auto-draft failed:", e);
      } finally {
        setExecDrafting(false);
      }
    };

    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [step1Inputs, formData?.S1, draftField]);

  const storeDraftInBuffer = useCallback((sectionId, fieldKey, draftText) => {
    setDraftBuffer((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [fieldKey]: { text: draftText, createdAt: Date.now() },
      },
    }));
  }, []);

  /**
   * ✅ Robust onAIDraft handler FACTORY (per-section closure)
   * FieldRenderer may call:
   * - onAIDraft({ fieldKey, field })
   * - onAIDraft(fieldKey, field)
   * - onAIDraft(fieldKey)
   */
  const makeHandleAIDraftForSection = useCallback(
    (sectionId) => {
      return async (...args) => {
        let fieldKey = null;

        if (args.length === 1 && args[0] && typeof args[0] === "object" && !Array.isArray(args[0])) {
          fieldKey = args[0].fieldKey ?? args[0].key ?? null;
        } else if (args.length >= 1 && typeof args[0] === "string") {
          fieldKey = args[0];
        }

        if (!fieldKey) throw new Error("DraftWithAI: missing fieldKey.");

        const text = await draftField(sectionId, fieldKey);
        storeDraftInBuffer(sectionId, fieldKey, text);
        return text;
      };
    },
    [draftField, storeDraftInBuffer]
  );

  const validateDraftContent = useCallback(
    (sectionId, fieldKey, draftText) => {
      const tempSnapshot = {
        ...formData,
        [sectionId]: {
          ...(formData[sectionId] || {}),
          [fieldKey]: draftText,
        },
      };

      const engineIssues = validateRuleEngineSnapshot(tempSnapshot, null);
      const relevant = Array.isArray(engineIssues)
        ? engineIssues.filter(
            (issue) =>
              issue.sectionId === sectionId &&
              (!issue.appliesTo?.fieldKey || issue.appliesTo.fieldKey === fieldKey)
          )
        : [];

      const hasBlocks = relevant.some((i) => i.severity === "BLOCK");
      const hasWarns = relevant.some((i) => i.severity === "WARN");

      return {
        isValid: !hasBlocks,
        hasBlocks,
        hasWarns,
        issues: relevant,
        blockingIssues: relevant.filter((i) => i.severity === "BLOCK"),
        warningIssues: relevant.filter((i) => i.severity === "WARN"),
      };
    },
    [formData]
  );

  // ─── Validation orchestrator (on-save ONLY) ──────────────────────────────
  // _execValidation(data) is called exclusively from save handlers:
  //   • handleSectionChange  — section data committed
  //   • handleApplyDraft     — AI draft applied
  //
  // NEVER called from:
  //   • useEffect (no reactive trigger)
  //   • onClick / any UI event
  //   • timers, debounce, polling
  //
  // Defined BEFORE handleApplyDraft and handleSectionChange to avoid TDZ.

  // Ref keeps latest step1Inputs accessible inside save handlers
  // without adding it as a dep (avoids closure re-creation on each keystroke).
  const step1InputsRef = useRef(step1Inputs);
  step1InputsRef.current = step1Inputs;

  // Ref keeps the latest regulatory context accessible inside _execValidation
  // without adding it as a dep (same stable-closure pattern as step1InputsRef).
  const contextRef = useRef(validationContext);
  contextRef.current = validationContext;

  /**
   * Run all validators against an explicit data snapshot.
   * Accepts nextFormData directly — never reads from stale React state.
   * Private: not exposed to any UI event or useEffect.
   */
  const _execValidation = useCallback((nextFormData, rev) => {
    if (!nextFormData || Object.keys(nextFormData).length === 0) {
      setValidationResults([]);
      validatedRevRef.current = rev;
      return;
    }

    // Rule engines — registry is the single validation authority.
    // engineIssues:   legacy JS validators (produce 0 issues on v2 form; kept for forward compat).
    // registryIssues: collectIssues() — TBS BLOCK + PMI WARN rules always run;
    //                 REGULATORY rules run only when contextRef has a matched preset.
    const engineIssues = validateRuleEngineSnapshot(nextFormData, null);
    const registryIssues = collectIssues(nextFormData, contextRef.current);

    const merged = [
      ...(Array.isArray(engineIssues) ? engineIssues : []),
      ...(Array.isArray(registryIssues) ? registryIssues : []),
    ];

    // Deduplication key: sectionId + ruleId (stable, audit-safe).
    const deduped = merged.reduce((acc, issue) => {
      const k = `${issue.sectionId || ""}::${issue.ruleId || ""}`;
      if (!acc.has(k)) acc.set(k, issue);
      return acc;
    }, new Map());

    setValidationResults(Array.from(deduped.values()));
    // Synchronously mark this revision as validated — no competing setState for stale.
    validatedRevRef.current = rev;
  }, []); // stable — nextFormData passed explicitly, step1Inputs via ref, rev via arg

  /**
   * ✅ Apply draft to formData (gate)
   */
  const handleApplyDraft = useCallback(
    (sectionId, fieldKey, overrideText) => {
      const draft = draftBuffer?.[sectionId]?.[fieldKey];
      const textToApply = (overrideText ?? draft?.text ?? "").trim();
      if (!textToApply) return { success: false, reason: "no_draft" };

      const validation = validateDraftContent(sectionId, fieldKey, textToApply);
      if (validation.hasBlocks) return { success: false, reason: "blocked", validation };

      // nextFormData (closure-based) is kept for _execValidation only.
      // setFormData uses a functional updater so the write always lands on
      // the latest committed state — safe against stale-closure race with Bridge 2.
      const nextFormData = {
        ...formData,
        [sectionId]: { ...(formData[sectionId] || {}), [fieldKey]: textToApply },
      };

      const nextRev = formRev + 1;
      setFormRev(nextRev);
      setFormData((prev) => {
        const next = {
          ...prev,
          [sectionId]: { ...(prev[sectionId] || {}), [fieldKey]: textToApply },
        };
        return next;
      });
      setDraftBuffer((prev) => {
        const next = { ...prev };
        if (next[sectionId]) {
          delete next[sectionId][fieldKey];
          if (Object.keys(next[sectionId]).length === 0) delete next[sectionId];
        }
        return next;
      });

      // Validation runs here — on draft apply (save) — never from a useEffect or click handler
      _execValidation(nextFormData, nextRev);

      return { success: true, validation };
    },
    [draftBuffer, validateDraftContent, formData, formRev, _execValidation]
  );

  const handleSectionChange = useCallback((sectionId, sectionData) => {
    const nextFormData = { ...formData, [sectionId]: sectionData };
    const nextRev = formRev + 1;
    setFormRev(nextRev);
    setFormData((prev) => ({ ...prev, [sectionId]: sectionData }));
    // Validation runs here — on section save — never from a useEffect or click handler
    _execValidation(nextFormData, nextRev);
  }, [formData, formRev, _execValidation]);

  // NOTE: No useEffect([formData]) here — stale is derived purely from formRev vs validatedRevRef.
  // Bridge effects (S2.2→S3.0 sync etc.) that mutate formData via setFormData without going through
  // a save handler will NOT increment formRev and therefore won't flip the stale indicator.
  // This is intentional: stale only means "you saved a field; run validation now."

  console.log("[V] validationResults:", validationResults?.length, validationResults?.slice?.(0, 5));

  // ✅ Strict TBS render list (single source of truth).
  // Defined here (before navNormalizedResults) so the memo can reference it.
  const orderedRenderSections = useMemo(() => {
    return BC01_SECTION_ORDER
      .map((sid) => BC01_SECTION_MAP[sid])
      .filter(Boolean)
      .filter((s) => !s.isDerived);
  }, []);

  /**
   * validationResults with legacy short IDs ("S1", "S7", …) remapped to
   * their canonical nav-chip ID (one-to-one, no fan-out).
   * ALL nav-chip consumers (colour, tooltip, header counts) use THIS array.
   */
  const navNormalizedResults = useMemo(() => {
    if (!validationResults.length) return validationResults;
    const navIds = orderedRenderSections.map((s) => s.id);
    return validationResults.map((issue) => {
      const normalizedId = normalizeSectionIdForNav(issue.sectionId, navIds);
      if (normalizedId === issue.sectionId) return issue; // fast-path — no allocation
      return { ...issue, sectionId: normalizedId, targetSectionId: normalizedId };
    });
  }, [validationResults, orderedRenderSections]);

  /**
   * Display-layer remap — S1+title issues promoted to the virtual "__meta__"
   * section so they are counted as "mapped" and grouped under "Project" in the
   * drawer, and so the "+N unmapped" badge disappears.
   * Raw issue objects are NOT mutated; the original sectionId is preserved in
   * navNormalizedResults (used for inline SectionCard highlight maps).
   */
  const metaRemappedResults = useMemo(() => {
    if (!navNormalizedResults.length) return navNormalizedResults;
    return navNormalizedResults.map((issue) => {
      const sid = issue.sectionId || "";
      // Normalise to lowercase; check all three fieldKey locations the validator
      // might use: appliesTo.fieldKey, top-level fieldKey, targetFieldKey.
      const fk = (
        issue.appliesTo?.fieldKey ||
        issue.fieldKey            ||
        issue.targetFieldKey      ||
        ""
      ).toLowerCase();
      const isProjectTitleIssue =
        (sid === "S1" || sid === "S1_EXEC_SUMMARY") &&
        fk.includes("title");
      if (isProjectTitleIssue) {
        return { ...issue, sectionId: "__meta__", fieldKey: "projectTitle" };
      }
      return issue;
    });
  }, [navNormalizedResults]);

  // ── Mapped / unmapped split ─────────────────────────────────────────────
  // Mapped   = issues whose sectionId exists in the rendered nav chip set.
  //            These drive chip colours, tooltips, and the header totals.
  // Unmapped = issues with a legacy/orphan sectionId ("S6"–"S11", …) that
  //            has no matching BC01 nav chip after normalization.  They are
  //            surfaced as a neutral "+N unmapped" badge so the header total
  //            never exceeds what the user can actually navigate to.
  const navIdSet = useMemo(
    () => new Set(orderedRenderSections.map((s) => s.id)),
    [orderedRenderSections]
  );

  // Drawer-aware id set: extends navIdSet with the virtual "__meta__" group so
  // that S1+title issues (remapped above) are counted as "mapped", eliminating
  // the spurious "+N unmapped" badge.
  const drawerNavIdSet = useMemo(
    () => new Set([...navIdSet, "__meta__"]),
    [navIdSet]
  );

  const mappedIssues = useMemo(
    () => metaRemappedResults.filter((i) => drawerNavIdSet.has(i.sectionId)),
    [metaRemappedResults, drawerNavIdSet]
  );

  const unmappedIssues = useMemo(
    () => metaRemappedResults.filter((i) => !drawerNavIdSet.has(i.sectionId)),
    [metaRemappedResults, drawerNavIdSet]
  );

  // DEV-ONLY mapping audit — remove before release
  useEffect(() => {
    if (import.meta?.env?.PROD) return;
    const orphanIds = [...new Set(unmappedIssues.map((i) => i.sectionId))].slice(0, 10);
    console.group("[FlowGestio] Nav mapping audit");
    console.log("total issues :", navNormalizedResults.length);
    console.log("mapped       :", mappedIssues.length);
    console.log("unmapped     :", unmappedIssues.length);
    console.log("orphan IDs   :", orphanIds);
    console.groupEnd();
  }, [navNormalizedResults, mappedIssues, unmappedIssues]);

  // Header counts driven by MAPPED issues only — guarantees header total ≤
  // sum of colored chips (no phantom blocks from legacy orphan validators).
  const validationSummary = useMemo(
    () => getValidationSummary(mappedIssues),
    [mappedIssues]
  );

  console.log("[V] validationSummary:", validationSummary);

  // ── Inline highlight maps (section + field) ───────────────────────────────
  // Single source of truth: navNormalizedResults (same array as IssuesDrawer).
  // sectionSeverityMap : { [sectionId]: "OK"|"WARN"|"BLOCK" }
  // fieldSeverityMap   : { ["sectionId::fieldKey"]: "OK"|"WARN"|"BLOCK" }
  const sectionSeverityMap = useMemo(() => {
    const map = {};
    for (const issue of navNormalizedResults) {
      const sid = issue.sectionId;
      if (!sid) continue;
      map[sid] = maxSeverity(map[sid] ?? "OK", issue.severity ?? "OK");
    }
    return map;
  }, [navNormalizedResults]);

  const fieldSeverityMap = useMemo(() => {
    const map = {};
    for (const issue of navNormalizedResults) {
      const sid = issue.sectionId;
      const fk  = issue.appliesTo?.fieldKey ?? issue.targetFieldKey;
      if (!sid || !fk) continue;
      const key = `${sid}::${fk}`;
      map[key] = maxSeverity(map[key] ?? "OK", issue.severity ?? "OK");
    }
    return map;
  }, [navNormalizedResults]);

  const scrollToSection = useCallback((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const offset = 80;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const scrollToField = useCallback(
    (sectionId, fieldKey) => {
      if (!sectionId) return;
      if (!fieldKey) return scrollToSection(sectionId);

      const anchorId = `${sectionId}__${fieldKey}`;
      const el = document.getElementById(anchorId);
      if (el) {
        const offset = 90;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
        const focusable = el.querySelector("textarea, input, select, button");
        if (focusable) focusable.focus();
        return;
      }

      scrollToSection(sectionId);
    },
    [scrollToSection]
  );

  // ── IssuesDrawer helpers ──────────────────────────────────────────────────

  /**
   * getSectionMeta — maps a sectionId to its human label + anchorId.
   * Reuses the same BC01_SECTION_MAP that drives nav chips.
   * Returns null for unknown / unmapped sectionIds.
   */
  const getSectionMeta = useCallback((sectionId) => {
    // Virtual group for project-level metadata (title, etc.)
    if (sectionId === "__meta__") {
      return { label: "Project", anchorId: "project-context" };
    }
    const section = BC01_SECTION_MAP[sectionId];
    if (!section) return null;
    const ref = section.ref ? `${section.ref} — ` : "";
    return {
      label:    `${ref}${section.title || sectionId}`,
      anchorId: sectionId,  // SectionCard renders <div id={section.id}>
    };
  }, []); // BC01_SECTION_MAP is a module-level constant — no reactive dep needed

  /**
   * handleJumpToSection — called by IssuesDrawer when the user clicks "Go →".
   * 1. Scroll to the section container (or specific field if fieldKey provided).
   * 2. Add a CSS highlight class to the SectionCard container for ~2.2 s.
   * 3. If fieldKey resolves to a DOM node, highlight the field too.
   *
   * No setState — pure DOM side-effects. Loop-safe.
   */
  const handleJumpToSection = useCallback((sectionId, fieldKey) => {
    // ── 0. Special-case: project metadata → #project-context block ──────────
    // Covers: (a) legacy S1+title issues, (b) remapped __meta__ issues from drawer.
    if (
      sectionId === "__meta__" ||
      (
        (sectionId === "S1" || sectionId === "S1_EXEC_SUMMARY") &&
        (fieldKey === "title" || (fieldKey || "").includes("title"))
      )
    ) {
      document.getElementById("project-context")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // ── 1. Scroll ──────────────────────────────────────────────────────────
    if (fieldKey) {
      scrollToField(sectionId, fieldKey);
    } else {
      scrollToSection(sectionId);
    }

    // ── 2. Highlight SectionCard container ────────────────────────────────
    // SectionCard renders <div id={sectionId}>, which is the anchor element.
    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
      // Remove then re-add so repeated clicks restart the animation
      sectionEl.classList.remove("issues-jump-highlight");
      // rAF ensures the class removal is committed before re-adding
      requestAnimationFrame(() => {
        sectionEl.classList.add("issues-jump-highlight");
        const HIGHLIGHT_DURATION_MS = 2200;
        setTimeout(() => {
          sectionEl.classList.remove("issues-jump-highlight");
        }, HIGHLIGHT_DURATION_MS);
      });
    }

    // ── 3. Highlight target field (if fieldKey available) ─────────────────
    if (fieldKey) {
      // FieldRenderer attaches id="${sectionId}__${fieldKey}" to each field wrapper
      const fieldAnchorId = `${sectionId}__${fieldKey}`;
      const fieldEl = document.getElementById(fieldAnchorId);
      if (fieldEl) {
        fieldEl.classList.remove("issues-jump-field-highlight");
        requestAnimationFrame(() => {
          fieldEl.classList.add("issues-jump-field-highlight");
          setTimeout(() => {
            fieldEl.classList.remove("issues-jump-field-highlight");
          }, 2200);
        });
      }
    }
  }, [scrollToSection, scrollToField]);

  // ── Project Title handlers ─────────────────────────────────────────────────

  /**
   * Persist the edited title to formData["S1"]["title"] so the semantic
   * validator (R-SEM-05) re-evaluates it on the next validation run.
   * Called on <input> blur and on "Use" suggestion click.
   */
  const commitTitleToFormData = useCallback((title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const nextFormData = {
      ...formData,
      S1: { ...(formData.S1 || {}), title: trimmed },
    };
    const nextRev = formRev + 1;
    setFormRev(nextRev);
    setFormData(nextFormData);
    _execValidation(nextFormData, nextRev);
  }, [formData, formRev, _execValidation]);

  const handleTitleBlur = useCallback(() => {
    commitTitleToFormData(localProjectTitle);
  }, [localProjectTitle, commitTitleToFormData]);

  /**
   * Call POST /api/llm/suggest-title and populate the suggestions list.
   */
  const handleSuggestTitle = useCallback(async () => {
    setIsSuggestingTitle(true);
    setTitleSuggestError(null);
    setTitleSuggestions([]);
    const base = API_BASE ? `${API_BASE}` : "";
    try {
      const r = await fetch(`${base}/api/llm/suggest-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step1: step1Envelope?.step1 }),
      });
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(payload?.error || `Failed (${r.status})`);
      const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
      if (!suggestions.length) throw new Error("No suggestions returned");
      setTitleSuggestions(suggestions);
    } catch (err) {
      setTitleSuggestError(err.message || "Could not generate suggestions");
    } finally {
      setIsSuggestingTitle(false);
    }
  }, [API_BASE, step1Envelope]);

  /**
   * Apply a chosen suggestion: fill the input, dismiss the list, persist + revalidate.
   */
  const handleApplyTitleSuggestion = useCallback((suggestion) => {
    setLocalProjectTitle(suggestion);
    setTitleSuggestions([]);
    setTitleSuggestError(null);
    commitTitleToFormData(suggestion);
  }, [commitTitleToFormData]);

  return (
    <div className="w-full mx-auto pb-20">
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Business Case (BC-01)</h2>
            <div className="text-sm text-gray-600">
              Draft → Apply updates the preview. Fix BLOCK issues before export.
            </div>
          </div>

          <div className="text-sm flex items-center gap-2 flex-wrap">
            {(validationSummary?.blockCount ?? 0) > 0 ? (
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                🚫 {validationSummary.blockCount} BLOCK
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                ✅ Ready (no BLOCK)
              </span>
            )}
            {(validationSummary?.warnCount ?? 0) > 0 && (
              <span className="ml-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                ⚠️ {validationSummary.warnCount} WARN
              </span>
            )}
            {/* Unmapped badge — issues from legacy validators whose sectionId
                has no matching nav chip (e.g. "S7", "S9", …).
                Shown so the user knows there are issues that can't be navigated
                to via chips; not included in the BLOCK/WARN totals above. */}
            {unmappedIssues.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                +{unmappedIssues.length} unmapped
              </span>
            )}
            {/* Stale indicator — informative only. No click handler.
                Shown when formData changed since the last save-triggered validation.
                La validation est un acte volontaire — uniquement on-save, jamais automatique. */}
            {isValidationStale && (
              <span
                className="ml-1 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200"
                aria-live="polite"
              >
                ⟳ Validation outdated — save to refresh
              </span>
            )}

            {/* ── Review Issues button ── */}
            {navNormalizedResults.length > 0 && (
              <button
                type="button"
                onClick={() => setIssuesDrawerOpen((v) => !v)}
                className={
                  issuesDrawerOpen
                    ? "ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-slate-800 text-white border-slate-800"
                    : "ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }
                aria-pressed={issuesDrawerOpen}
                aria-label="Review all validation issues"
              >
                📋 Review Issues
              </button>
            )}
          </div>
        </div>

        {/* ── Project Context (editable title + AI suggestions) ── */}
        <div id="project-context" className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">

          {/* Label row + AI Suggestion button */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="project-title-input"
              className="text-xs font-medium text-gray-500 uppercase tracking-wide"
            >
              Project Title
            </label>
            <button
              type="button"
              onClick={handleSuggestTitle}
              disabled={isSuggestingTitle}
              className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isSuggestingTitle ? "Suggesting…" : "✨ AI Suggestion"}
            </button>
          </div>

          {/* Editable title input */}
          <input
            id="project-title-input"
            type="text"
            value={localProjectTitle}
            onChange={(e) => setLocalProjectTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Enter a descriptive project title…"
            className="w-full text-base font-semibold bg-white border border-gray-200 rounded-md px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />

          {/* Error */}
          {titleSuggestError && (
            <div className="mt-1.5 text-xs text-red-500">{titleSuggestError}</div>
          )}

          {/* Suggestions list */}
          {titleSuggestions.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {titleSuggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-white border border-gray-100 rounded-md px-3 py-1.5"
                >
                  <span className="flex-1 text-sm text-gray-700 leading-snug">{s}</span>
                  <button
                    type="button"
                    onClick={() => handleApplyTitleSuggestion(s)}
                    className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Organisation (read-only) */}
          {(step1Inputs?.organization || step1Inputs?.org || step1Inputs?.organisationName) && (
            <div className="text-sm text-gray-500 mt-2">
              {step1Inputs.organization || step1Inputs.org || step1Inputs.organisationName}
            </div>
          )}
        </div>

        {/* ✅ Editor-first layout (SplitView removed) */}
		<div className="mt-6 space-y-6">

          {/* ── Draft info banner (shown once, dismissed via × or localStorage) ── */}
          {!bannerDismissed && (
            <div className="flex items-start justify-between gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
              <span>✏️ Write directly or click <strong>Draft with AI</strong> on any field. You can edit the generated draft, then click <strong>Apply</strong> to insert it.</span>
              <button
                type="button"
                onClick={handleDismissBanner}
                className="shrink-0 text-blue-400 hover:text-blue-600 font-medium text-base leading-none mt-0.5"
                aria-label="Dismiss banner"
              >
                ×
              </button>
            </div>
          )}

		  {orderedRenderSections.map((section) => (
			<SectionCard
			  key={section.id}
			  section={
			    section.id === "S1_EXEC_SUMMARY" && Array.isArray(section.fields)
			      ? { ...section, fields: section.fields.filter((f) => f?.key !== "title") }
			      : section
			  }
			  data={formData[section.id] || {}}
			  step1={step1Inputs}
			  formData={formData}
			  onChange={(sectionData) => handleSectionChange(section.id, sectionData)}
			  validationResults={validationResults}
			  onAIDraft={makeHandleAIDraftForSection(section.id)}
			  draftBuffer={draftBuffer[section.id]}
			  onApplyDraft={handleApplyDraft}
			  allSections={[]}
			  engineOutput={engineOutput}
        onPrefill={section.id === "S3_0_OPTIONS_DATA" ? handlePrefillFromAI : undefined}
        isPrefilling={isPrefilling}
        issueSeverity={sectionSeverityMap[section.id] ?? "OK"}
        fieldSeverityMap={fieldSeverityMap}
			/>
		  ))}

		  {/* Preview toggle */}
		  <div className="pt-4 border-t">
			<div className="flex items-center justify-between">
			  <div className="text-sm font-semibold text-gray-900">Document Preview</div>
			  <button
				type="button"
				className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50"
				onClick={() => setIsPreviewOpen((v) => !v)}
			  >
				{isPreviewOpen ? "Hide preview" : "Open preview"}
			  </button>
			</div>

			{isPreviewOpen && (
			  <div className="mt-4 rounded-xl border bg-white shadow-sm p-4">
				<DocumentPreview
				  projectTitle={
					step1Inputs?.title || step1Inputs?.projectTitle || step1Inputs?.topic || ""
				  }
				  sections={BC01_SECTION_ORDER.map((sid) => BC01_SECTION_MAP[sid]).filter(Boolean)}
				  formData={formData}
				  engineOutput={engineOutput}
				/>
			  </div>
			)}
		  </div>
		</div>
      </div>

      {/* ── Issues Drawer ── */}
      <IssuesDrawer
        open={issuesDrawerOpen}
        onOpenChange={setIssuesDrawerOpen}
        issues={metaRemappedResults}
        getSectionMeta={getSectionMeta}
        onJumpToSection={handleJumpToSection}
      />
    </div>
  );
}