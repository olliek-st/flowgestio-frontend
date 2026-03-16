// src/engine/validation/docs/bc01/regulatory/quality_reg.rules.ts
// ─── Regulatory Domain: QUALITY_REG ──────────────────────────────────────────
//
// Active for presets that include "QUALITY_REG" in activeDomains:
//   HEALTH/CLINIC  · HEALTH/PHARMA  · HEALTH/CLINICAL_RESEARCH
//   HEALTH/MEDICAL_DEVICES  · MANUFACTURING/AUTO  · MANUFACTURING/AEROSPACE
//   CHEMICALS/HAZMAT  · CLEANTECH/LIFECYCLE
//
// Logic contract:
//   All rules are CONDITIONAL — they fire only when a trigger term is found
//   in an authored field and the required term is absent.
//   A blank trigger field = rule does not fire (section not yet authored).
//   No NLP. No fuzzy matching. Deterministic string includes only (lowercased).
//
// Rule count: 3
//   WARN × 3  —  QUALITY_REG-BC01-QA-APPROACH-REQUIRED
//                QUALITY_REG-BC01-STANDARDS-REFERENCE-REQUIRED
//                QUALITY_REG-BC01-MONITORING-METRICS-REQUIRED

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

const QUALITY_TRIGGER_TERMS = [
  "quality", "clinical", "clinical trial", "clinical research",
  "medical device", "pharmaceutical", "pharma", "drug",
  "diagnostic", "laboratory", "lab", "manufacturing",
  "production", "product quality", "service quality",
  "service delivery", "service level", "healthcare",
  "patient care", "patient safety", "good manufacturing",
];

const QA_APPROACH_TERMS = [
  "quality assurance", "qa ", "quality management",
  "quality control", "qc ", "continuous improvement",
  "quality framework", "quality system", "quality plan",
  "quality review", "quality gate", "inspection",
  "testing regime", "validation protocol", "verification",
];

const STANDARDS_TERMS = [
  "standard", "accreditation", "accredited", "sop",
  "standard operating procedure", "guideline", "regulation",
  "iso 9001", "iso 13485", "gmp", "good manufacturing practice",
  "good clinical practice", "gcp", "good laboratory practice",
  "glp", "ich ", "fda", "health canada", "hpfb",
  "medical devices regulation", "clinical trial regulation",
  "clia", "cap ", "college of physicians", "regulatory framework",
];

const MONITORING_TERMS = [
  "monitoring", "kpi", "key performance indicator",
  "metric", "measure", "audit", "audit trail",
  "review", "inspection", "surveillance", "performance review",
  "quality audit", "corrective action", "capa",
  "non-conformance", "deviation", "reporting",
];

// ─── Rule 1: QA approach required when quality/clinical scope present ─────────
// Trigger:  in-scope / problem mentions quality/clinical/service quality terms.
// Require:  governance / policy mentions QA/quality assurance terms.
// Severity: WARN
// Section:  S5_1_GOV_OVERSIGHT → narrative

const qualityQaApproachRequired: ValidationRule = {
  id: "QUALITY_REG-BC01-QA-APPROACH-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const problem = getText(formData, "S1_3_1_PROBLEM",   "narrative");

    const mentionsQuality =
      contains(inScope, ...QUALITY_TRIGGER_TERMS) ||
      contains(problem, ...QUALITY_TRIGGER_TERMS);

    if (!mentionsQuality) return [];

    const governance = getText(formData, "S5_1_GOV_OVERSIGHT", "narrative");
    const policy     = getText(formData, "S3_7_POLICY",        "policyStandardsNarrative");

    const mentionsQA =
      contains(governance, ...QA_APPROACH_TERMS) ||
      contains(policy,     ...QA_APPROACH_TERMS);

    if (mentionsQA) return [];

    return [reg_warn(
      "QUALITY_REG-BC01-QA-APPROACH-REQUIRED",
      "S5_1_GOV_OVERSIGHT",
      "narrative",
      "Quality-regulated activities are in scope but no quality assurance approach is described in governance or policy.",
      "In section 5.1 Governance and Oversight, describe the quality assurance approach applicable to this investment (e.g., quality management system, QA/QC plan, continuous improvement process, inspection regime).",
    )];
  },
};

// ─── Rule 2: Standards/accreditation reference in policy ─────────────────────
// Trigger:  quality terms mentioned AND policy section is authored.
// Require:  policy cites standards/accreditation/SOP terms.
// Severity: WARN
// Section:  S3_7_POLICY → policyStandardsNarrative

const qualityStandardsReferenceRequired: ValidationRule = {
  id: "QUALITY_REG-BC01-STANDARDS-REFERENCE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const problem = getText(formData, "S1_3_1_PROBLEM",   "narrative");

    const mentionsQuality =
      contains(inScope, ...QUALITY_TRIGGER_TERMS) ||
      contains(problem, ...QUALITY_TRIGGER_TERMS);

    if (!mentionsQuality) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");
    if (!policy) return [];

    const mentionsStandards = contains(policy, ...STANDARDS_TERMS);
    if (mentionsStandards) return [];

    return [reg_warn(
      "QUALITY_REG-BC01-STANDARDS-REFERENCE-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Quality-regulated activities are in scope but section 3.7 does not cite applicable quality standards or regulatory frameworks.",
      "In section 3.7 Policy and Standards, cite the applicable quality standards or regulatory frameworks (e.g., ISO 9001, ISO 13485, GMP, GCP, GLP, Health Canada requirements, industry-specific SOPs) governing quality for this investment.",
    )];
  },
};

// ─── Rule 3: Monitoring and metrics in governance ─────────────────────────────
// Trigger:  governance section is authored AND quality terms in problem/in-scope.
// Require:  governance mentions monitoring/metrics/KPIs/audit.
// Severity: WARN
// Section:  S5_1_GOV_OVERSIGHT → narrative

const qualityMonitoringMetricsRequired: ValidationRule = {
  id: "QUALITY_REG-BC01-MONITORING-METRICS-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const governance = getText(formData, "S5_1_GOV_OVERSIGHT", "narrative");
    if (!governance) return [];

    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const problem = getText(formData, "S1_3_1_PROBLEM",   "narrative");

    const mentionsQuality =
      contains(inScope, ...QUALITY_TRIGGER_TERMS) ||
      contains(problem, ...QUALITY_TRIGGER_TERMS);

    if (!mentionsQuality) return [];

    const mentionsMonitoring = contains(governance, ...MONITORING_TERMS);
    if (mentionsMonitoring) return [];

    return [reg_warn(
      "QUALITY_REG-BC01-MONITORING-METRICS-REQUIRED",
      "S5_1_GOV_OVERSIGHT",
      "narrative",
      "Quality-regulated activities are in scope but the governance section does not describe monitoring, metrics, or audit mechanisms.",
      "In section 5.1 Governance and Oversight, describe how quality will be monitored and measured (e.g., KPIs, quality audits, non-conformance tracking, CAPA processes, periodic reviews).",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const qualityRegBC01Rules: ValidationRule[] = [
  qualityQaApproachRequired,          // WARN
  qualityStandardsReferenceRequired,  // WARN
  qualityMonitoringMetricsRequired,   // WARN
];
