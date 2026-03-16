// src/engine/validation/docs/bc01/regulatory/financial_reg.rules.ts
// ─── Regulatory Domain: FINANCIAL_REG ────────────────────────────────────────
//
// Active for presets that include "FINANCIAL_REG" in activeDomains:
//   FINTECH/BANKING  · FINTECH/BANKING_LENDING
//   FINTECH/PAYMENTS · FINTECH/CRYPTO_DIGITAL_ASSETS
//   CLEANTECH/CARBON · CLEANTECH/PUBLIC_FUNDING
//
// Logic contract:
//   All rules are CONDITIONAL — they fire only when a trigger term is found
//   in an authored field and the required term is absent.
//   A blank trigger field = rule does not fire (section not yet authored).
//   No NLP. No fuzzy matching. Deterministic string includes only (lowercased).
//
// Rule count: 4
//   WARN × 4  —  FINANCIAL_REG-BC01-COMPLIANCE-REFERENCE-REQUIRED
//                FINANCIAL_REG-BC01-AUDITABILITY-REQUIRED
//                FINANCIAL_REG-BC01-DATA-PROTECTION-REQUIRED
//                FINANCIAL_REG-BC01-AML-FRAUD-REQUIRED

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

const FINANCIAL_SYSTEM_TERMS = [
  "payment", "payments", "transaction", "financial system",
  "banking", "bank account", "ledger", "financial platform",
  "remittance", "settlement", "clearing", "credit",
  "debit", "card processing", "payment gateway",
  "payment processor", "merchant", "fintech", "digital asset",
  "cryptocurrency", "crypto", "token", "blockchain",
  "lending", "loan", "mortgage", "insurance",
];

const FINANCIAL_COMPLIANCE_TERMS = [
  "compliance", "regulatory compliance", "financial regulation",
  "financial compliance", "osfi", "fintrac",
  "anti-money laundering", "aml", "know your customer", "kyc",
  "pci dss", "pci", "swift", "iso 20022",
  "proceeds of crime", "financial action task force", "fatf",
  "consumer protection", "financial consumer agency",
  "financial services", "bank act", "payment card",
];

const AUDIT_CONTROLS_TERMS = [
  "audit", "audit trail", "auditability", "audit log",
  "financial controls", "internal control", "internal audit",
  "external audit", "reconciliation", "segregation of duties",
  "four-eye", "four eyes", "approval workflow",
  "access control", "financial oversight",
];

const PAYMENT_PROTECTION_TERMS = [
  "card", "credit card", "debit card", "cardholder",
  "payment data", "card data", "account number",
  "pan ", "primary account number", "banking",
  "bank data", "financial data",
];

const DATA_PROTECTION_CONTROL_TERMS = [
  "encryption", "encrypted", "tokenization", "tokenized",
  "access control", "role-based", "rbac",
  "least privilege", "masking", "data masking",
  "pci dss", "secure transmission", "tls", "https",
];

const PAYMENT_TRIGGER_TERMS = [
  "payment", "transaction", "banking", "bank",
  "transfer", "remittance", "settlement",
];

const AML_FRAUD_TERMS = [
  "fraud", "anti-fraud", "money laundering", "aml",
  "suspicious transaction", "fintrac", "transaction monitoring",
  "fraud detection", "fraud prevention", "anti-money",
  "know your customer", "kyc", "cdd", "customer due diligence",
];

const VENDOR_OUTSOURCE_TERMS = [
  "vendor", "contractor", "third party", "third-party",
  "outsourc", "service provider", "processor",
  "payment processor", "managed service",
];

// ─── Rule 1: Financial compliance reference in policy ─────────────────────────
// Trigger:  costs / procurement mentions financial system/payment terms.
// Require:  policy mentions financial compliance/regulation terms.
// Severity: WARN
// Section:  S3_7_POLICY → policyStandardsNarrative

const financialComplianceReferenceRequired: ValidationRule = {
  id: "FINANCIAL_REG-BC01-COMPLIANCE-REFERENCE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const costs       = getText(formData, "S3_2_COSTS",    "costsNarrative");
    const procurement = getText(formData, "S3_4_1_PROC",   "procurementNarrative");
    const problem     = getText(formData, "S1_3_1_PROBLEM","narrative");
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE","narrative");

    const mentionsFinancial =
      contains(costs,       ...FINANCIAL_SYSTEM_TERMS) ||
      contains(procurement, ...FINANCIAL_SYSTEM_TERMS) ||
      contains(problem,     ...FINANCIAL_SYSTEM_TERMS) ||
      contains(inScope,     ...FINANCIAL_SYSTEM_TERMS);

    if (!mentionsFinancial) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsCompliance = contains(policy, ...FINANCIAL_COMPLIANCE_TERMS);
    if (mentionsCompliance) return [];

    return [reg_warn(
      "FINANCIAL_REG-BC01-COMPLIANCE-REFERENCE-REQUIRED",
      "S3_7_POLICY",
      "policyStandardsNarrative",
      "Financial system or payment activities are in scope but section 3.7 does not cite applicable financial regulatory compliance requirements.",
      "In section 3.7 Policy and Standards, cite applicable financial regulatory requirements (e.g., OSFI guidelines, FINTRAC requirements, PCI DSS, Bank Act obligations, AML/KYC compliance framework) governing this investment.",
    )];
  },
};

// ─── Rule 2: Auditability when vendor handles financial/payment services ───────
// Trigger:  procurement mentions vendor/outsourcing for financial context.
// Require:  procurement / governance mentions audit/controls.
// Severity: WARN
// Section:  S3_4_1_PROC → procurementNarrative

const financialAuditabilityRequired: ValidationRule = {
  id: "FINANCIAL_REG-BC01-AUDITABILITY-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC", "procurementNarrative");
    if (!procurement) return [];

    const mentionsVendor    = contains(procurement, ...VENDOR_OUTSOURCE_TERMS);
    const mentionsFinancial = contains(procurement, ...FINANCIAL_SYSTEM_TERMS);

    if (!mentionsVendor || !mentionsFinancial) return [];

    const governance = getText(formData, "S5_1_GOV_OVERSIGHT", "narrative");

    const mentionsAudit =
      contains(procurement, ...AUDIT_CONTROLS_TERMS) ||
      contains(governance,  ...AUDIT_CONTROLS_TERMS);

    if (mentionsAudit) return [];

    return [reg_warn(
      "FINANCIAL_REG-BC01-AUDITABILITY-REQUIRED",
      "S3_4_1_PROC",
      "procurementNarrative",
      "A vendor is being engaged for financial or payment services but audit trail and financial controls are not described.",
      "In section 3.4.1 Procurement or section 5.1 Governance and Oversight, describe audit and financial control requirements for vendors (e.g., audit trail requirements, SOC 2 reports, reconciliation processes, segregation of duties, right-to-audit clauses).",
    )];
  },
};

// ─── Rule 3: Data protection for card/payment/banking data ────────────────────
// Trigger:  mentions card/payment/banking data terms.
// Require:  mentions encryption/tokenization/access control terms.
// Severity: WARN
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const financialDataProtectionRequired: ValidationRule = {
  id: "FINANCIAL_REG-BC01-DATA-PROTECTION-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
    const constraints = getText(formData, "S1_3_4_CONSTRAINTS",  "narrative");
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE",    "narrative");

    const mentionsPaymentData =
      contains(riskSummary, ...PAYMENT_PROTECTION_TERMS) ||
      contains(constraints, ...PAYMENT_PROTECTION_TERMS) ||
      contains(inScope,     ...PAYMENT_PROTECTION_TERMS);

    if (!mentionsPaymentData) return [];

    const policy = getText(formData, "S3_7_POLICY", "policyStandardsNarrative");

    const mentionsProtection =
      contains(riskSummary, ...DATA_PROTECTION_CONTROL_TERMS) ||
      contains(constraints, ...DATA_PROTECTION_CONTROL_TERMS) ||
      contains(policy,      ...DATA_PROTECTION_CONTROL_TERMS);

    if (mentionsProtection) return [];

    return [reg_warn(
      "FINANCIAL_REG-BC01-DATA-PROTECTION-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Card, payment, or banking data is referenced but no data protection controls (encryption, tokenization, access controls) are described.",
      "In section 3.5.1 Risk Summary, describe controls protecting card or payment data (e.g., encryption at rest/in transit, tokenization, role-based access controls, PCI DSS scope and compliance approach).",
    )];
  },
};

// ─── Rule 4: AML/fraud risk mention when payments/transactions present ─────────
// Trigger:  problem / in-scope / risk summary mentions payment/transaction terms.
// Require:  risk summary mentions fraud/AML/monitoring terms.
// Severity: WARN
// Section:  S3_5_1_RISK_SUMMARY → riskSummaryNarrative

const financialAmlFraudRequired: ValidationRule = {
  id: "FINANCIAL_REG-BC01-AML-FRAUD-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const problem     = getText(formData, "S1_3_1_PROBLEM",     "narrative");
    const inScope     = getText(formData, "S1_4_1A_IN_SCOPE",   "narrative");
    const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY","riskSummaryNarrative");

    const mentionsPayments =
      contains(problem,     ...PAYMENT_TRIGGER_TERMS) ||
      contains(inScope,     ...PAYMENT_TRIGGER_TERMS) ||
      contains(riskSummary, ...PAYMENT_TRIGGER_TERMS);

    if (!mentionsPayments) return [];

    const mentionsAml = contains(riskSummary, ...AML_FRAUD_TERMS);
    if (mentionsAml) return [];

    return [reg_warn(
      "FINANCIAL_REG-BC01-AML-FRAUD-REQUIRED",
      "S3_5_1_RISK_SUMMARY",
      "riskSummaryNarrative",
      "Payment or transaction processing is referenced but AML, fraud prevention, or transaction monitoring risks are not addressed in the risk summary.",
      "In section 3.5.1 Risk Summary, address fraud and anti-money laundering risks relevant to this investment (e.g., FINTRAC reporting obligations, suspicious transaction monitoring, KYC/CDD processes, fraud detection controls).",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const financialRegBC01Rules: ValidationRule[] = [
  financialComplianceReferenceRequired, // WARN
  financialAuditabilityRequired,        // WARN
  financialDataProtectionRequired,      // WARN
  financialAmlFraudRequired,            // WARN
];
