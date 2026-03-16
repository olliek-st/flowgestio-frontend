// src/engine/validation/docs/bc01/regulatory/export_control.rules.ts
// ─── Regulatory Domain: EXPORT_CONTROL ───────────────────────────────────────
//
// Active for presets that include "EXPORT_CONTROL" in activeDomains:
//   DEFENSE/EXPORT_CONTROLLED
//
// Logic contract:
//   All rules are CONDITIONAL — they fire only when a trigger term is found
//   in an authored field and the required term is absent.
//   A blank trigger field = rule does not fire (section not yet authored).
//   No NLP. No fuzzy matching. Deterministic string includes only (lowercased).
//
// Rule count: 3
//   WARN × 3  —  EXPORT_CONTROL-BC01-CROSSBORDER-REVIEW-REQUIRED
//                EXPORT_CONTROL-BC01-DATA-TRANSFER-REQUIRED
//                EXPORT_CONTROL-BC01-ENCRYPTION-CONTROLS-REQUIRED

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

const CROSSBORDER_TERMS = [
  "cross-border", "crossborder", "international", "overseas",
  "global", "foreign", "multinational", "transborder",
  "data transfer", "data sharing", "transfer abroad",
  "offshore", "offshoring", "jurisdiction", "extraterritorial",
];

const JURISDICTIONAL_REVIEW_TERMS = [
  "jurisdictional review", "export control", "legal review",
  "export compliance", "itar", "ear ", "controlled goods",
  "controlled technology", "dual-use", "dual use",
  "export permit", "import permit", "sanctions",
  "trade compliance", "embargo", "restricted party",
];

const INTERNATIONAL_CLOUD_TERMS = [
  "us-east", "us east", "us west", "us-west",
  "virginia", "oregon", "ireland", "frankfurt",
  "singapore", "tokyo", "sydney", "aws us",
  "azure us", "gcp us", "outside canada",
  "american data center", "foreign data center",
  "us datacenter", "us data center",
  "non-canadian", "us cloud", "american cloud",
];

const RESIDENCY_CONTROL_TERMS = [
  "data residency", "data sovereignty", "canada region",
  "canadian jurisdiction", "contractual clause",
  "data processing agreement", "encryption", "encrypted",
  "government of canada cloud", "sovereign cloud",
];

const ENCRYPTION_TRIGGER_TERMS = [
  "encryption", "encrypted", "cryptographic", "cryptography",
  "key management", "tls", "ssl", "cipher",
];

const EXPORT_CONTROL_POLICY_TERMS = [
  "export control", "export compliance", "itar",
  "ear ", "controlled goods program", "controlled goods",
  "dual-use", "dual use", "export permit",
  "trade compliance", "sanctions", "embargo",
  "restricted party screening", "denied party",
  "bureau of industry", "bis ", "ddtc",
  "export and import permits act",
];

// ─── Rule 1: Cross-border jurisdictional review when international scope ───────
// Trigger:  mentions cross-border/international/overseas/global/data transfer terms.
// Require:  policy mentions jurisdictional review/export control/legal review.
// Severity: WARN
// Section:  S3_7_POLICY → policyStandardsNarrative

const exportCrossborderReviewRequired: ValidationRule = {
  id: "EXPORT_CONTROL-BC01-CROSSBORDER-REVIEW-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE",   "narrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");
    const problem     = getText(formData, "S1_3_1_PROBLEM",     "narrative");
    const procurement = getText(formData, "S3_4_1_PROC",        "procurementNarrative");

    const mentionsCrossborder =
      contains(inScope,     ...CROSSBORDER_TERMS) ||
      contains(constraints, ...CROSSBORDER_TERMS) ||
      contains(problem,     ...CROSSBORDER_TERMS) ||
      contains(procurement, ...CROSSBORDER_TERMS);

    if (!mentionsCrossborder) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsReview = contains(policy, ...JURISDICTIONAL_REVIEW_TERMS);
    if (mentionsReview) return [];

    return [reg_warn(
      "EXPORT_CONTROL-BC01-CROSSBORDER-REVIEW-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Cross-border or international activities are referenced but no export control, jurisdictional review, or trade compliance assessment is mentioned.",
      "In section 3.7 Policy and Standards, reference the export control and jurisdictional review process applicable to this investment (e.g., Controlled Goods Program, ITAR/EAR screening, Export and Import Permits Act requirements, sanctions screening).",
    )];
  },
};

// ─── Rule 2: Data transfer controls for international cloud/hosting ───────────
// Trigger:  procurement / in-scope mentions international cloud regions outside Canada.
// Require:  risk summary mentions residency controls or contractual protections.
// Severity: WARN
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const exportDataTransferRequired: ValidationRule = {
  id: "EXPORT_CONTROL-BC01-DATA-TRANSFER-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC",      "procurementNarrative");
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS","narrative");

    const mentionsIntlCloud =
      contains(procurement, ...INTERNATIONAL_CLOUD_TERMS) ||
      contains(inScope,     ...INTERNATIONAL_CLOUD_TERMS) ||
      contains(constraints, ...INTERNATIONAL_CLOUD_TERMS);

    if (!mentionsIntlCloud) return [];

    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const policy      = getText(formData, "S3_7_POLICY",         "policyStandardsNarrative");

    const mentionsControls =
      contains(riskSummary, ...RESIDENCY_CONTROL_TERMS) ||
      contains(policy,      ...RESIDENCY_CONTROL_TERMS);

    if (mentionsControls) return [];

    return [reg_warn(
      "EXPORT_CONTROL-BC01-DATA-TRANSFER-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "International cloud regions or offshore data hosting are referenced but no data transfer controls or residency protections are described.",
      "In section 3.5.1 Risk Summary, describe controls for international data transfer (e.g., data residency requirements, contractual data processing clauses, encryption in transit, sovereign cloud options, jurisdictional risk assessment).",
    )];
  },
};

// ─── Rule 3: Encryption controls require export permit reference ──────────────
// Trigger:  mentions encryption AND cross-border/export control terms.
// Require:  policy mentions export controls / controlled goods / permits.
// Severity: WARN
// Section:  S3_7_POLICY → policyStandardsNarrative

const exportEncryptionControlsRequired: ValidationRule = {
  id: "EXPORT_CONTROL-BC01-ENCRYPTION-CONTROLS-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE",    "narrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS",  "narrative");
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");

    const mentionsEncryption =
      contains(inScope,     ...ENCRYPTION_TRIGGER_TERMS) ||
      contains(constraints, ...ENCRYPTION_TRIGGER_TERMS) ||
      contains(riskSummary, ...ENCRYPTION_TRIGGER_TERMS);

    if (!mentionsEncryption) return [];

    const mentionsCrossborder =
      contains(inScope,     ...CROSSBORDER_TERMS) ||
      contains(constraints, ...CROSSBORDER_TERMS) ||
      contains(riskSummary, ...CROSSBORDER_TERMS);

    if (!mentionsCrossborder) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsExportControl = contains(policy, ...EXPORT_CONTROL_POLICY_TERMS);
    if (mentionsExportControl) return [];

    return [reg_warn(
      "EXPORT_CONTROL-BC01-ENCRYPTION-CONTROLS-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Encryption technology in a cross-border context is referenced but no export control review or permit assessment is mentioned.",
      "In section 3.7 Policy and Standards, note that encryption technology in cross-border contexts may be subject to export controls. Reference the applicable export control review process (e.g., Controlled Goods Program, ITAR/EAR dual-use technology classification, Export and Import Permits Act).",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const exportControlBC01Rules: ValidationRule[] = [
  exportCrossborderReviewRequired,    // WARN
  exportDataTransferRequired,         // WARN
  exportEncryptionControlsRequired,   // WARN
];
