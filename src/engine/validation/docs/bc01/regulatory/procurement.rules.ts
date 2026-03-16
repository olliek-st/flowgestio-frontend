// src/engine/validation/docs/bc01/regulatory/procurement.rules.ts
// ─── Regulatory Domain: PUBLIC_PROCUREMENT ────────────────────────────────────
//
// Domain label: "PUBLIC_PROCUREMENT"  (matches activeDomains in industry_presets.v1.json)
//
// Active for presets:
//   PUBLIC/ADMIN_DIGITAL  · CONSTRUCTION/CIVIL_INFRA
//   CLEANTECH/CARBON      · CLEANTECH/PUBLIC_FUNDING
//   CLEANTECH/RENEWABLE_ENERGY · CLEANTECH/WASTE_WATER
//
// Logic contract:
//   All rules are CONDITIONAL — they fire only when a trigger term is found
//   in an authored field and the required term is absent.
//   A blank trigger field = rule does not fire (section not yet authored).
//   No NLP. No fuzzy matching. Deterministic string includes only (lowercased).
//
// Rule count: 7  (6 required + 1 bonus)
//   BLOCK × 4  —  PROC-BC01-STRATEGY-REQUIRED
//                  PROC-BC01-SOLE-SOURCE-JUSTIFICATION-REQUIRED
//                  PROC-BC01-EVALUATION-CRITERIA-REQUIRED
//                  PROC-BC01-CONTRACT-MGMT-REQUIRED
//   WARN  × 3  —  PROC-BC01-COMPETITIVE-RATIONALE-REQUIRED
//                  PROC-BC01-SCHEDULE-ALIGNMENT-REQUIRED
//                  PROC-BC01-GOVERNANCE-REQUIRED

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

const STRATEGY_TERMS = [
  "procurement strategy", "procurement approach",
  "competitive", "rfp", "rfso", "rfq",
  "request for proposal", "request for standing offer",
  "statement of work", "sow", "tbips", "proservices",
  "standing offer", "supply arrangement",
  "national master standing offer", "open competition",
];

const SOLE_SOURCE_TERMS = [
  "sole source", "sole-source", "non-competitive",
  "noncompetitive", "limited tendering", "single source",
  "single-source", "no competition", "without competition",
];

const JUSTIFICATION_TERMS = [
  "justified", "justification", "exception", "rationale",
  "applicable", "authority", "treasury board", "pursuant",
  "under section", "only source", "only supplier", "unique",
  "proprietary", "pressing emergency", "national security",
];

const HIGH_VALUE_TERMS = [
  "million", " m$", "$m", "m cad", "000,000", "000 000",
  "capital expenditure", "multi-year", "multiyear",
  "large-scale", "enterprise", "major contract",
];

const COMPETITIVE_TERMS = [
  "competitive", "competition", "open competition",
  "rfp", "rfso", "rfq", "request for proposal",
  "tender", "competitive process", "bidding",
  "open bid", "solicitation", "open tendering",
];

const VENDOR_SELECTION_TERMS = [
  "vendor", "contractor", "supplier", "proposal",
  "bid", "bidder", "proponent", "solution provider",
];

const EVALUATION_TERMS = [
  "evaluation criteria", "evaluation framework", "scoring",
  "mandatory criteria", "rated criteria", "point-rated",
  "assessment criteria", "selection criteria",
  "evaluation plan", "technical criteria", "financial criteria",
  "pass/fail", "mandatory requirements",
];

const OUTSOURCE_TERMS = [
  "outsourc", "managed service", "service provider",
  "third party", "third-party", "contracted",
  "contractor", "vendor-delivered", "external delivery",
  "external provider",
];

const CONTRACT_MGMT_TERMS = [
  "contract management", "contract oversight",
  "contract monitoring", "service level", "sla",
  "performance monitoring", "contract performance",
  "vendor management", " kpi", "performance indicator",
  "contract governance", "contract review",
];

const PROCUREMENT_TIMELINE_TERMS = [
  "procurement", "contract award", "rfp", "tender",
  "solicitation", "vendor selection", "award",
  "contract start", "contract commencement",
];

const GOVERNANCE_PROCUREMENT_TERMS = [
  "procurement", "contracting authority", "procurement authority",
  "approval authority", "contract approval", "delegated authority",
  "procurement officer", "supply officer", "contracting officer",
  "delegated financial", "financial signing authority",
];

// ─── Rule 1: Procurement strategy required when section is authored ───────────
// Trigger:  procurement section is non-blank.
// Require:  procurement narrative names a recognized vehicle or approach.
// Severity: BLOCK
// Section:  S3_4_1_PROC → procurementNarrative

const procStrategyRequired: ValidationRule = {
  id: "PROC-BC01-STRATEGY-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC", "procurementNarrative");
    if (!procurement) return []; // Section not yet authored — rule does not fire

    const mentionsStrategy = contains(procurement, ...STRATEGY_TERMS);
    if (mentionsStrategy) return [];

    // Check if they've at least mentioned sole-source (covered by rule 2)
    const mentionsSoleSource = contains(procurement, ...SOLE_SOURCE_TERMS);
    if (mentionsSoleSource) return [];

    return [reg_block(
      "PROC-BC01-STRATEGY-REQUIRED",
      "S3_4_1_PROC",
      "procurementNarrative",
      "Procurement section is present but no procurement strategy or vehicle is identified.",
      "In section 3.4.1 Procurement, identify the procurement strategy and vehicle to be used (e.g., RFP, RFSO, TBIPS, ProServices, Competitive Process). If sole-source is planned, see applicable sole-source justification requirement.",
    )];
  },
};

// ─── Rule 2: Sole-source justification required ───────────────────────────────
// Trigger:  procurement mentions sole-source/non-competitive terms.
// Require:  procurement mentions justification or applicable authority.
// Severity: BLOCK
// Section:  S3_4_1_PROC → procurementNarrative

const procSoleSourceJustificationRequired: ValidationRule = {
  id: "PROC-BC01-SOLE-SOURCE-JUSTIFICATION-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC", "procurementNarrative");
    if (!procurement) return [];

    const mentionsSoleSource = contains(procurement, ...SOLE_SOURCE_TERMS);
    if (!mentionsSoleSource) return [];

    const mentionsJustification = contains(procurement, ...JUSTIFICATION_TERMS);
    if (mentionsJustification) return [];

    return [reg_block(
      "PROC-BC01-SOLE-SOURCE-JUSTIFICATION-REQUIRED",
      "S3_4_1_PROC",
      "procurementNarrative",
      "Sole-source or non-competitive procurement is referenced but no justification or regulatory authority is cited.",
      "In section 3.4.1 Procurement, provide the justification for sole-source procurement and cite the applicable exception under contracting regulations (e.g., national security, proprietary rights, pressing emergency, single qualified supplier).",
    )];
  },
};

// ─── Rule 3: Competitive approach rationale for significant expenditures ───────
// Trigger:  costs or procurement section references high-value spend indicators.
// Require:  procurement mentions a competitive approach (or sole-source is justified).
// Severity: WARN
// Section:  S3_4_1_PROC → procurementNarrative

const procCompetitiveRationaleRequired: ValidationRule = {
  id: "PROC-BC01-COMPETITIVE-RATIONALE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const costs       = getText(formData, "S3_2_COSTS",    "costsNarrative");
    const procurement = getText(formData, "S3_4_1_PROC",   "procurementNarrative");

    if (!costs || !procurement) return [];

    const isHighValue =
      contains(costs,       ...HIGH_VALUE_TERMS) ||
      contains(procurement, ...HIGH_VALUE_TERMS);

    if (!isHighValue) return [];

    // Already covered: competitive present, or sole-source justified
    const mentionsCompetitive = contains(procurement, ...COMPETITIVE_TERMS);
    if (mentionsCompetitive) return [];

    const mentionsSoleSource = contains(procurement, ...SOLE_SOURCE_TERMS);
    if (mentionsSoleSource) return [];

    return [reg_warn(
      "PROC-BC01-COMPETITIVE-RATIONALE-REQUIRED",
      "S3_4_1_PROC",
      "procurementNarrative",
      "Significant expenditure is referenced but no competitive procurement approach is identified in the procurement section.",
      "In section 3.4.1 Procurement, describe the competitive procurement approach (e.g., open RFP, RFSO, TBIPS) for this expenditure level, or provide the rationale if a non-competitive approach is used.",
    )];
  },
};

// ─── Rule 4: Evaluation criteria when vendor selection is implied ─────────────
// Trigger:  procurement mentions vendor/contractor/bidder/proposal terms.
// Require:  procurement mentions evaluation criteria framework.
// Severity: BLOCK
// Section:  S3_4_1_PROC → procurementNarrative

const procEvaluationCriteriaRequired: ValidationRule = {
  id: "PROC-BC01-EVALUATION-CRITERIA-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC", "procurementNarrative");
    if (!procurement) return [];

    const mentionsVendorSelection = contains(procurement, ...VENDOR_SELECTION_TERMS);
    if (!mentionsVendorSelection) return [];

    const mentionsEvaluation = contains(procurement, ...EVALUATION_TERMS);
    if (mentionsEvaluation) return [];

    return [reg_block(
      "PROC-BC01-EVALUATION-CRITERIA-REQUIRED",
      "S3_4_1_PROC",
      "procurementNarrative",
      "Vendor or contractor selection is referenced but no evaluation criteria framework is mentioned.",
      "In section 3.4.1 Procurement, reference the evaluation criteria that will be used to assess proposals (e.g., mandatory pass/fail requirements, technical and financial rated criteria, weighting methodology).",
    )];
  },
};

// ─── Rule 5: Procurement timeline in implementation schedule ─────────────────
// Trigger:  both schedule and procurement sections are authored.
// Require:  schedule narrative references procurement milestones.
// Severity: WARN
// Section:  S3_4_2_SCHEDULE → scheduleApproachNarrative

const procScheduleAlignmentRequired: ValidationRule = {
  id: "PROC-BC01-SCHEDULE-ALIGNMENT-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const schedule    = getText(formData, "S3_4_2_SCHEDULE", "scheduleApproachNarrative");
    const procurement = getText(formData, "S3_4_1_PROC",     "procurementNarrative");

    if (!schedule || !procurement) return [];

    const mentionsProcurementInSchedule = contains(schedule, ...PROCUREMENT_TIMELINE_TERMS);
    if (mentionsProcurementInSchedule) return [];

    return [reg_warn(
      "PROC-BC01-SCHEDULE-ALIGNMENT-REQUIRED",
      "S3_4_2_SCHEDULE",
      "scheduleApproachNarrative",
      "Procurement is planned but the implementation schedule does not reference procurement milestones.",
      "In section 3.4.2 Schedule, include key procurement milestones (e.g., RFP issuance, bid closing, contract award, vendor onboarding) to ensure procurement and delivery timelines are aligned.",
    )];
  },
};

// ─── Rule 6: Contract management strategy when outsourcing is involved ────────
// Trigger:  procurement mentions outsourcing/managed services/contractor terms.
// Require:  procurement or governance section mentions contract management terms.
// Severity: BLOCK
// Section:  S3_4_1_PROC → procurementNarrative

const procContractMgmtRequired: ValidationRule = {
  id: "PROC-BC01-CONTRACT-MGMT-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC", "procurementNarrative");
    if (!procurement) return [];

    const mentionsOutsourcing = contains(procurement, ...OUTSOURCE_TERMS);
    if (!mentionsOutsourcing) return [];

    const governance = getText(formData, "S5_1_GOV_OVERSIGHT", "narrative");

    const mentionsContractMgmt =
      contains(procurement, ...CONTRACT_MGMT_TERMS) ||
      contains(governance,  ...CONTRACT_MGMT_TERMS);

    if (mentionsContractMgmt) return [];

    return [reg_block(
      "PROC-BC01-CONTRACT-MGMT-REQUIRED",
      "S3_4_1_PROC",
      "procurementNarrative",
      "Outsourcing or a managed service is referenced but no contract management strategy is identified.",
      "In section 3.4.1 Procurement or section 5.1 Governance and Oversight, describe the contract management approach including SLA monitoring, performance KPIs, and responsibilities for vendor oversight.",
    )];
  },
};

// ─── Rule 7 (bonus): Procurement authority in governance section ──────────────
// Trigger:  both procurement and governance sections are authored.
// Require:  governance names the procurement/contracting authority.
// Severity: WARN
// Section:  S5_1_GOV_OVERSIGHT → narrative

const procGovernanceRequired: ValidationRule = {
  id: "PROC-BC01-GOVERNANCE-REQUIRED",
  standard: "REGULATORY",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const procurement = getText(formData, "S3_4_1_PROC",      "procurementNarrative");
    const governance  = getText(formData, "S5_1_GOV_OVERSIGHT", "narrative");

    if (!procurement || !governance) return [];

    const mentionsProcurementGov = contains(governance, ...GOVERNANCE_PROCUREMENT_TERMS);
    if (mentionsProcurementGov) return [];

    return [reg_warn(
      "PROC-BC01-GOVERNANCE-REQUIRED",
      "S5_1_GOV_OVERSIGHT",
      "narrative",
      "Procurement is planned but the governance section does not identify the contracting or procurement authority.",
      "In section 5.1 Governance and Oversight, identify the designated contracting authority and the delegated financial signing authority for procurement under this investment.",
    )];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const procurementBC01Rules: ValidationRule[] = [
  procStrategyRequired,                  // BLOCK
  procSoleSourceJustificationRequired,   // BLOCK
  procEvaluationCriteriaRequired,        // BLOCK
  procContractMgmtRequired,              // BLOCK
  procCompetitiveRationaleRequired,      // WARN
  procScheduleAlignmentRequired,         // WARN
  procGovernanceRequired,                // WARN
];
