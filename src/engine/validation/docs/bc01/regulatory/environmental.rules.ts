// src/engine/validation/docs/bc01/regulatory/environmental.rules.ts
// ─── Regulatory Domain: ENVIRONMENTAL ────────────────────────────────────────
//
// Active for presets that include "ENVIRONMENTAL" in activeDomains:
//   CLEANTECH/*  · CONSTRUCTION/CIVIL_INFRA  · CONSTRUCTION/BUILDING
//   CONSTRUCTION/INDUSTRIAL  · CHEMICALS/HAZMAT
//
// Logic contract:
//   All rules are CONDITIONAL — they fire only when a trigger term is found
//   in an authored field and the required term is absent.
//   A blank trigger field = rule does not fire (section not yet authored).
//   No NLP. No fuzzy matching. Deterministic string includes only (lowercased).
//
// Rule count: 3
//   WARN × 3  —  ENVIRONMENTAL-BC01-IMPACT-STATEMENT-REQUIRED
//                ENVIRONMENTAL-BC01-MITIGATION-REQUIRED
//                ENVIRONMENTAL-BC01-POLICY-REFERENCE-REQUIRED

import type { ValidationRule, ValidationInput } from "../../../registry/types";
import type { ValidationIssue } from "../../../types";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function getText(formData: unknown, sectionId: string, fieldKey: string): string {
  if (!formData || typeof formData !== "object") return "";
  const section = (formData as Record<string, unknown>)[sectionId];
  if (!section || typeof section !== "object") return "";
  const val = (section as Record<string, unknown>)[fieldKey];
  return typeof val === "string" ? val.toLowerCase() : "";
}

function contains(text: string, ...terms: string[]): boolean {
  return terms.some((t) => text.includes(t));
}

function reg_block(
  ruleId: string,
  sectionId: string,
  fieldKey: string,
  message: string,
  remedyLabel: string
): ValidationIssue {
  return {
    ruleId,
    standard: "REGULATORY",
    severity: "BLOCK",
    sectionId,
    message,
    appliesTo: { fieldKey },
    remedy: { label: remedyLabel },
  };
}

function reg_warn(
  ruleId: string,
  sectionId: string,
  fieldKey: string,
  message: string,
  remedyLabel: string
): ValidationIssue {
  return {
    ruleId,
    standard: "REGULATORY",
    severity: "WARN",
    sectionId,
    message,
    appliesTo: { fieldKey },
    remedy: { label: remedyLabel },
  };
}

// ─── Term lists ───────────────────────────────────────────────────────────────

const ENVIRONMENTAL_TRIGGER_TERMS = [
  "carbon", "emission", "emissions", "greenhouse", "ghg",
  "waste", "wastewater", "effluent", "pollution", "pollutant",
  "energy", "renewable", "solar", "wind", "biodiversity",
  "habitat", "ecology", "environmental", "sustainability",
  "sustainable", "lifecycle", "land use", "land disturbance",
  "deforestation", "contamination", "remediation",
];

const IMPACT_TERMS = [
  "environmental impact", "impact assessment", "environmental assessment",
  "eia", "environmental review", "environmental risk",
  "environmental effect", "environmental consequence",
  "carbon footprint", "ecological impact",
];

const MITIGATION_TERMS = [
  "mitigation", "mitigat", "reduction", "offset", "carbon offset",
  "efficiency", "environmental compliance", "remediat",
  "abatement", "control measure", "environmental control",
  "best practice", "cleaner", "reduce emission", "net zero",
  "environmental management",
];

const ENV_POLICY_TERMS = [
  "environmental assessment", "environmental policy",
  "sustainability policy", "iso 14001", "environmental management system",
  "ems", "environmental regulation", "environmental legislation",
  "canadian environmental assessment", "ceaa", "impact assessment act",
  "environmental protection", "environmental compliance",
  "sustainability framework", "environmental standard",
];

// ─── Rule 1: Environmental impact statement ───────────────────────────────────
// Trigger:  costs / in-scope / problem mentions environmental terms.
// Require:  risk summary / policy mentions impact/assessment terms.
// Severity: WARN
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const environmentalImpactStatementRequired: ValidationRule = {
  id: "ENVIRONMENTAL-BC01-IMPACT-STATEMENT-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const costs   = getText(formData, "S3_2_COSTS",        "costsNarrative");
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE",  "narrative");
    const problem = getText(formData, "S1_3_1_PROBLEM",    "narrative");

    const mentionsEnvironmental =
      contains(costs,   ...ENVIRONMENTAL_TRIGGER_TERMS) ||
      contains(inScope, ...ENVIRONMENTAL_TRIGGER_TERMS) ||
      contains(problem, ...ENVIRONMENTAL_TRIGGER_TERMS);

    if (!mentionsEnvironmental) return [];

    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const policy      = getText(formData, "S3_7_POLICY",         "policyStandardsNarrative");

    const mentionsImpact =
      contains(riskSummary, ...IMPACT_TERMS) ||
      contains(policy,      ...IMPACT_TERMS);

    if (mentionsImpact) return [];

    return [reg_warn(
      "ENVIRONMENTAL-BC01-IMPACT-STATEMENT-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Environmental activities or impacts are referenced but no environmental impact statement or assessment is mentioned.",
      "In section 3.5.1 Risk Summary, include an environmental impact statement or reference an environmental assessment (e.g., EIA, CEAA, Impact Assessment Act screening) relevant to the scope of this investment.",
    )];
  },
};

// ─── Rule 2: Environmental mitigation measures ────────────────────────────────
// Trigger:  risk summary mentions environmental terms.
// Require:  risk summary mentions mitigation/reduction/offset terms.
// Severity: WARN
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const environmentalMitigationRequired: ValidationRule = {
  id: "ENVIRONMENTAL-BC01-MITIGATION-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    if (!riskSummary) return [];

    const mentionsEnvironmental = contains(riskSummary, ...ENVIRONMENTAL_TRIGGER_TERMS);
    if (!mentionsEnvironmental) return [];

    const mentionsMitigation = contains(riskSummary, ...MITIGATION_TERMS);
    if (mentionsMitigation) return [];

    return [reg_warn(
      "ENVIRONMENTAL-BC01-MITIGATION-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Environmental risks are referenced in the risk summary but no mitigation, reduction, or offset measures are described.",
      "In section 3.5.1 Risk Summary, describe environmental mitigation measures (e.g., emissions reduction, waste management controls, environmental offsets, pollution abatement) applicable to this investment.",
    )];
  },
};

// ─── Rule 3: Environmental policy reference ───────────────────────────────────
// Trigger:  environmental terms mentioned AND policy section is authored.
// Require:  policy cites an environmental policy/standard.
// Severity: WARN
// Section:  S3_7_POLICY → policyStandardsNarrative

const environmentalPolicyReferenceRequired: ValidationRule = {
  id: "ENVIRONMENTAL-BC01-POLICY-REFERENCE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE",  "narrative");
    const problem = getText(formData, "S1_3_1_PROBLEM",    "narrative");
    const costs   = getText(formData, "S3_2_COSTS",        "costsNarrative");

    const mentionsEnvironmental =
      contains(inScope, ...ENVIRONMENTAL_TRIGGER_TERMS) ||
      contains(problem, ...ENVIRONMENTAL_TRIGGER_TERMS) ||
      contains(costs,   ...ENVIRONMENTAL_TRIGGER_TERMS);

    if (!mentionsEnvironmental) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");
    if (!policy) return [];

    const mentionsPolicyRef = contains(policy, ...ENV_POLICY_TERMS);
    if (mentionsPolicyRef) return [];

    return [reg_warn(
      "ENVIRONMENTAL-BC01-POLICY-REFERENCE-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Environmental activities are in scope but section 3.7 does not cite an applicable environmental policy or standard.",
      "In section 3.7 Policy and Standards, cite the applicable environmental policy or standard governing this investment (e.g., Impact Assessment Act, ISO 14001, Environmental Protection Act, departmental sustainability policy).",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const environmentalBC01Rules: ValidationRule[] = [
  environmentalImpactStatementRequired,   // WARN
  environmentalMitigationRequired,        // WARN
  environmentalPolicyReferenceRequired,   // WARN
];
