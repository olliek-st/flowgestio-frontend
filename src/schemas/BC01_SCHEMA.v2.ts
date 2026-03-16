// src/schemas/BC01_SCHEMA.v2.ts
// FlowGestio — BC-01 (TBS-aligned)
// Key rules implemented:
// - Executive Summary unnumbered and first.
// - Major headings use I / II / III (no "Phase").
// - Container headings have NO textarea (hasContent:false, fields:[]).
// - Subsections contain the editable textarea.
// - Full TBS structure restored for sections 1–5.

export type BC01Field = {
  id?: string;   // optional stable id for keying (used by screening_gate sentinel)
  key: string;
  type: "text" | "textarea" | "toggle";
  label: string;
  placeholder?: string;
  derivedFrom?: string;

  // v3-compatible optional metadata (ignored by legacy UI unless implemented)
  helpText?: string;
  defaultValue?: any;
  uiType?: string; // e.g. "select", "json_editor", "rubric_editor", "screening_gate"
  options?: string[]; // for uiType="select"
  validationHint?: string;
};


// ===== SECTION 2.3 — Screening (Deal Breaker Gate) =====
// Single source of truth: engine types. Schema re-exports to avoid duplication.
// If the path alias differs in your tsconfig, adjust accordingly.
// Import for internal use (type annotations within this file):
import type { S2_3_SCREENING } from "../engine/bc01/s2_3/screeningTypes";
export type {
  ScreeningResult,
  ScreeningVerdict,
  ScreeningCriterionDecision,
  ScreeningOptionDecision,
  S2_3_SCREENING,
} from "../engine/bc01/s2_3/screeningTypes";

// NOTE: ScreeningCriterionDecision from engine uses field "id" (same as local).
// The engine type is the authoritative contract; schema only re-exports it.

export type BC01Section = {
  id: string;
  ref: string; // display numbering ("1.1.2", "I", etc). Can be "" for Executive Summary.
  title: string;
  level: number; // 1..n
  parentId?: string | null;

  hasContent: boolean; // true => shows textarea fields
  description?: string;

  // PMI lens metadata (we will wire real mapping in the next file)
  pmiPrinciples: string[];
  pmiDomains: string[];

  fields: BC01Field[];
    // v3-compatible optional metadata (safe to ignore)
  prerequisites?: Array<{ sectionId: string; fieldKey?: string; equals?: any; mustBeTruthy?: boolean; message?: string }>;
  aiBehavior?: {
    mode: "draft" | "explain_scores" | "explain_only" | "calculated";
    inputs?: string[];
    forbidden?: string[];
    notes?: string;
  };
  autoCalculated?: boolean;
  deprecated?: boolean;
  hidden?: boolean;
};

// One default editable field
const NARRATIVE: BC01Field = {
  key: "narrative",
  type: "textarea",
  label: "",
  placeholder: "Write here…",
};

// ===========================================================================
// v3 Decision Engine Defaults (backward-compatible)
// ===========================================================================
export const EVALUATION_PROFILES = {
  balanced: {
    name: "Balanced (TBS Default)",
    description: "Standard approach balancing financial prudence with strategic value",
    weights: { financial: 0.5, strategic: 0.3, feasibility: 0.2 },
    recommendedFor: "General business cases, standard investments",
  },
  transformation: {
    name: "Transformation",
    description: "Emphasizes strategic alignment and organizational change",
    weights: { financial: 0.35, strategic: 0.45, feasibility: 0.2 },
    recommendedFor: "Digital transformation, major capability builds",
  },
  efficiency: {
    name: "Efficiency / Cost Reduction",
    description: "Prioritizes financial returns and cost savings",
    weights: { financial: 0.6, strategic: 0.2, feasibility: 0.2 },
    recommendedFor: "Operational improvements, cost optimization",
  },
  compliance: {
    name: "Mandatory / Compliance",
    description: "Focuses on feasibility and risk mitigation for required initiatives",
    weights: { financial: 0.2, strategic: 0.3, feasibility: 0.5 },
    recommendedFor: "Regulatory compliance, policy mandates, risk remediation",
  },
} as const;

export const DEFAULT_STRATEGIC_CRITERIA = [
  {
    id: "strategic_fit",
    name: "Strategic Alignment",
    description: "Alignment with organizational strategic priorities and business outcomes",
    sourceSection: "1.2",
    referenceSections: ["1.1.4", "1.2"],
    weight: 0.4,
    requiresJustificationAbove: 3,
    minJustificationLength: 100,
  },
  {
    id: "business_need",
    name: "Business Need Strength",
    description: "Urgency and evidence supporting the business need",
    sourceSection: "1.3",
    referenceSections: ["1.3.1", "1.3.2", "1.3.3"],
    weight: 0.3,
    requiresJustificationAbove: 3,
    minJustificationLength: 100,
  },
  {
    id: "stakeholder_impact",
    name: "Stakeholder Value",
    description: "Positive impact on priority stakeholders and their needs",
    sourceSection: "1.4.2",
    referenceSections: ["1.4.2"],
    weight: 0.3,
    requiresJustificationAbove: 3,
    minJustificationLength: 100,
  },
] as const;

export const DEFAULT_FEASIBILITY_CRITERIA = [
  {
    id: "implementation_complexity",
    name: "Implementation Complexity",
    description: "Technical and organizational complexity of delivery",
    sourceSection: "3.4",
    referenceSections: ["1.4.1"],
    weight: 0.4,
    requiresJustificationAbove: 3,
    minJustificationLength: 75,
  },
  {
    id: "risk_profile",
    name: "Risk Profile",
    description: "Overall risk level considering likelihood and impact",
    sourceSection: "3.5",
    referenceSections: ["3.5"],
    weight: 0.35,
    requiresJustificationAbove: 3,
    minJustificationLength: 75,
  },
  {
    id: "policy_compliance",
    name: "Policy & Standards Compliance",
    description: "Adherence to mandatory policies, standards, and regulations",
    sourceSection: "3.7",
    referenceSections: ["3.7"],
    weight: 0.25,
    requiresJustificationAbove: 3,
    minJustificationLength: 75,
    complianceMode: "tiered" as "tiered" | "binary" | "rubric",
  },
] as const;

const DEFAULT_STRATEGIC_CRITERIA_JSON = JSON.stringify(DEFAULT_STRATEGIC_CRITERIA, null, 2);
const DEFAULT_FEASIBILITY_CRITERIA_JSON = JSON.stringify(DEFAULT_FEASIBILITY_CRITERIA, null, 2);

// Helpers
const C = (partial: Omit<BC01Section, "pmiPrinciples" | "pmiDomains" | "fields">): BC01Section => ({
  ...partial,
  pmiPrinciples: [],
  pmiDomains: [],
  fields: [],
});

const E = (
  partial: Omit<BC01Section, "pmiPrinciples" | "pmiDomains" | "fields" | "hasContent"> & {
    fields?: BC01Field[];
  }
): BC01Section => ({
  ...partial,
  hasContent: true,
  pmiPrinciples: [],
  pmiDomains: [],
  fields: partial.fields && partial.fields.length ? partial.fields : [NARRATIVE],
});

export const BC01_SECTIONS: BC01Section[] = [
  // =========================================================
  // Executive Summary (UNNUMBERED)
  // =========================================================
  E({
    id: "S1_EXEC_SUMMARY",
    ref: "",
    title: "Executive Summary",
    level: 1,
    parentId: null,
    description:
      "Summarize the investment rationale, preferred option, expected benefits, costs, risks, and implementation approach in a decision-ready format.",
  }),

  // =========================================================
  // I. Strategic Context
  // =========================================================
  C({
    id: "H_I",
    ref: "I",
    title: "Strategic Context",
    level: 1,
    parentId: null,
    hasContent: false,
    description: "",
  }),

  // 1. Business Needs and Desired Outcomes (editable)
  E({
    id: "S1_0_BUS_NEEDS",
    ref: "1",
    title: "Business Needs and Desired Outcomes",
    level: 2,
    parentId: "H_I",
    description: "Define the business need and the intended outcomes.",
  }),

  // 1.1 Strategic Environment (container)
  C({
    id: "S1_1_STRATEGIC_ENV",
    ref: "1.1",
    title: "Strategic Environment",
    level: 3,
    parentId: "S1_0_BUS_NEEDS",
    hasContent: false,
    description: "Describe the current environment that frames the investment.",
  }),

  // 1.1.1 Organizational Overview (editable)
  E({
    id: "S1_1_1_ORG_OVERVIEW",
    ref: "1.1.1",
    title: "Organizational Overview",
    level: 4,
    parentId: "S1_1_STRATEGIC_ENV",
    description:
      "Describe the sponsoring organization’s mission, goals, services, structure, and existing capacity (high level).",
  }),

  // 1.1.2 Business Need (editable)
  E({
    id: "S1_1_2_BUSINESS_NEED",
    ref: "1.1.2",
    title: "Business Need",
    level: 4,
    parentId: "S1_1_STRATEGIC_ENV",
    description:
      "Provide a clear, well-structured statement of the problem/opportunity (typically 1–2 sentences).",
  }),

  // 1.1.3 Drivers for Change (editable)
  E({
    id: "S1_1_3_DRIVERS",
    ref: "1.1.3",
    title: "Drivers for Change",
    level: 4,
    parentId: "S1_1_STRATEGIC_ENV",
    description:
      "Identify internal and external drivers that triggered the proposal and link them clearly to the business need.",
  }),

  // 1.1.4 Business Outcomes (editable)
  E({
    id: "S1_1_4_OUTCOMES",
    ref: "1.1.4",
    title: "Business Outcomes",
    level: 4,
    parentId: "S1_1_STRATEGIC_ENV",
    description:
      "Describe the expected business outcomes at a high level (the result/benefit expected at the end of the intervention/change).",
  }),

  // 1.2 Strategic Fit (editable)
  E({
    id: "S1_2_STRATEGIC_FIT",
    ref: "1.2",
    title: "Strategic Fit",
    level: 3,
    parentId: "S1_0_BUS_NEEDS",
    description:
      "Explain how the investment aligns with current plans, priorities, programs, and strategic outcomes (as applicable).",
  }),

  // 1.3 Detailed Description of the Business Need (container)
  C({
    id: "S1_3_DETAILED_NEED",
    ref: "1.3",
    title: "Detailed Description of the Business Need",
    level: 3,
    parentId: "S1_0_BUS_NEEDS",
    hasContent: false,
    description:
      "Provide detail on the problem/opportunity and the elements that shape the business need.",
  }),

  // 1.3.1 Problem/Opportunity Statement (editable)
  E({
    id: "S1_3_1_PROBLEM",
    ref: "1.3.1",
    title: "Problem/Opportunity Statement",
    level: 4,
    parentId: "S1_3_DETAILED_NEED",
    description:
      "Reiterate the business need statement and expand with supporting elements that make the need clear and compelling.",
  }),

  // 1.3.2 Prioritized Requirements (High Level) (editable)
  E({
    id: "S1_3_2_REQS",
    ref: "1.3.2",
    title: "Prioritized Requirements (High Level)",
    level: 4,
    parentId: "S1_3_DETAILED_NEED",
    description:
      "Specify the key requirements to address the need at an appropriate level of detail to enable option comparison.",
  }),

  // 1.3.3 Assumptions (editable)
  E({
    id: "S1_3_3_ASSUMPTIONS",
    ref: "1.3.3",
    title: "Assumptions",
    level: 4,
    parentId: "S1_3_DETAILED_NEED",
    description:
      "List and describe assumptions and the potential impact if assumptions are not met.",
  }),

  // 1.3.4 Constraints (editable)
  E({
    id: "S1_3_4_CONSTRAINTS",
    ref: "1.3.4",
    title: "Constraints",
    level: 4,
    parentId: "S1_3_DETAILED_NEED",
    description:
      "List constraints that place limits or conditions on the investment (internal or external factors).",
  }),

  // 1.3.5 Dependencies (editable)
  E({
    id: "S1_3_5_DEPENDENCIES",
    ref: "1.3.5",
    title: "Dependencies",
    level: 4,
    parentId: "S1_3_DETAILED_NEED",
    description:
      "Identify dependencies related to the overall business need, requirements, or solution.",
  }),

  // 1.4 Scope (container)
  C({
    id: "S1_4_SCOPE",
    ref: "1.4",
    title: "Scope",
    level: 3,
    parentId: "S1_0_BUS_NEEDS",
    hasContent: false,
    description: "Define boundaries and stakeholder scope considerations.",
  }),

  // 1.4.1 Boundaries (container)
  C({
    id: "S1_4_1_BOUNDARIES",
    ref: "1.4.1",
    title: "Boundaries",
    level: 4,
    parentId: "S1_4_SCOPE",
    hasContent: false,
    description: "Clarify what is in-scope and out-of-scope.",
  }),

  // In-Scope (editable)
  E({
    id: "S1_4_1A_IN_SCOPE",
    ref: "•",
    title: "In-Scope",
    level: 5,
    parentId: "S1_4_1_BOUNDARIES",
    description: "What the investment will include and deliver.",
  }),

  // Out-of-Scope (editable)
  E({
    id: "S1_4_1B_OUT_SCOPE",
    ref: "•",
    title: "Out-of-Scope",
    level: 5,
    parentId: "S1_4_1_BOUNDARIES",
    description: "What is explicitly excluded to avoid misunderstanding and scope creep.",
  }),

  // 1.4.2 Stakeholder Analysis (editable)
  E({
    id: "S1_4_2_STAKEHOLDERS",
    ref: "1.4.2",
    title: "Stakeholder Analysis",
    level: 4,
    parentId: "S1_4_SCOPE",
    description: "Identify key stakeholders and summarize their interests/influence.",
  }),

  // =========================================================
  // II. Analysis and Recommendation
  // =========================================================
  C({
    id: "H_II",
    ref: "II",
    title: "Analysis and Recommendation",
    level: 1,
    parentId: null,
    hasContent: false,
    description: "",
  }),

  // 2. Preliminary Options Analysis (container)
  C({
    id: "S2_0_PRELIM_OPTIONS",
    ref: "2",
    title: "Preliminary Options Analysis",
    level: 2,
    parentId: "H_II",
    hasContent: false,
    description:
      "Screen a comprehensive list of options and narrow alternatives to a reasonable number of viable options.",
  }),

  // 2.1 Evaluation Criteria (editable)
  // 2.1 Evaluation Criteria (ENHANCED v3, backward-compatible fields)
E({
  id: "S2_1_EVAL_CRITERIA",
  ref: "2.1",
  title: "Evaluation Criteria & Methodology",
  level: 3,
  parentId: "S2_0_PRELIM_OPTIONS",
  description:
    "Define decision parameters, evaluation profile/weights, criteria, and methodology governance (lock + audit-ready AI pipeline).",
  fields: [
    // -------------------------
    // Decision parameters (user-visible, compact later)
    // -------------------------
    { key: "discountRate", type: "text", label: "Discount rate (e.g., 0.05)", defaultValue: "0.05", helpText: "Used for NPV calculations.", uiType: "number" },
    { key: "timeHorizonYears", type: "text", label: "Time horizon (years)", defaultValue: "5", helpText: "Number of years for financial analysis.", uiType: "integer" },
    { key: "inflationRate", type: "text", label: "Inflation rate (optional)", defaultValue: "", helpText: "Leave blank for constant dollars.", uiType: "number_optional" },
    { key: "currencyUnit", type: "text", label: "Currency", defaultValue: "CAD", uiType: "select", options: ["CAD","USD","EUR","GBP"] },

    // -------------------------
    // Profile + weights (keep keys aligned with engine)
    // -------------------------
    { key: "profileType", type: "text", label: "Evaluation profile", defaultValue: "balanced", uiType: "select", options: ["balanced","transformation","efficiency","compliance"] },
    { key: "weight_financial", type: "text", label: "Weight: Financial (0-1)", defaultValue: "0.50", uiType: "weight" },
    { key: "weight_strategic", type: "text", label: "Weight: Strategic (0-1)", defaultValue: "0.30", uiType: "weight" },
    { key: "weight_feasibility", type: "text", label: "Weight: Feasibility (0-1)", defaultValue: "0.20", uiType: "weight", validationHint: "Weights should sum to 1.0." },

    // -------------------------
    // Governance lock (toggle)
    // -------------------------
    { key: "methodologyLocked", type: "toggle", label: "Lock methodology", defaultValue: false, helpText: "When locked, weights/criteria should not be edited." },

    // =========================================================
    // S2.1B — Screening Gate Criteria (Level 5 — single source of truth for S2.3)
    //
    // Rendered by ScreeningGateCriteriaTable (uiType: "screening_gate_table").
    // Data key = screeningGateCriteriaJson (ScreeningCriterion[] serialized).
    // Parsed by parseCriteriaFromS2_1 → S2.2 evidence capture + S2.3 gate engine.
    // Fallback to DEFAULT_GATE_CRITERIA when empty.
    //
    // S3 scoring criteria (with weights) are defined separately below.
    // NEVER merge these two concepts.
    // =========================================================
    {
      key: "screeningGateCriteriaJson",
      type: "textarea" as const,
      label: "Screening Gate Criteria",
      uiType: "screening_gate_table" as const,
      defaultValue: "",
      helpText:
        "ScreeningCriterion[] — machine-readable gate criteria. " +
        "Edit via the table above. Parsed by parseCriteriaFromS2_1. " +
        "Fallback: DEFAULT_GATE_CRITERIA (TBS 6-criterion set).",
    },

    // =========================================================
    // ✅ Non-tech friendly criteria input (VISIBLE — S3 scoring weights)
    // =========================================================
    {
      key: "strategicCriteriaNarrative",
      type: "textarea",
      label: "Strategic criteria (describe in plain language)",
      placeholder: "Example: Strategic alignment (40%), Business need strength (30%), Stakeholder value (30%)...",
      helpText: "Write criteria names + approximate weights in plain language. Then click Convert to JSON."
    },
    {
      key: "feasibilityCriteriaNarrative",
      type: "textarea",
      label: "Feasibility criteria (describe in plain language)",
      placeholder: "Example: Implementation complexity (40%), Risk profile (35%), Policy compliance (25%)...",
      helpText: "Write criteria names + approximate weights in plain language. Then click Convert to JSON."
    },

    // =========================================================
    // ✅ Machine-only JSON (HIDDEN)
    // Engine reads these.
    // =========================================================
    { key: "strategicCriteriaJson", type: "textarea", label: "Strategic criteria JSON (internal)", defaultValue: DEFAULT_STRATEGIC_CRITERIA_JSON, uiType: "hidden" },
    { key: "feasibilityCriteriaJson", type: "textarea", label: "Feasibility criteria JSON (internal)", defaultValue: DEFAULT_FEASIBILITY_CRITERIA_JSON, uiType: "hidden" },

    // Backups for audit trail (overwrite behavior + backup)
    { key: "strategicCriteriaJsonBackup", type: "textarea", label: "Strategic JSON backup (internal)", defaultValue: "", uiType: "hidden" },
    { key: "feasibilityCriteriaJsonBackup", type: "textarea", label: "Feasibility JSON backup (internal)", defaultValue: "", uiType: "hidden" },
    { key: "criteriaConvertedAt", type: "text", label: "Criteria converted timestamp (internal)", defaultValue: "", uiType: "hidden" },

    // =========================================================
    // Methodology narrative (VISIBLE + editable)
    // =========================================================
    { key: "methodologyNarrative", type: "textarea", label: "Methodology narrative (AI may draft)", helpText: "AI-generated text is editable by the user." },

    // Meta fields for pipeline/audit
    { key: "methodologyInputsHash", type: "text", label: "Methodology inputs hash (internal)", defaultValue: "", uiType: "hidden" },
    { key: "methodologyNarrativeSource", type: "text", label: "Methodology source (internal)", defaultValue: "", uiType: "hidden" }, // "ai" | "user"
    { key: "methodologyNarrativeEdited", type: "text", label: "Methodology edited flag (internal)", defaultValue: "false", uiType: "hidden" },
    { key: "methodologyNarrativeEditedAt", type: "text", label: "Methodology edited timestamp (internal)", defaultValue: "", uiType: "hidden" },
  ],

  aiBehavior: {
    mode: "draft",
    // ✅ pipeline-locked: IA can draft methodology only; conversion is separate (button)
    inputs: [
      "discountRate",
      "timeHorizonYears",
      "inflationRate",
      "currencyUnit",
      "profileType",
      "weight_financial",
      "weight_strategic",
      "weight_feasibility",
      "strategicCriteriaJson",
      "feasibilityCriteriaJson",
      "methodologyLocked"
    ],
    forbidden: [
      "change_scores",
      "change_weights_after_lock",
      "invent_criteria",
      "change_discountRate",
      "change_timeHorizonYears",
      "change_currency"
    ],
    notes:
      "AI drafts methodology narrative using EXACT parameters + criteria names/weights from JSON. Criteria conversion (Narrative → JSON) is user-triggered via a button and overwrites JSON with audit backup."
  },
}),



  // 2.2 List the Possible Options (container)
  C({
    id: "S2_2_LIST_OPTIONS",
    ref: "2.2",
    title: "List the Possible Options",
    level: 3,
    parentId: "S2_0_PRELIM_OPTIONS",
    hasContent: false,
    description:
      "Identify, describe, and explore possible options that can address the business need.",
  }),

  // 2.3 Screening of Options (Deal Breaker Gate — engine: s2_3)
  E({
    id: "S2_3_SCREENING",
    ref: "2.3",
    title: "Screening of Options",
    level: 3,
    parentId: "S2_0_PRELIM_OPTIONS",
    description:
      "Assess how well each option meets the screening criteria (Yes/No deal-breakers) and determine which options should be discounted. Options failing any mandatory criterion are DISCOUNTED; the Baseline is always BASELINE; remaining options are VIABLE.",
    fields: [
      // Sentinel field: triggers ScreeningGateTable renderer in SectionCard dispatch.
      // uiType "screening_gate" is checked FIRST — the section renders as a full
      // interactive gate UI (ScreeningGateTable) instead of plain FieldRenderer fields.
      {
        id: "screeningGate",
        key: "screeningGate",
        type: "text" as const,
        label: "Screening Gate",
        uiType: "screening_gate",
      },
      // screeningNarrative is hidden here because ScreeningGateTable renders it
      // internally as part of the gate UI (narrative textarea + confirm button).
      // It is still persisted inside the S2_3_SCREENING structured blob.
      {
        key: "screeningNarrative",
        type: "textarea" as const,
        label: "Screening narrative (AI may draft)",
        placeholder: "Summarize the screening process, criteria applied, and verdicts per option…",
        helpText: "AI-generated text is editable by the user. Stored inside the S2_3_SCREENING structured blob.",
        uiType: "hidden",
      },
    ],
    // ⚠️ No prerequisites here: the S2_2 options are managed by AlternativesManager
    // and persisted outside BC01_SECTIONS. The engine (s2_3) performs its own
    // runtime guard before allowing screening to proceed.
    aiBehavior: {
      mode: "draft",
      // "S2_2_LIST_OPTIONS.alternatives" = real options array (AlternativesManager).
      // "S2_3_SCREENING.decisions" = computed Yes/No verdicts from engine s2_3.
      inputs: ["S2_2_LIST_OPTIONS.alternatives", "S2_3_SCREENING.decisions", "S2_1_EVAL_CRITERIA"],
      forbidden: ["introduce_new_scores", "change_weights", "invent_numbers", "alter_verdicts"],
      notes:
        "Engine s2_3 drives Yes/No decisions and computedVerdict. AI reads S2_3_SCREENING.decisions (already computed) and drafts screeningNarrative explaining each option's verdict. Do NOT alter decisions or verdicts.",
    },
  }),

  // 2.4 Rationale for Discounted and Viable Options (editable)
  E({
    id: "S2_4_RATIONALE",
    ref: "2.4",
    title: "Rationale for Discounted and Viable Options",
    level: 3,
    parentId: "S2_0_PRELIM_OPTIONS",
    description:
      "Explain why options were retained or discarded based on screening and provide key reasons for the decision.",
  }),

  // 3. Viable Options (container)
  C({
    id: "S3_0_VIABLE_OPTIONS",
    ref: "3",
    title: "Viable Options",
    level: 2,
    parentId: "H_II",
    hasContent: false,
    description: "Present the shortlisted viable options and analyze them in depth.",
  }),
  
  // 3.0 Options Data Entry (NEW v3, backward-compatible)
E({
  id: "S3_0_OPTIONS_DATA",
  ref: "3.0",
  title: "Options Data Entry",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  description:
    "Enter per-option financial inputs and rubric-based qualitative scores. This is the ONLY place where options are scored.",
  prerequisites: [
    {
      sectionId: "S2_1_EVAL_CRITERIA",
      fieldKey: "methodologyLocked",
      equals: true, // boolean — matches defaultValue:false toggle type
      message: "Lock Section 2.1 methodology before scoring options (audit integrity).",
    },
  ],
  fields: [
    {
      key: "optionsJson",
      type: "textarea",
      label: "Options (JSON array)",
      uiType: "json_editor",
      helpText:
        "Array of options: optionId, name, description, financialInputs, qualitativeScores (strategic+feasibility), justifications for scores>=4.",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "optionsJson"],
    forbidden: ["introduce_new_options","introduce_new_scores","change_weights"],
  },
}),

 // 3.1 Alignment (container)
C({
  id: "S3_1_ALIGNMENT",
  ref: "3.1",
  title: "Alignment",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  hasContent: false,
  description: "",
  aiBehavior: {
    mode: "explain_only",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes: "Container only; detailed explanations live in child sections (3.1.1, 3.1.2).",
  },
}),

// 3.1.1 Strategic Alignment (editable)
E({
  id: "S3_1_1_STRAT_ALIGN",
  ref: "3.1.1",
  title: "Strategic Alignment",
  level: 4,
  parentId: "S3_1_ALIGNMENT",
  description:
    "Describe how the option supports the organization’s business architecture and planned results/outcomes (as applicable).",
  fields: [
    {
      ...NARRATIVE,
      key: "strategicAlignmentNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate strategicAlignmentNarrative by explaining strategic rubric scores using Section 1 evidence. Do NOT rescore options.",
  },
}),

// 3.1.2 Alignment with Desired Business Outcomes (editable)
E({
  id: "S3_1_2_ALIGN_OUTCOMES",
  ref: "3.1.2",
  title: "Alignment with Desired Business Outcomes",
  level: 4,
  parentId: "S3_1_ALIGNMENT",
  description:
    "Summarize how each viable option contributes to the desired business outcomes (tables are often useful).",
  fields: [
    {
      ...NARRATIVE,
      key: "alignmentOutcomesNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate alignmentOutcomesNarrative by explaining outcome alignment per option and how it supports recorded strategic scores. Do NOT add new scores.",
  },
}),

// 3.2 Costs (editable)
E({
  id: "S3_2_COSTS",
  ref: "3.2",
  title: "Costs",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  description:
    "Provide a complete description of costs using total cost of ownership (including ongoing and compliance costs where applicable).",
  fields: [
    {
      ...NARRATIVE,
      key: "costsNarrative",
    },
  ],
  autoCalculated: true,
  aiBehavior: {
    mode: "calculated",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["invent_numbers", "change_weights", "introduce_new_options"],
    notes:
      "Populate costsNarrative using ONLY options financialInputs and calculated outputs (e.g., TCO). AI explains cost drivers and differences; it does not invent amounts.",
  },
}),

// 3.3 Cost-Benefit Analysis (editable)
E({
  id: "S3_3_CBA",
  ref: "3.3",
  title: "Cost-Benefit Analysis",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  description:
    "Describe how costs are weighed against benefits and conduct cost-benefit analysis for each option considering costs, benefits, and risks.",
  fields: [
    {
      ...NARRATIVE,
      key: "financialAnalysisNarrative",
    },
  ],
  autoCalculated: true,
  aiBehavior: {
    mode: "calculated",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["invent_numbers", "change_weights", "introduce_new_scores"],
    notes:
      "Populate financialAnalysisNarrative using calculated ROI/NPV/Payback and the derived financial score. AI explains; it does not alter scores or weights.",
  },
}),

// 3.4 Implementation and Capacity Considerations of Viable Options (container)
C({
  id: "S3_4_IMPL_CAP",
  ref: "3.4",
  title: "Implementation and Capacity Considerations of Viable Options",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  hasContent: false,
  description:
    "Demonstrate the organization’s ability to deliver and manage the investment throughout its life span.",
  aiBehavior: {
    mode: "explain_only",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights"],
    notes: "Container only; detailed feasibility explanations live in child sections (3.4.1–3.4.4).",
  },
}),

// 3.4.1 Contracting and Procurement (editable)
E({
  id: "S3_4_1_PROC",
  ref: "3.4.1",
  title: "Contracting and Procurement",
  level: 4,
  parentId: "S3_4_IMPL_CAP",
  description: "Summarize procurement approach and contracting considerations for each option.",
  fields: [
    {
      ...NARRATIVE,
      key: "procurementNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate procurementNarrative explaining procurement/contracting considerations per option and how they support feasibility scoring (e.g., implementation_complexity). Do NOT rescore.",
  },
}),

// 3.4.2 Schedule and Approach (editable)
E({
  id: "S3_4_2_SCHEDULE",
  ref: "3.4.2",
  title: "Schedule and Approach",
  level: 4,
  parentId: "S3_4_IMPL_CAP",
  description: "Describe delivery approach, high-level timeline, and key milestones.",
  fields: [
    {
      ...NARRATIVE,
      key: "scheduleApproachNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate scheduleApproachNarrative describing approach/timeline per option and linking to feasibility scoring rationale. Do NOT rescore.",
  },
}),

// 3.4.3 Impact (editable)
E({
  id: "S3_4_3_IMPACT",
  ref: "3.4.3",
  title: "Impact",
  level: 4,
  parentId: "S3_4_IMPL_CAP",
  description: "Describe operational impacts, service impacts, and transition impacts for each option.",
  fields: [
    {
      ...NARRATIVE,
      key: "implementationImpactNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate implementationImpactNarrative describing impacts per option and how they relate to feasibility/capacity considerations. Do NOT rescore.",
  },
}),

// 3.4.4 Capacity (editable)
E({
  id: "S3_4_4_CAPACITY",
  ref: "3.4.4",
  title: "Capacity",
  level: 4,
  parentId: "S3_4_IMPL_CAP",
  description: "Describe organizational capacity (people, skills, systems) needed to implement and sustain each option.",
  fields: [
    {
      ...NARRATIVE,
      key: "capacityNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate capacityNarrative explaining capacity needs and constraints per option and how they justify feasibility scoring. Do NOT rescore.",
  },
}),

// 3.5 Risk (container)
C({
  id: "S3_5_RISK",
  ref: "3.5",
  title: "Risk",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  hasContent: false,
  description: "",
  aiBehavior: {
    mode: "explain_only",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights"],
    notes: "Container only; risk narrative and register live in child sections (3.5.1–3.5.2).",
  },
}),

// 3.5.1 Option Risk Summary (editable)
E({
  id: "S3_5_1_RISK_SUMMARY",
  ref: "3.5.1",
  title: "Option Risk Summary",
  level: 4,
  parentId: "S3_5_RISK",
  description: "Summarize key risks by option and overall risk profile.",
  fields: [
    {
      ...NARRATIVE,
      key: "riskSummaryNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate riskSummaryNarrative summarizing key risks per option and linking to risk-related feasibility scores (e.g., risk_profile). Do NOT rescore.",
  },
}),

// 3.5.2 Risk Register (editable)
E({
  id: "S3_5_2_RISK_REGISTER",
  ref: "3.5.2",
  title: "Risk Register",
  level: 4,
  parentId: "S3_5_RISK",
  description: "Provide (or summarize) a risk register including probability/impact and mitigation actions.",
  fields: [
    {
      ...NARRATIVE,
      key: "riskRegisterNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate riskRegisterNarrative with a structured risk register per option (probability/impact/mitigation). Ensure consistency with existing rubric scores; do NOT rescore.",
  },
}),

// 3.6 Benchmark (editable)
E({
  id: "S3_6_BENCHMARK",
  ref: "3.6",
  title: "Benchmark",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  description: "Provide relevant benchmarking data and comparisons that inform the decision.",
  fields: [
    {
      ...NARRATIVE,
      key: "benchmarkNarrative",
    },
  ],
  autoCalculated: true,
  aiBehavior: {
    mode: "calculated",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["invent_numbers", "introduce_new_scores", "change_weights"],
    notes:
      "Populate benchmarkNarrative using available metrics and deterministic benchmarking rules. AI explains relevance and implications only.",
  },
}),

// 3.7 Policy and Standard Considerations (editable)
E({
  id: "S3_7_POLICY",
  ref: "3.7",
  title: "Policy and Standard Considerations",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  description: "Describe applicable policies/standards and how each option aligns with them.",
  fields: [
    {
      ...NARRATIVE,
      key: "policyStandardsNarrative",
    },
  ],
  aiBehavior: {
    mode: "explain_scores",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate policyStandardsNarrative describing applicable policies/standards and each option’s compliance. If tiered/binary, highlight NON_COMPLIANT cases and decision impact; do NOT rescore.",
  },
}),

// 3.8 Advantages and Disadvantages (editable)
E({
  id: "S3_8_PROS_CONS",
  ref: "3.8",
  title: "Advantages and Disadvantages",
  level: 3,
  parentId: "S3_0_VIABLE_OPTIONS",
  description: "Summarize key advantages and disadvantages for each viable option.",
  fields: [
    {
      ...NARRATIVE,
      key: "comparativeSummary",
    },
  ],
  aiBehavior: {
    mode: "explain_only",
    inputs: ["S2_1_EVAL_CRITERIA", "S3_0_OPTIONS_DATA"],
    forbidden: ["introduce_new_scores", "change_weights", "invent_numbers"],
    notes:
      "Populate comparativeSummary with pros/cons per option and explain rank deltas based on existing scores and calculated metrics only.",
  },
}),


  // 4. Justification and Recommendation (container)
  C({
    id: "S4_0_JUSTIFICATION",
    ref: "4",
    title: "Justification and Recommendation",
    level: 2,
    parentId: "H_II",
    hasContent: false,
    description: "",
  }),

  // 4.1 Comparison Summary (editable)
  E({
    id: "S4_1_COMPARISON",
    ref: "4.1",
    title: "Comparison Summary",
    level: 3,
    parentId: "S4_0_JUSTIFICATION",
    description:
      "Compare viable options against a standardized set of criteria (financial and non-financial). Tables are often useful.",
  }),

  // 4.2 The Preferred Option (container)
  C({
    id: "S4_2_PREFERRED",
    ref: "4.2",
    title: "The Preferred Option",
    level: 3,
    parentId: "S4_0_JUSTIFICATION",
    hasContent: false,
    description: "",
  }),

  // 4.2.1 Recommendation (editable)
  E({
    id: "S4_2_1_RECOMMENDATION",
    ref: "4.2.1",
    title: "Recommendation",
    level: 4,
    parentId: "S4_2_PREFERRED",
    description:
      "Present the recommendation in a straightforward manner, clearly stating why the organization should focus on this option.",
  }),

  // 4.2.2 Deciding Factors (editable)
  E({
    id: "S4_2_2_FACTORS",
    ref: "4.2.2",
    title: "Deciding Factors",
    level: 4,
    parentId: "S4_2_PREFERRED",
    description: "Identify the deciding factors (financial and strategic) for selecting the preferred option.",
  }),

  // 4.2.3 Costs (editable)
  E({
    id: "S4_2_3_COSTS",
    ref: "4.2.3",
    title: "Costs",
    level: 4,
    parentId: "S4_2_PREFERRED",
    description:
      "Summarize cost estimates for the preferred option and link them to work streams/components where applicable.",
  }),

  // 4.2.4 Risks (editable)
  E({
    id: "S4_2_4_RISKS",
    ref: "4.2.4",
    title: "Risks",
    level: 4,
    parentId: "S4_2_PREFERRED",
    description:
      "Explain why identified risks are acceptable and contextualize impact, probability, outcomes, and mitigation.",
  }),

  // 4.2.5 Implementation Plan (editable)
  E({
    id: "S4_2_5_IMPL_PLAN",
    ref: "4.2.5",
    title: "Implementation Plan",
    level: 4,
    parentId: "S4_2_PREFERRED",
    description:
      "Outline how the project will be implemented and demonstrate appropriate thought and acceptable accuracy of estimates.",
  }),

  // =========================================================
  // III. Management and Capacity
  // =========================================================
  C({
    id: "H_III",
    ref: "III",
    title: "Management and Capacity",
    level: 1,
    parentId: null,
    hasContent: false,
    description: "",
  }),

  // 5. Managing the Investment (container)
  C({
    id: "S5_0_MANAGING",
    ref: "5",
    title: "Managing the Investment",
    level: 2,
    parentId: "H_III",
    hasContent: false,
    description: "",
  }),

  // 5.1 Governance and Oversight (editable)
  E({
    id: "S5_1_GOV_OVERSIGHT",
    ref: "5.1",
    title: "Governance and Oversight",
    level: 3,
    parentId: "S5_0_MANAGING",
    description: "Describe governance structure, oversight mechanisms, and decision rights.",
  }),

  // 5.2 Project Management Strategy (container)
  C({
    id: "S5_2_PM_STRATEGY",
    ref: "5.2",
    title: "Project Management Strategy",
    level: 3,
    parentId: "S5_0_MANAGING",
    hasContent: false,
    description: "",
  }),

  // 5.2.1 Project Review Strategy (editable)
  E({
    id: "S5_2_1_REVIEW",
    ref: "5.2.1",
    title: "Project Review Strategy",
    level: 4,
    parentId: "S5_2_PM_STRATEGY",
    description: "Describe review cadence, gating, and how progress/decisions will be governed.",
  }),

  // 5.3 Outcome Management Strategy (editable)
  E({
    id: "S5_3_OUTCOME_MGMT",
    ref: "5.3",
    title: "Outcome Management Strategy",
    level: 3,
    parentId: "S5_0_MANAGING",
    description: "Describe how benefits/outcomes will be managed, measured, and realized over time.",
  }),

  // 5.4 Risk Management Strategy (editable)
  E({
    id: "S5_4_RISK_MGMT",
    ref: "5.4",
    title: "Risk Management Strategy",
    level: 3,
    parentId: "S5_0_MANAGING",
    description: "Describe risk governance, monitoring approach, and mitigation planning.",
  }),

  // 5.5 Change Management Strategy (editable)
  E({
    id: "S5_5_CHANGE_MGMT",
    ref: "5.5",
    title: "Change Management Strategy",
    level: 3,
    parentId: "S5_0_MANAGING",
    description: "Describe how adoption will be enabled (communication, training, support, resistance management).",
  }),

  // 5.6 Performance Measurement Strategy (editable)
  E({
    id: "S5_6_MEASURE",
    ref: "5.6",
    title: "Performance Measurement Strategy",
    level: 3,
    parentId: "S5_0_MANAGING",
    description: "Define how performance will be measured during delivery and after implementation.",
  }),
];

// Quick lookup by id (Step3Generate expects this)
export const BC01_SECTION_MAP: Record<string, BC01Section> = BC01_SECTIONS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, BC01Section>
);

// Stable render order (Step3Generate expects this)
export const BC01_SECTION_ORDER: string[] = BC01_SECTIONS.map((s) => s.id);

// ===========================================================================
// BC01_FormData — top-level persisted form data contract
// ===========================================================================

/**
 * Canonical shape of persisted form data for a BC-01 business case.
 * Each key maps to a section's structured data blob.
 * Sections with only a "narrative" field use Record<string, string>.
 * Structured sections (like S2_3_SCREENING) use their typed interface.
 */
export interface BC01_FormData {
  // Free-text sections (key → field value map)
  [sectionId: string]: Record<string, string> | unknown;

  // Structured sections (typed overrides for engine consumption)
  S2_3_SCREENING?: S2_3_SCREENING;
}

// ===========================================================================
// Default values
// ===========================================================================

/** Empty/initial value for S2_3_SCREENING — safe to spread into formData. */
export const DEFAULT_S2_3_SCREENING: S2_3_SCREENING = {
  decisions: [],
  viableOptionIds: [],
  screenedAt: "",
  confirmed: false,
  screeningNarrative: "",
};

export default BC01_SECTIONS;
