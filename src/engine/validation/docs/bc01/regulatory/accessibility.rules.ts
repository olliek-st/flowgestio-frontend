// src/engine/validation/docs/bc01/regulatory/accessibility.rules.ts
// ─── Regulatory Domain: ACCESSIBILITY ─────────────────────────────────────────

import type { ValidationRule, ValidationInput } from "../../../registry/types";
import type { ValidationIssue } from "../../../types";

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
function reg_warn(ruleId: string, sectionId: string, fieldKey: string, message: string, remedyLabel: string): ValidationIssue {
  return { ruleId, standard: "REGULATORY", severity: "WARN", sectionId, message, appliesTo: { fieldKey }, remedy: { label: remedyLabel } };
}
function reg_block(ruleId: string, sectionId: string, fieldKey: string, message: string, remedyLabel: string): ValidationIssue {
  return { ruleId, standard: "REGULATORY", severity: "BLOCK", sectionId, message, appliesTo: { fieldKey }, remedy: { label: remedyLabel } };
}

const DIGITAL_SERVICE_TERMS = [
  "website", "web", "portal", "online", "digital service", "application",
  "app", "mobile", "user interface", "ui", "platform", "system",
];

const ACCESSIBILITY_TERMS = [
  "accessibility", "aoda", "wcag", "screen reader", "alt text",
  "keyboard", "contrast", "inclusive design", "assistive",
];

const TESTING_TERMS = [
  "testing", "audit", "conformance", "validation", "assessment",
  "vpats", "accessibility audit", "usability testing",
];

const POLICY_TERMS = [
  "policy", "standard", "wcag", "aoda", "ontario", "accessibility act",
  "tbs", "directive",
];

// Rule 1: If digital service is mentioned, accessibility commitment should exist.
const accessibilityCommitmentRequired: ValidationRule = {
  id: "ACCESSIBILITY-BC01-COMMITMENT-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const problem = getText(formData, "S1_3_1_PROBLEM", "narrative");
    const mentionsDigital = contains(inScope, ...DIGITAL_SERVICE_TERMS) || contains(problem, ...DIGITAL_SERVICE_TERMS);
    if (!mentionsDigital) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");
    const mentionsAccessibility = contains(policy, ...ACCESSIBILITY_TERMS);
    if (mentionsAccessibility) return [];

    return [reg_warn(
      "ACCESSIBILITY-BC01-COMMITMENT-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "A digital service or user-facing system is in scope but accessibility commitments are not stated.",
      "In section 3.7 Policy and Standards, state accessibility commitments (e.g., WCAG compliance target, AODA obligations if applicable) and how accessibility will be addressed during delivery.",
    )];
  },
};

// Rule 2: If accessibility is mentioned, testing/audit should be mentioned.
const accessibilityTestingRequired: ValidationRule = {
  id: "ACCESSIBILITY-BC01-TESTING-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");
    if (!policy) return [];

    const mentionsAccessibility = contains(policy, ...ACCESSIBILITY_TERMS);
    if (!mentionsAccessibility) return [];

    const mentionsTesting = contains(policy, ...TESTING_TERMS);
    if (mentionsTesting) return [];

    return [reg_warn(
      "ACCESSIBILITY-BC01-TESTING-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Accessibility is referenced but there is no mention of accessibility testing or conformance assessment.",
      "In section 3.7 Policy and Standards, describe how accessibility will be validated (e.g., audit/testing, conformance assessment, assistive technology testing) and when it will occur.",
    )];
  },
};

// Rule 3: If policy section exists and digital scope exists, cite policy/standard.
const accessibilityPolicyReferenceRequired: ValidationRule = {
  id: "ACCESSIBILITY-BC01-POLICY-REFERENCE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const inScope = getText(formData, "S1_4_1A_IN_SCOPE", "narrative");
    const mentionsDigital = contains(inScope, ...DIGITAL_SERVICE_TERMS);
    if (!mentionsDigital) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");
    if (!policy) return [];

    const mentionsPolicy = contains(policy, ...POLICY_TERMS);
    if (mentionsPolicy) return [];

    return [reg_warn(
      "ACCESSIBILITY-BC01-POLICY-REFERENCE-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "A digital service is in scope but section 3.7 does not cite an accessibility standard or policy reference.",
      "In section 3.7 Policy and Standards, cite the applicable accessibility standard/policy (e.g., WCAG target level, AODA requirements if applicable) relevant to the solution context.",
    )];
  },
};

export const accessibilityBC01Rules: ValidationRule[] = [
  accessibilityCommitmentRequired,      // WARN
  accessibilityTestingRequired,         // WARN
  accessibilityPolicyReferenceRequired, // WARN
];