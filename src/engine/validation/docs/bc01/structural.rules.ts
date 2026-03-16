// src/engine/validation/docs/bc01/structural.rules.ts
// ─── Structural Completeness Rules for BC-01 ─────────────────────────────────
// Standard: TBS (BLOCK) + PMI (WARN)
//
// These rules replace the legacy simpleValidator.js / BC01_SCHEMA.ts (v1)
// validation pipeline.  All sectionIds and fieldKeys are BC01_SCHEMA.v2 IDs.
//
// Migration table (v1 ruleId → new ruleId):
//   BC01-S2-R1  → TBS-BC01-PROBLEM-REQUIRED
//   BC01-S2-R2  → PMI-BC01-EVIDENCE-ADVISORY          (WARN, PMI standard)
//   BC01-S2-R3  → (dropped — impact_of_inaction has no distinct v2 field)
//   BC01-S3-R1  → TBS-BC01-STRATEGIC-FIT-REQUIRED
//   BC01-S4-R1  → TBS-BC01-IN-SCOPE-REQUIRED
//   BC01-S5-R1  → TBS-BC01-ASSUMPTIONS-REQUIRED
//   BC01-S5-R2  → TBS-BC01-CONSTRAINTS-REQUIRED
//   BC01-S6-R1  → TBS-BC01-OPTIONS-ANALYSIS-REQUIRED  (merged with S6-R2)
//   BC01-S6-R2  → TBS-BC01-OPTIONS-ANALYSIS-REQUIRED  (merged with S6-R1)
//   BC01-S7-R1  → TBS-BC01-RECOMMENDATION-REQUIRED    (merged with S7-R2)
//   BC01-S7-R2  → TBS-BC01-RECOMMENDATION-REQUIRED    (merged with S7-R1)
//   BC01-S8-R1  → TBS-BC01-PROS-CONS-REQUIRED
//   BC01-S8-R2  → TBS-BC01-OUTCOME-MGMT-REQUIRED
//   BC01-S8-R3  → PMI-BC01-PERFORMANCE-MEASURE-ADVISORY (WARN, PMI standard)
//   BC01-S9-R1  → TBS-BC01-COSTS-REQUIRED             (merged with S9-R2)
//   BC01-S9-R2  → TBS-BC01-COSTS-REQUIRED             (merged with S9-R1)
//   BC01-S10-R1 → TBS-BC01-CBA-REQUIRED
//   BC01-S11-R1 → TBS-BC01-RISK-SUMMARY-REQUIRED
//   BC01-S12-R1 → TBS-BC01-SCHEDULE-REQUIRED
//   BC01-S13-R1 → TBS-BC01-STAKEHOLDERS-REQUIRED
//   BC01-S14-R1 → TBS-BC01-GOV-OVERSIGHT-REQUIRED     (merged with S14-R2)
//   BC01-S14-R2 → TBS-BC01-GOV-OVERSIGHT-REQUIRED     (merged with S14-R1)
//   BC01-S1-I1  → (dropped — INFO/derived section; not a runtime check)
//
// Rule count: 15 BLOCK (TBS) + 2 WARN (PMI) = 17 registered rules
//             (21 v1 rules → 17 after merging duplicates and dropping non-rules)

import type { ValidationRule, ValidationInput } from "../../registry/types";
import type { ValidationIssue } from "../../types";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Safely resolve a nested key path in an unknown object. */
function get(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  return false;
}

/** Build a standard BLOCK issue. */
function block(
  ruleId: string,
  sectionId: string,
  fieldKey: string,
  message: string,
  remedyLabel: string
): ValidationIssue {
  return {
    ruleId,
    standard: "TBS",
    severity: "BLOCK",
    sectionId,
    message,
    appliesTo: { fieldKey },
    remedy: { label: remedyLabel },
  };
}

/** Build a standard WARN issue. */
function warn(
  ruleId: string,
  sectionId: string,
  fieldKey: string,
  message: string,
  remedyLabel: string
): ValidationIssue {
  return {
    ruleId,
    standard: "PMI",
    severity: "WARN",
    sectionId,
    message,
    appliesTo: { fieldKey },
    remedy: { label: remedyLabel },
  };
}

// ─── 1. Problem / Opportunity Statement ──────────────────────────────────────
// Migrated from: BC01-S2-R1

const problemRequired: ValidationRule = {
  id: "TBS-BC01-PROBLEM-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S1_3_1_PROBLEM", "narrative"))) {
      return [block(
        "TBS-BC01-PROBLEM-REQUIRED",
        "S1_3_1_PROBLEM",
        "narrative",
        "Problem/Opportunity Statement is required (TBS §1.3.1).",
        "In section 1.3.1, write a clear statement of the problem or opportunity driving this investment."
      )];
    }
    return [];
  },
};

// ─── 2. Strategic Fit ─────────────────────────────────────────────────────────
// Migrated from: BC01-S3-R1

const strategicFitRequired: ValidationRule = {
  id: "TBS-BC01-STRATEGIC-FIT-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S1_2_STRATEGIC_FIT", "narrative"))) {
      return [block(
        "TBS-BC01-STRATEGIC-FIT-REQUIRED",
        "S1_2_STRATEGIC_FIT",
        "narrative",
        "Strategic Fit is required (TBS §1.2).",
        "In section 1.2, explain how the investment aligns with current plans, priorities, and strategic outcomes."
      )];
    }
    return [];
  },
};

// ─── 3. In-Scope Definition ───────────────────────────────────────────────────
// Migrated from: BC01-S4-R1

const inScopeRequired: ValidationRule = {
  id: "TBS-BC01-IN-SCOPE-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S1_4_1A_IN_SCOPE", "narrative"))) {
      return [block(
        "TBS-BC01-IN-SCOPE-REQUIRED",
        "S1_4_1A_IN_SCOPE",
        "narrative",
        "In-scope definition is required (TBS §1.4.1).",
        "In section 1.4.1 In-Scope, define what is included (services, features, locations, populations)."
      )];
    }
    return [];
  },
};

// ─── 4. Assumptions ───────────────────────────────────────────────────────────
// Migrated from: BC01-S5-R1

const assumptionsRequired: ValidationRule = {
  id: "TBS-BC01-ASSUMPTIONS-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S1_3_3_ASSUMPTIONS", "narrative"))) {
      return [block(
        "TBS-BC01-ASSUMPTIONS-REQUIRED",
        "S1_3_3_ASSUMPTIONS",
        "narrative",
        "At least one assumption is required (TBS §1.3.3).",
        "In section 1.3.3, list key assumptions that must hold true (demand, staffing, approvals, partner availability)."
      )];
    }
    return [];
  },
};

// ─── 5. Constraints ───────────────────────────────────────────────────────────
// Migrated from: BC01-S5-R2

const constraintsRequired: ValidationRule = {
  id: "TBS-BC01-CONSTRAINTS-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S1_3_4_CONSTRAINTS", "narrative"))) {
      return [block(
        "TBS-BC01-CONSTRAINTS-REQUIRED",
        "S1_3_4_CONSTRAINTS",
        "narrative",
        "At least one constraint is required (TBS §1.3.4).",
        "In section 1.3.4, list constraints (budget ceilings, timelines, technology limits, regulatory requirements)."
      )];
    }
    return [];
  },
};

// ─── 6. Options Analysis Rationale ───────────────────────────────────────────
// Migrated from: BC01-S6-R1 + BC01-S6-R2 (merged — both checked the same section)

const optionsAnalysisRequired: ValidationRule = {
  id: "TBS-BC01-OPTIONS-ANALYSIS-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S2_4_RATIONALE", "narrative"))) {
      return [block(
        "TBS-BC01-OPTIONS-ANALYSIS-REQUIRED",
        "S2_4_RATIONALE",
        "narrative",
        "Rationale for discounted and viable options is required (TBS §2.4).",
        "In section 2.4, explain why options were retained or discarded based on screening (include baseline / do-nothing option)."
      )];
    }
    return [];
  },
};

// ─── 7. Recommendation ───────────────────────────────────────────────────────
// Migrated from: BC01-S7-R1 + BC01-S7-R2 (merged — both checked the same section)

const recommendationRequired: ValidationRule = {
  id: "TBS-BC01-RECOMMENDATION-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S4_2_1_RECOMMENDATION", "narrative"))) {
      return [block(
        "TBS-BC01-RECOMMENDATION-REQUIRED",
        "S4_2_1_RECOMMENDATION",
        "narrative",
        "Recommendation is required (TBS §4.2.1).",
        "In section 4.2.1, state the preferred option and explain clearly why this option is recommended over alternatives."
      )];
    }
    return [];
  },
};

// ─── 8. Advantages and Disadvantages (Pros / Cons) ───────────────────────────
// Migrated from: BC01-S8-R1

const prosConsRequired: ValidationRule = {
  id: "TBS-BC01-PROS-CONS-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S3_8_PROS_CONS", "comparativeSummary"))) {
      return [block(
        "TBS-BC01-PROS-CONS-REQUIRED",
        "S3_8_PROS_CONS",
        "comparativeSummary",
        "Advantages and Disadvantages summary is required (TBS §3.8).",
        "In section 3.8, summarize key advantages and disadvantages for each viable option."
      )];
    }
    return [];
  },
};

// ─── 9. Outcome Management Strategy ─────────────────────────────────────────
// Migrated from: BC01-S8-R2 (benefit_owner → outcome management owner in v2)

const outcomeMgmtRequired: ValidationRule = {
  id: "TBS-BC01-OUTCOME-MGMT-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S5_3_OUTCOME_MGMT", "narrative"))) {
      return [block(
        "TBS-BC01-OUTCOME-MGMT-REQUIRED",
        "S5_3_OUTCOME_MGMT",
        "narrative",
        "Outcome Management Strategy is required (TBS §5.3).",
        "In section 5.3, describe how benefits and outcomes will be managed, measured, and realized. Include the benefit owner (role or committee)."
      )];
    }
    return [];
  },
};

// ─── 10. Costs ────────────────────────────────────────────────────────────────
// Migrated from: BC01-S9-R1 + BC01-S9-R2 (CAPEX + OPEX merged into costs narrative)

const costsRequired: ValidationRule = {
  id: "TBS-BC01-COSTS-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S3_2_COSTS", "costsNarrative"))) {
      return [block(
        "TBS-BC01-COSTS-REQUIRED",
        "S3_2_COSTS",
        "costsNarrative",
        "Cost analysis is required (TBS §3.2). Include CAPEX and OPEX (use 0 if none).",
        "In section 3.2, describe total cost of ownership including CAPEX, OPEX, and cost assumptions."
      )];
    }
    return [];
  },
};

// ─── 11. Cost-Benefit Analysis ────────────────────────────────────────────────
// Migrated from: BC01-S10-R1

const cbaRequired: ValidationRule = {
  id: "TBS-BC01-CBA-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S3_3_CBA", "financialAnalysisNarrative"))) {
      return [block(
        "TBS-BC01-CBA-REQUIRED",
        "S3_3_CBA",
        "financialAnalysisNarrative",
        "Cost-Benefit Analysis is required (TBS §3.3).",
        "In section 3.3, describe how costs are weighed against benefits. Include qualitative justification if strict financials are unavailable."
      )];
    }
    return [];
  },
};

// ─── 12. Risk Summary ─────────────────────────────────────────────────────────
// Migrated from: BC01-S11-R1

const riskSummaryRequired: ValidationRule = {
  id: "TBS-BC01-RISK-SUMMARY-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative"))) {
      return [block(
        "TBS-BC01-RISK-SUMMARY-REQUIRED",
        "S3_5_1_RISK_SUMMARY",
        "riskSummaryNarrative",
        "Option Risk Summary is required (TBS §3.5.1).",
        "In section 3.5.1, summarize key risks by option and describe the overall risk profile."
      )];
    }
    return [];
  },
};

// ─── 13. Schedule and Approach ────────────────────────────────────────────────
// Migrated from: BC01-S12-R1

const scheduleRequired: ValidationRule = {
  id: "TBS-BC01-SCHEDULE-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S3_4_2_SCHEDULE", "scheduleApproachNarrative"))) {
      return [block(
        "TBS-BC01-SCHEDULE-REQUIRED",
        "S3_4_2_SCHEDULE",
        "scheduleApproachNarrative",
        "Schedule and Approach is required (TBS §3.4.2).",
        "In section 3.4.2, describe delivery approach, high-level timeline, and key milestones."
      )];
    }
    return [];
  },
};

// ─── 14. Stakeholders ─────────────────────────────────────────────────────────
// Migrated from: BC01-S13-R1

const stakeholdersRequired: ValidationRule = {
  id: "TBS-BC01-STAKEHOLDERS-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S1_4_2_STAKEHOLDERS", "narrative"))) {
      return [block(
        "TBS-BC01-STAKEHOLDERS-REQUIRED",
        "S1_4_2_STAKEHOLDERS",
        "narrative",
        "Stakeholder Analysis is required (TBS §1.4.2).",
        "In section 1.4.2, identify key stakeholders and summarize their interests and influence."
      )];
    }
    return [];
  },
};

// ─── 15. Governance and Oversight ─────────────────────────────────────────────
// Migrated from: BC01-S14-R1 + BC01-S14-R2 (merged — both checked governance)

const govOversightRequired: ValidationRule = {
  id: "TBS-BC01-GOV-OVERSIGHT-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S5_1_GOV_OVERSIGHT", "narrative"))) {
      return [block(
        "TBS-BC01-GOV-OVERSIGHT-REQUIRED",
        "S5_1_GOV_OVERSIGHT",
        "narrative",
        "Governance and Oversight is required (TBS §5.1).",
        "In section 5.1, describe governance structure, approval authority, decision gates, and oversight mechanisms."
      )];
    }
    return [];
  },
};

// ─── PMI WARN: Drivers for Change (evidence) ─────────────────────────────────
// Migrated from: BC01-S2-R2 (evidence WARN)

const evidenceAdvisory: ValidationRule = {
  id: "PMI-BC01-EVIDENCE-ADVISORY",
  standard: "PMI",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S1_1_3_DRIVERS", "narrative"))) {
      return [warn(
        "PMI-BC01-EVIDENCE-ADVISORY",
        "S1_1_3_DRIVERS",
        "narrative",
        "Drivers for Change is empty. PMI recommends supporting the business need with evidence and context.",
        "In section 1.1.3, add internal and external drivers (metrics, reports, incidents, trends) that justify the investment."
      )];
    }
    return [];
  },
};

// ─── PMI WARN: Performance Measurement Strategy (baseline metrics) ────────────
// Migrated from: BC01-S8-R3 (baseline_metrics WARN)

const performanceMeasureAdvisory: ValidationRule = {
  id: "PMI-BC01-PERFORMANCE-MEASURE-ADVISORY",
  standard: "PMI",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    if (isBlank(get(formData, "S5_6_MEASURE", "narrative"))) {
      return [warn(
        "PMI-BC01-PERFORMANCE-MEASURE-ADVISORY",
        "S5_6_MEASURE",
        "narrative",
        "Performance Measurement Strategy is empty. PMI recommends defining baseline metrics and KPIs before approval.",
        "In section 5.6, define how performance will be measured (KPIs, baseline metrics, measurement cadence)."
      )];
    }
    return [];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const structuralBC01Rules: ValidationRule[] = [
  // TBS BLOCK (15 rules)
  problemRequired,
  strategicFitRequired,
  inScopeRequired,
  assumptionsRequired,
  constraintsRequired,
  optionsAnalysisRequired,
  recommendationRequired,
  prosConsRequired,
  outcomeMgmtRequired,
  costsRequired,
  cbaRequired,
  riskSummaryRequired,
  scheduleRequired,
  stakeholdersRequired,
  govOversightRequired,
  // PMI WARN (2 rules)
  evidenceAdvisory,
  performanceMeasureAdvisory,
];
