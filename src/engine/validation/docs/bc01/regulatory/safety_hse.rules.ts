// src/engine/validation/docs/bc01/regulatory/safety_hse.rules.ts
// ─── Regulatory Domain: SAFETY_HSE ───────────────────────────────────────────
//
// Active for presets that include "SAFETY_HSE" in activeDomains:
//   HEALTH/PHARMA  · HEALTH/MEDICAL_DEVICES
//   CONSTRUCTION/* · MANUFACTURING/*
//   CHEMICALS/HAZMAT · CLEANTECH/RENEWABLE_ENERGY · CLEANTECH/WASTE_WATER
//
// Logic contract:
//   All rules are CONDITIONAL — they fire only when a trigger term is found
//   in an authored field and the required term is absent.
//   A blank trigger field = rule does not fire (section not yet authored).
//   No NLP. No fuzzy matching. Deterministic string includes only (lowercased).
//
// Rule count: 3
//   BLOCK × 1  —  SAFETY_HSE-BC01-SAFETY-PLAN-REQUIRED
//   WARN  × 2  —  SAFETY_HSE-BC01-INCIDENT-MGMT-REQUIRED
//                 SAFETY_HSE-BC01-COMPLIANCE-REFERENCE-REQUIRED

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

const CONSTRUCTION_SITE_TERMS = [
  "construction", "site", "field work", "fieldwork", "excavation",
  "demolition", "installation", "commissioning", "decommissioning",
  "physical work", "on-site", "onsite", "infrastructure", "facility",
  "plant", "warehouse", "laboratory", "lab", "manufacturing",
  "industrial", "hazardous material", "hazmat",
];

const HAZARD_RISK_TERMS = [
  "safety", "hazard", "hazardous", "risk", "danger", "dangerous",
  "accident", "injury", "harm", "chemical", "toxic", "explosive",
  "fire", "fall", "lift", "crane", "confined space", "electrical",
  "radiation", "biohazard", "pathogen",
];

const SAFETY_PLAN_TERMS = [
  "safety plan", "health and safety plan", "h&s plan", "hse plan",
  "safety management", "safety procedure", "safety protocol",
  "safe work procedure", "swp", "ppe", "personal protective equipment",
  "safety training", "safety officer", "safety manager",
  "site safety", "safety coordinator", "safety inspection",
  "job hazard analysis", "jha", "hazard assessment", "risk assessment",
  "safety program",
];

const INCIDENT_MGMT_TERMS = [
  "incident report", "incident reporting", "incident management",
  "accident report", "near miss", "near-miss",
  "incident investigation", "corrective action", "root cause",
  "emergency response", "first aid", "first responder",
  "evacuation", "injury reporting", "incident notification",
];

const HSE_COMPLIANCE_TERMS = [
  "hse", "health and safety", "health & safety", "ohsa",
  "occupational health", "occupational safety", "workplace safety",
  "canada labour code", "labour code", "work safe", "worksafe",
  "safety regulation", "safety standard", "safety act",
  "whmis", "transportation of dangerous goods", "tdg",
  "csa standard", "ansi", "nfpa", "safety compliance",
  "safety legislation", "regulatory compliance",
];

// ─── Rule 1: Safety plan required when construction/site work is in scope ─────
// Trigger:  in-scope / schedule mentions construction/site/hazard terms.
// Require:  governance / risk summary mentions safety plan/procedures.
// Severity: BLOCK
// Section:  S5_1_GOV_OVERSIGHT → narrative

const safetyPlanRequired: ValidationRule = {
  id: "SAFETY_HSE-BC01-SAFETY-PLAN-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope   = getText(formData, "S1_4_1A_IN_SCOPE",  "narrative");
    const schedule  = getText(formData, "S3_4_2_SCHEDULE",   "scheduleApproachNarrative");

    const mentionsConstruction =
      contains(inScope,  ...CONSTRUCTION_SITE_TERMS) ||
      contains(schedule, ...CONSTRUCTION_SITE_TERMS);

    if (!mentionsConstruction) return [];

    const governance  = getText(formData, "S5_1_GOV_OVERSIGHT",  "narrative");
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");

    const mentionsSafetyPlan =
      contains(governance,  ...SAFETY_PLAN_TERMS) ||
      contains(riskSummary, ...SAFETY_PLAN_TERMS);

    if (mentionsSafetyPlan) return [];

    return [reg_block(
      "SAFETY_HSE-BC01-SAFETY-PLAN-REQUIRED",
      "S5_1_GOV_OVERSIGHT",
      "narrative",
      "Construction, site work, or physical installation is in scope but no health and safety plan or safe work procedures are referenced.",
      "In section 5.1 Governance and Oversight, reference the health and safety plan or procedures governing site work (e.g., site safety plan, safe work procedures, PPE requirements, safety officer designation, JHA).",
    )];
  },
};

// ─── Rule 2: Incident management process when safety/hazard risk is present ───
// Trigger:  risk summary mentions safety/hazard terms.
// Require:  risk summary mentions incident reporting/response terms.
// Severity: WARN
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const safetyIncidentMgmtRequired: ValidationRule = {
  id: "SAFETY_HSE-BC01-INCIDENT-MGMT-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    if (!riskSummary) return [];

    const mentionsHazard = contains(riskSummary, ...HAZARD_RISK_TERMS);
    if (!mentionsHazard) return [];

    const mentionsIncident = contains(riskSummary, ...INCIDENT_MGMT_TERMS);
    if (mentionsIncident) return [];

    return [reg_warn(
      "SAFETY_HSE-BC01-INCIDENT-MGMT-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Safety or hazard risk is referenced but incident reporting and management processes are not described.",
      "In section 3.5.1 Risk Summary, describe the incident management process (e.g., incident reporting requirements, near-miss reporting, accident investigation, corrective action, emergency response).",
    )];
  },
};

// ─── Rule 3: HSE compliance reference in policy when safety/hazard present ────
// Trigger:  safety/hazard terms mentioned AND policy section is authored.
// Require:  policy cites HSE compliance references.
// Severity: WARN
// Section:  S3_7_POLICY → policyStandardsNarrative

const safetyComplianceReferenceRequired: ValidationRule = {
  id: "SAFETY_HSE-BC01-COMPLIANCE-REFERENCE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE",  "narrative");
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");

    const mentionsHazard =
      contains(inScope,     ...HAZARD_RISK_TERMS) ||
      contains(riskSummary, ...HAZARD_RISK_TERMS) ||
      contains(constraints, ...HAZARD_RISK_TERMS);

    if (!mentionsHazard) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");
    if (!policy) return [];

    const mentionsCompliance = contains(policy, ...HSE_COMPLIANCE_TERMS);
    if (mentionsCompliance) return [];

    return [reg_warn(
      "SAFETY_HSE-BC01-COMPLIANCE-REFERENCE-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Safety or hazard risks are present but section 3.7 does not cite applicable health and safety legislation or standards.",
      "In section 3.7 Policy and Standards, cite applicable occupational health and safety legislation and standards (e.g., Canada Labour Code Part II, provincial OHSA, WHMIS, TDG, relevant CSA standards) governing this work.",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const safetyHseBC01Rules: ValidationRule[] = [
  safetyPlanRequired,                   // BLOCK
  safetyIncidentMgmtRequired,           // WARN
  safetyComplianceReferenceRequired,    // WARN
];
