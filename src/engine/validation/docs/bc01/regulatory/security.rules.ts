// src/engine/validation/docs/bc01/regulatory/security.rules.ts
// ─── Regulatory Domain: SECURITY ──────────────────────────────────────────────
//
// Logic contract (same as PRIVACY/PROCUREMENT):
//   Conditional, deterministic string includes only (lowercased).
//   Blank trigger field = rule does not fire.
//

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

const SYSTEM_TERMS = [
  "system", "platform", "application", "database", "software",
  "solution", "portal", "service", "tool", "api",
];

const SECURITY_TERMS = [
  "security", "cyber", "cybersecurity", "threat", "vulnerability",
  "attack", "breach", "intrusion", "malware", "ransomware",
  "unauthorized", "zero trust", "access control",
];

const CONTROL_TERMS = [
  "encryption", "encrypted", "mfa", "multi-factor", "2fa",
  "least privilege", "rbac", "role-based", "audit log", "logging",
  "monitoring", "patch", "hardening", "secure configuration",
  "incident response", "ir plan", "backup", "restore",
];

const CLASSIFICATION_TERMS = [
  "unclassified", "protected a", "protected b", "protected c",
  "classified", "secret", "top secret", "data classification",
  "sensitivity", "protected", "classified",
];

const CLOUD_TERMS = [
  "cloud", "aws", "azure", "gcp", "saas", "hosted", "hosting",
  "off-premise", "offpremise",
];

const RESIDENCY_TERMS = [
  "data residency", "data sovereignty", "stored in canada",
  "canada region", "jurisdiction", "sovereign cloud",
];

const AUTH_TERMS = [
  "authentication", "authorization", "mfa", "2fa", "sso",
  "identity", "iam", "idam", "rbac", "least privilege",
];

const INCIDENT_TERMS = [
  "incident response", "incident management", "ir plan",
  "security incident", "breach response", "containment",
  "forensics", "notification",
];

// ─── Rule 1: Security controls when security is mentioned ─────────────────────
// Trigger: security terms appear in risk summary or constraints.
// Require: at least one control term appears in risk summary.
// Severity: BLOCK
const securityControlsRequired: ValidationRule = {
  id: "SECURITY-BC01-CONTROLS-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");
    if (!riskSummary && !constraints) return [];

    const mentionsSecurity =
      contains(riskSummary, ...SECURITY_TERMS) ||
      contains(constraints, ...SECURITY_TERMS);

    if (!mentionsSecurity) return [];

    const mentionsControls = contains(riskSummary, ...CONTROL_TERMS);
    if (mentionsControls) return [];

    return [reg_block(
      "SECURITY-BC01-CONTROLS-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Security or cyber risk is referenced but the risk summary contains no specific security controls.",
      "In section 3.5.1 Risk Summary, describe security controls (e.g., encryption, MFA/SSO, least privilege, audit logging, monitoring, patching, incident response).",
    )];
  },
};

// ─── Rule 2: Data classification for systems ──────────────────────────────────
// Trigger: system/platform terms appear in problem or in-scope.
// Require: classification terms appear in risk summary or policy.
// Severity: WARN
const securityClassificationRequired: ValidationRule = {
  id: "SECURITY-BC01-DATA-CLASSIFICATION-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const problem = getText(formData, "S1_3_1_PROBLEM", "narrative");
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const isSystemScope = contains(problem, ...SYSTEM_TERMS) || contains(inScope, ...SYSTEM_TERMS);
    if (!isSystemScope) return [];

    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsClassification =
      contains(riskSummary, ...CLASSIFICATION_TERMS) ||
      contains(policy, ...CLASSIFICATION_TERMS);

    if (mentionsClassification) return [];

    return [reg_warn(
      "SECURITY-BC01-DATA-CLASSIFICATION-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "A system or platform is in scope but no security/data classification level is stated.",
      "In section 3.5.1 Risk Summary or section 3.7 Policy and Standards, state the classification level (e.g., Unclassified, Protected A/B/C, Classified) of information handled by the solution.",
    )];
  },
};

// ─── Rule 3: Cloud + residency statement (security angle) ─────────────────────
// Trigger: cloud terms appear.
// Require: residency terms appear.
// Severity: WARN (privacy pack may already BLOCK; avoid duplicate ruleId)
const securityCloudResidencyRequired: ValidationRule = {
  id: "SECURITY-BC01-CLOUD-RESIDENCY-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC", "procurementNarrative");
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS", "narrative");
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");

    const mentionsCloud =
      contains(procurement, ...CLOUD_TERMS) ||
      contains(inScope, ...CLOUD_TERMS) ||
      contains(constraints, ...CLOUD_TERMS) ||
      contains(riskSummary, ...CLOUD_TERMS);

    if (!mentionsCloud) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");
    const mentionsResidency =
      contains(procurement, ...RESIDENCY_TERMS) ||
      contains(riskSummary, ...RESIDENCY_TERMS) ||
      contains(policy, ...RESIDENCY_TERMS);

    if (mentionsResidency) return [];

    return [reg_warn(
      "SECURITY-BC01-CLOUD-RESIDENCY-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Cloud or hosted delivery is referenced but security jurisdiction/residency expectations are not stated.",
      "In section 3.7 Policy and Standards, state cloud jurisdiction/residency expectations (e.g., Canadian region, sovereign cloud, GoC protected cloud) and any security constraints tied to hosting location.",
    )];
  },
};

// ─── Rule 4: IAM / authentication mention when systems are in scope ───────────
// Trigger: system terms appear.
// Require: auth terms appear in policy or risk summary.
// Severity: WARN
const securityIamRequired: ValidationRule = {
  id: "SECURITY-BC01-IAM-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const problem = getText(formData, "S1_3_1_PROBLEM", "narrative");
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const isSystemScope = contains(problem, ...SYSTEM_TERMS) || contains(inScope, ...SYSTEM_TERMS);
    if (!isSystemScope) return [];

    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsAuth = contains(riskSummary, ...AUTH_TERMS) || contains(policy, ...AUTH_TERMS);
    if (mentionsAuth) return [];

    return [reg_warn(
      "SECURITY-BC01-IAM-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "A system is in scope but identity and access management expectations are not mentioned.",
      "In section 3.7 Policy and Standards (or 3.5.1 Risk Summary), describe authentication/authorization expectations (e.g., SSO, MFA, RBAC, least privilege).",
    )];
  },
};

// ─── Rule 5: Incident response mention when security risk is present ──────────
// Trigger: security terms appear.
// Require: incident terms appear.
// Severity: WARN
const securityIncidentResponseRequired: ValidationRule = {
  id: "SECURITY-BC01-INCIDENT-RESPONSE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    if (!riskSummary) return [];

    const mentionsSecurity = contains(riskSummary, ...SECURITY_TERMS);
    if (!mentionsSecurity) return [];

    const mentionsIR = contains(riskSummary, ...INCIDENT_TERMS);
    if (mentionsIR) return [];

    return [reg_warn(
      "SECURITY-BC01-INCIDENT-RESPONSE-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Security risk is referenced but incident response is not mentioned.",
      "In section 3.5.1 Risk Summary, reference incident response expectations (detection, containment, notification, recovery) appropriate to the solution’s risk profile.",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const securityBC01Rules: ValidationRule[] = [
  securityControlsRequired,              // BLOCK
  securityClassificationRequired,        // WARN
  securityCloudResidencyRequired,        // WARN
  securityIamRequired,                   // WARN
  securityIncidentResponseRequired,      // WARN
];