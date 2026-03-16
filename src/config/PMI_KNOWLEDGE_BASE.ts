// src/config/PMI_KNOWLEDGE_BASE.ts

export type PmiKbKind = "principle" | "performanceDomain" | "practice";

export interface PmiKbEntry {
  id: string;
  kind: PmiKbKind;
  title: string;
  summary: string;
  whyItMatters?: string[];
  howToApply?: string[];
}

export const PMI_KNOWLEDGE_BASE: Record<string, PmiKbEntry> = {
  "PR-VALUE": {
    id: "PR-VALUE",
    kind: "principle",
    title: "Focus on Value",
    summary: "Align every project decision with strategic benefits and real business value.",
    whyItMatters: ["Prevents waste", "Justifies investment requirements"],
    howToApply: ["Link every feature to a concrete business gain.", "Prioritize based on outcome realization."]
  },
  "PR-STEWARDSHIP": {
    id: "PR-STEWARDSHIP",
    kind: "principle",
    title: "Stewardship",
    summary: "Act responsibly and ethically in managing resources and organizational assets.",
    howToApply: ["Ensure total transparency in cost estimation.", "Demonstrate integrity in resource allocation."]
  },
  "PD-UNCERTAINTY": {
    id: "PD-UNCERTAINTY",
    kind: "performanceDomain",
    title: "Uncertainty Domain",
    summary: "Proactive management of risks, ambiguity, and complexity.",
    howToApply: ["Define clear response strategies: Mitigate, Avoid, Transfer.", "Use contingency reserves appropriately."]
  },
  "PD-MEASUREMENT": {
    id: "PD-MEASUREMENT",
    kind: "performanceDomain",
    title: "Measurement Domain",
    summary: "Evaluating if the project is meeting its value objectives through key indicators.",
    howToApply: ["Embed measurable KPIs in the 'Outcome Realization' section.", "Set baselines before implementation."]
  },
  "PR-RISK": {
    id: "PR-RISK",
    kind: "principle",
    title: "Optimize Risk Responses",
    summary: "Proactively manage risks to maximize opportunities and minimize threats.",
    whyItMatters: ["Protects project objectives", "Enables controlled innovation"],
    howToApply: ["Identify risks early and often.", "Develop clear ownership for each risk response."]
  },
  "PR-CHANGE": {
    id: "PR-CHANGE",
    kind: "principle",
    title: "Embrace Adaptability and Resiliency",
    summary: "Adapt to changes and maintain resilience in the face of uncertainty.",
    whyItMatters: ["Ensures project continuity", "Fosters organizational agility"],
    howToApply: ["Schedule regular review points.", "Maintain a flexible implementation approach."]
  },
  "PD-PLANNING": {
    id: "PD-PLANNING",
    kind: "performanceDomain",
    title: "Planning Performance Domain",
    summary: "Organizing and coordinating project activities to achieve objectives.",
    whyItMatters: ["Aligns resources", "Optimizes timelines and dependencies"],
    howToApply: ["Decompose work (WBS) where applicable.", "Identify and document critical path dependencies."]
  },
  "PD-DELIVERY": {
    id: "PD-DELIVERY",
    kind: "performanceDomain",
    title: "Delivery Performance Domain",
    summary: "Delivering expected results and realizing promised business benefits.",
    whyItMatters: ["Materializes business value", "Satisfies key stakeholder requirements"],
    howToApply: ["Define clear acceptance criteria.", "Validate deliverables with stakeholders early."]
  },
  "PD-TEAM": {
    id: "PD-TEAM",
    kind: "performanceDomain",
    title: "Team Performance Domain",
    summary: "Developing and managing the project team to maximize collective performance.",
    whyItMatters: ["High-performing teams drive success", "Improves talent retention"],
    howToApply: ["Clarify roles and responsibilities (RACI).", "Invest in ongoing competency development."]
  },
  "PX-GOVERNANCE": {
    id: "PX-GOVERNANCE",
    kind: "practice",
    title: "Governance Structure",
    summary: "Establish a governance framework with clear roles, responsibilities, and authorities.",
    whyItMatters: ["Ensures accountability", "Facilitates rapid decision-making"],
    howToApply: ["Define decision-making authority levels.", "Establish oversight committees and reporting lines."]
  },
  "PX-EVAL-CRITERIA": {
    id: "PX-EVAL-CRITERIA",
    kind: "practice",
    title: "Evaluation Criteria",
    summary: "Define objective criteria to evaluate and compare project options.",
    whyItMatters: ["Ensures objectivity in decisions", "Process transparency"],
    howToApply: ["Weight criteria based on strategic importance.", "Use scoring matrices for option comparison."]
  },
  "PX-SCOPE-BOUNDARY": {
    id: "PX-SCOPE-BOUNDARY",
    kind: "practice",
    title: "Scope Boundaries",
    summary: "Clearly define what is included and excluded from the project scope.",
    whyItMatters: ["Prevents scope creep", "Manages stakeholder expectations"],
    howToApply: ["Explicitly list inclusions and exclusions.", "Validate scope with sponsors during the Business Case phase."]
  },
  "PX-DECISION": {
    id: "PX-DECISION",
    kind: "practice",
    title: "Decision Making",
    summary: "Structured process for making informed and justified project decisions.",
    whyItMatters: ["Improves decision quality", "Provides auditability/traceability"],
    howToApply: ["Document decision criteria and rationale.", "Involve the correct level of expertise for each decision."]
  },
  "PX-CHANGE-ENABLE": {
    id: "PX-CHANGE-ENABLE",
    kind: "practice",
    title: "Change Enablement",
    summary: "Facilitating the adoption of changes by the people affected by the project.",
    whyItMatters: ["Ensures benefit realization", "Reduces organizational resistance"],
    howToApply: ["Develop a dedicated change management plan.", "Communicate the 'Why' early and frequently."]
  }
};

// ✅ EXPORTS FOR COMPATIBILITY
export function getPmiReference(id: string): PmiKbEntry | null {
  return PMI_KNOWLEDGE_BASE[id] || null;
}

export function hasReference(id: string): boolean {
  return id in PMI_KNOWLEDGE_BASE;
}

/**
 * TBS → PMI MAPPING
 * Backward compatibility: numeric TBS IDs → string PMI IDs
 */
export const OLD_TBS_MAPPING: Record<number, string> = {
  15: "PR-VALUE",
  16: "PR-VALUE",
  17: "PR-VALUE",
  20: "PR-STEWARDSHIP",
  21: "PR-VALUE",
  23: "PD-PLANNING",
  25: "PD-MEASUREMENT",
  27: "PR-STEWARDSHIP",
  31: "PD-PLANNING",
  32: "PD-UNCERTAINTY",
  33: "PD-UNCERTAINTY",
  35: "PD-UNCERTAINTY",
  36: "PX-SCOPE-BOUNDARY",
  45: "PR-STEWARDSHIP",
  47: "PX-EVAL-CRITERIA",
  48: "PX-EVAL-CRITERIA",
  51: "PD-MEASUREMENT",
  54: "PX-EVAL-CRITERIA",
  57: "PR-STEWARDSHIP",
  58: "PD-MEASUREMENT",
  60: "PD-PLANNING",
  63: "PD-DELIVERY",
  66: "PD-PLANNING",
  67: "PD-PLANNING",
  68: "PD-PLANNING",
  69: "PD-TEAM",
  72: "PR-RISK",
  74: "PR-RISK",
  86: "PR-VALUE",
  87: "PX-DECISION",
  91: "PR-RISK",
  99: "PX-GOVERNANCE",
  100: "PD-DELIVERY",
  101: "PD-MEASUREMENT",
  102: "PD-MEASUREMENT",
  104: "PX-CHANGE-ENABLE", // Updated to match context
  105: "PD-MEASUREMENT",
};

/**
 * Hybrid search: Supports both string PMI IDs and numeric TBS IDs
 */
export function getReferenceById(id: string | number | undefined): PmiKbEntry | null {
  if (id === undefined || id === null) return null;

  if (typeof id === "string" && PMI_KNOWLEDGE_BASE[id]) {
    return PMI_KNOWLEDGE_BASE[id];
  }

  const numericId = typeof id === "number" ? id : parseInt(String(id), 10);
  if (!isNaN(numericId) && OLD_TBS_MAPPING[numericId]) {
    const pmiId = OLD_TBS_MAPPING[numericId];
    return PMI_KNOWLEDGE_BASE[pmiId];
  }

  return null;
}

export function getPmiIdFromTbs(tbsId: number): string | null {
  return OLD_TBS_MAPPING[tbsId] || null;
}

export function getReferencesById(ids: Array<string | number>): PmiKbEntry[] {
  return ids
    .map((id) => getReferenceById(id))
    .filter((ref): ref is PmiKbEntry => ref !== null);
}