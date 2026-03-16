// src/engine/validation/docs/bc01/regulatory/privacy.rules.ts
// ─── Regulatory Domain: PRIVACY ───────────────────────────────────────────────
//
// Active for presets that include "PRIVACY" in activeDomains:
//   HEALTH/*  · FINTECH/*  · PUBLIC/ADMIN_DIGITAL  · PUBLIC/EDUCATION
//   IT/*      · EDUCATION/DIGITAL_SERVICES
//
// Logic contract:
//   All rules are CONDITIONAL — they fire only when a trigger term is found
//   in an authored field and the required term is absent.
//   A blank trigger field = rule does not fire (section not yet authored).
//   No NLP. No fuzzy matching. Deterministic string includes only (lowercased).
//
// Rule count: 7  (6 required + 1 bonus)
//   BLOCK × 4  —  PRIVACY-BC01-PIA-REQUIRED
//                  PRIVACY-BC01-CONSENT-AUTHORITY-REQUIRED
//                  PRIVACY-BC01-DATA-PROTECTION-CLAUSE-REQUIRED
//                  PRIVACY-BC01-DATA-RESIDENCY-REQUIRED
//                  PRIVACY-BC01-SENSITIVE-DATA-RISK-REQUIRED
//   WARN  × 2  —  PRIVACY-BC01-DATA-CLASSIFICATION-REQUIRED
//                  PRIVACY-BC01-POLICY-REFERENCE-REQUIRED

import type { ValidationRule, ValidationInput } from "../../../registry/types";
import type { ValidationIssue } from "../../../types";

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Read a named field from formData, return lowercased string or "". */
function getText(formData: unknown, sectionId: string, fieldKey: string): string {
  if (!formData || typeof formData !== "object") return "";
  const section = (formData as Record<string, unknown>)[sectionId];
  if (!section || typeof section !== "object") return "";
  const val = (section as Record<string, unknown>)[fieldKey];
  return typeof val === "string" ? val.toLowerCase() : "";
}

/** True if lowercased `text` contains at least one of `terms`. */
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

const PERSONAL_DATA_TERMS = [
  "personal data", "personal information", "personally identifiable",
  "pii", "patient data", "citizen data", "client data",
  "health record", "health information", "social insurance",
];

const PIA_TERMS = [
  "privacy impact", "pia", "privacy assessment",
  "privacy review", "privacy analysis",
];

const SYSTEM_TERMS = [
  "system", "platform", "application", "database", "software",
  "solution", "portal", "service", "tool",
];

const CLASSIFICATION_TERMS = [
  "data classification", "classification", "sensitivity",
  "protected", "classified", "sensitivity level",
  "data category", "categorization", "unclassified",
];

const CITIZEN_TERMS = [
  "citizen", "patient", "client", "member of the public",
  "beneficiary", "resident", "individual",
];

const CONSENT_TERMS = [
  "consent", "authority", "authorized", "legislation", " act ",
  "regulation", "statutory", "legislative", "collection authority",
];

const VENDOR_TERMS = [
  "vendor", "contractor", "third party", "third-party",
  "supplier", "outsourc", "service provider",
];

const DATA_PROTECTION_TERMS = [
  "data protection", "privacy clause", "data handling",
  "data agreement", "pipeda", "privacy schedule",
  "data processing agreement", "privacy addendum",
];

const CLOUD_TERMS = [
  "cloud", "aws", "azure", "gcp", "google cloud",
  "microsoft azure", "amazon web", "saas", "hosted", "hosting",
  "off-premise", "offpremise",
];

const RESIDENCY_TERMS = [
  "data residency", "data sovereignty", "stored in canada",
  "canadian data", "jurisdiction", "sovereign cloud",
  "canada region", "domestic", "government of canada cloud",
];

const SENSITIVE_TERMS = [
  "health", "medical", "clinical", "financial", "biometric",
  "biometrics", "mental health", "income", "sin ", "social insurance",
  "credit", "banking", "genetic", "racial", "ethnic",
  "political", "religious", "sexual", "criminal",
];

const MITIGATION_TERMS = [
  "risk mitigation", "mitigat", "privacy", "de-identification",
  "deidentification", "anonymization", "anonymisation",
  "encryption", "encrypted", "access control",
  "data minimization", "data minimisation", "pseudonymization",
];

const PRIVACY_ACT_TERMS = [
  "privacy act", "pipeda", "cppa", "privacy legislation",
  "privacy law", "privacy regulation", "privacy framework",
  "privacy notice", "privacy policy", "access to information", "atip",
];

// ─── Rule 1: Privacy Impact Assessment reference ──────────────────────────────
// Trigger:  problem / drivers / constraints mention personal data terms.
// Require:  any of problem / constraints / risk summary / policy mentions PIA terms.
// Severity: BLOCK
// Section:  S3_7_POLICY → policyStandardsNarrative

const privacyPiaRequired: ValidationRule = {
  id: "PRIVACY-BC01-PIA-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const problem     = getText(formData, "S1_3_1_PROBLEM",     "narrative");
    const drivers     = getText(formData, "S1_1_3_DRIVERS",     "narrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");

    const mentionsPersonalData =
      contains(problem,     ...PERSONAL_DATA_TERMS) ||
      contains(drivers,     ...PERSONAL_DATA_TERMS) ||
      contains(constraints, ...PERSONAL_DATA_TERMS);

    if (!mentionsPersonalData) return [];

    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const policy      = getText(formData, "S3_7_POLICY",         "policyStandardsNarrative");

    const mentionsPIA =
      contains(problem,     ...PIA_TERMS) ||
      contains(constraints, ...PIA_TERMS) ||
      contains(riskSummary, ...PIA_TERMS) ||
      contains(policy,      ...PIA_TERMS);

    if (mentionsPIA) return [];

    return [reg_block(
      "PRIVACY-BC01-PIA-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Personal data is referenced but no Privacy Impact Assessment (PIA) mention is found.",
      "In section 3.7 Policy and Standards, reference the required Privacy Impact Assessment. State whether a PIA has been completed, is in progress, or is planned, and identify the responsible privacy authority.",
    )];
  },
};

// ─── Rule 2: Data classification when system/platform is in scope ─────────────
// Trigger:  problem or in-scope section mentions system/platform terms.
// Require:  risk summary / constraints / policy mentions classification terms.
// Severity: WARN
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const privacyDataClassificationRequired: ValidationRule = {
  id: "PRIVACY-BC01-DATA-CLASSIFICATION-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const problem  = getText(formData, "S1_3_1_PROBLEM",   "narrative");
    const inScope  = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");

    const isSystemScope =
      contains(problem,  ...SYSTEM_TERMS) ||
      contains(inScope,  ...SYSTEM_TERMS);

    if (!isSystemScope) return [];

    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS",   "narrative");
    const policy      = getText(formData, "S3_7_POLICY",          "policyStandardsNarrative");

    const mentionsClassification =
      contains(riskSummary, ...CLASSIFICATION_TERMS) ||
      contains(constraints, ...CLASSIFICATION_TERMS) ||
      contains(policy,      ...CLASSIFICATION_TERMS);

    if (mentionsClassification) return [];

    return [reg_warn(
      "PRIVACY-BC01-DATA-CLASSIFICATION-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "A system or platform is in scope but no data classification statement is found.",
      "In section 3.5.1 Risk Summary, identify the data classification level (e.g., Unclassified, Protected A, Protected B) for information processed or stored by the proposed system.",
    )];
  },
};

// ─── Rule 3: Consent or legal authority for citizen/patient/client data ───────
// Trigger:  stakeholders narrative mentions citizen/patient/client terms.
// Require:  stakeholders / constraints / policy mentions consent or legal authority.
// Severity: BLOCK
// Section:  S1_4_2_STAKEHOLDERS → narrative

const privacyConsentAuthorityRequired: ValidationRule = {
  id: "PRIVACY-BC01-CONSENT-AUTHORITY-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const stakeholders = getText(formData, "S1_4_2_STAKEHOLDERS", "narrative");
    if (!stakeholders) return [];

    const mentionsCitizens = contains(stakeholders, ...CITIZEN_TERMS);
    if (!mentionsCitizens) return [];

    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");
    const policy      = getText(formData, "S3_7_POLICY",        "policyStandardsNarrative");

    const mentionsConsent =
      contains(stakeholders, ...CONSENT_TERMS) ||
      contains(constraints,  ...CONSENT_TERMS) ||
      contains(policy,       ...CONSENT_TERMS);

    if (mentionsConsent) return [];

    return [reg_block(
      "PRIVACY-BC01-CONSENT-AUTHORITY-REQUIRED",
      "S1_4_2_STAKEHOLDERS",
      "narrative",
      "Citizens, patients, or clients are listed as stakeholders but no consent mechanism or legal collection authority is mentioned.",
      "In section 1.4.2 Stakeholders or section 3.7 Policy and Standards, identify the legal authority or consent mechanism for collecting and using personal information from the individuals identified (e.g., Privacy Act s.4, PIPEDA, provincial equivalent).",
    )];
  },
};

// ─── Rule 4: Data protection clause when external vendor handles data ─────────
// Trigger:  procurement narrative mentions vendor/contractor/third-party terms.
// Require:  procurement / constraints / policy mentions data protection terms.
// Severity: BLOCK
// Section:  S3_4_1_PROC → procurementNarrative

const privacyDataProtectionClauseRequired: ValidationRule = {
  id: "PRIVACY-BC01-DATA-PROTECTION-CLAUSE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC", "procurementNarrative");
    if (!procurement) return [];

    const mentionsVendor = contains(procurement, ...VENDOR_TERMS);
    if (!mentionsVendor) return [];

    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");
    const policy      = getText(formData, "S3_7_POLICY",        "policyStandardsNarrative");

    const mentionsProtection =
      contains(procurement, ...DATA_PROTECTION_TERMS) ||
      contains(constraints, ...DATA_PROTECTION_TERMS) ||
      contains(policy,      ...DATA_PROTECTION_TERMS);

    if (mentionsProtection) return [];

    return [reg_block(
      "PRIVACY-BC01-DATA-PROTECTION-CLAUSE-REQUIRED",
      "S3_4_1_PROC",
      "procurementNarrative",
      "External vendor or contractor involvement is referenced but no data protection clause or privacy agreement is mentioned.",
      "In section 3.4.1 Procurement, reference the contractual data protection requirements for external vendors who will handle personal or sensitive data (e.g., data processing agreement, privacy schedule, PIPEDA obligations).",
    )];
  },
};

// ─── Rule 5: Data residency statement when cloud/hosted infrastructure is used ─
// Trigger:  constraints / risk summary / procurement / in-scope mention cloud terms.
// Require:  risk summary / constraints / policy / procurement mentions residency terms.
// Severity: BLOCK
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const privacyDataResidencyRequired: ValidationRule = {
  id: "PRIVACY-BC01-DATA-RESIDENCY-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS",  "narrative");
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const procurement = getText(formData, "S3_4_1_PROC",         "procurementNarrative");
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE",    "narrative");

    const mentionsCloud =
      contains(constraints, ...CLOUD_TERMS) ||
      contains(riskSummary, ...CLOUD_TERMS) ||
      contains(procurement, ...CLOUD_TERMS) ||
      contains(inScope,     ...CLOUD_TERMS);

    if (!mentionsCloud) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsResidency =
      contains(riskSummary, ...RESIDENCY_TERMS) ||
      contains(constraints, ...RESIDENCY_TERMS) ||
      contains(policy,      ...RESIDENCY_TERMS) ||
      contains(procurement, ...RESIDENCY_TERMS);

    if (mentionsResidency) return [];

    return [reg_block(
      "PRIVACY-BC01-DATA-RESIDENCY-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Cloud or hosted infrastructure is referenced but no data residency or sovereignty statement is found.",
      "In section 3.5.1 Risk Summary or section 3.7 Policy and Standards, state the data residency requirements: where data will be stored and whether it must remain within Canadian jurisdiction (e.g., Government of Canada Protected Cloud, sovereign cloud).",
    )];
  },
};

// ─── Rule 6: Risk mitigation for sensitive data categories ───────────────────
// Trigger:  problem / drivers / in-scope mention sensitive category terms.
// Require:  risk summary mentions mitigation terms.
// Severity: BLOCK
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const privacySensitiveDataRiskRequired: ValidationRule = {
  id: "PRIVACY-BC01-SENSITIVE-DATA-RISK-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const problem  = getText(formData, "S1_3_1_PROBLEM",   "narrative");
    const drivers  = getText(formData, "S1_1_3_DRIVERS",   "narrative");
    const inScope  = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");

    const mentionsSensitive =
      contains(problem,  ...SENSITIVE_TERMS) ||
      contains(drivers,  ...SENSITIVE_TERMS) ||
      contains(inScope,  ...SENSITIVE_TERMS);

    if (!mentionsSensitive) return [];

    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");

    const mentionsMitigation = contains(riskSummary, ...MITIGATION_TERMS);
    if (mentionsMitigation) return [];

    return [reg_block(
      "PRIVACY-BC01-SENSITIVE-DATA-RISK-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Sensitive data categories are referenced but the risk summary contains no mitigation measures.",
      "In section 3.5.1 Risk Summary, describe risk mitigation measures for sensitive data (e.g., encryption at rest and in transit, access controls, de-identification, data minimization, anonymization, audit logging).",
    )];
  },
};

// ─── Rule 7 (bonus): Privacy legislation cited in policy section ──────────────
// Trigger:  problem / in-scope / constraints mention personal data terms.
// Require:  policy section cites applicable privacy legislation.
// Severity: WARN
// Section:  S3_7_POLICY → policyStandardsNarrative

const privacyPolicyReferenceRequired: ValidationRule = {
  id: "PRIVACY-BC01-POLICY-REFERENCE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const problem     = getText(formData, "S1_3_1_PROBLEM",     "narrative");
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE",   "narrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");

    const mentionsPersonalData =
      contains(problem,     ...PERSONAL_DATA_TERMS) ||
      contains(inScope,     ...PERSONAL_DATA_TERMS) ||
      contains(constraints, ...PERSONAL_DATA_TERMS);

    if (!mentionsPersonalData) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsAct = contains(policy, ...PRIVACY_ACT_TERMS);
    if (mentionsAct) return [];

    return [reg_warn(
      "PRIVACY-BC01-POLICY-REFERENCE-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Personal data is referenced but no applicable privacy legislation is cited in section 3.7.",
      "In section 3.7 Policy and Standards, cite the applicable privacy legislation governing this project (e.g., Privacy Act, PIPEDA, CPPA, or applicable provincial privacy act) and note any ATIP implications.",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const privacyBC01Rules: ValidationRule[] = [
  privacyPiaRequired,                    // BLOCK
  privacyConsentAuthorityRequired,       // BLOCK
  privacyDataProtectionClauseRequired,   // BLOCK
  privacyDataResidencyRequired,          // BLOCK
  privacySensitiveDataRiskRequired,      // BLOCK
  privacyDataClassificationRequired,     // WARN
  privacyPolicyReferenceRequired,        // WARN
];
