// src/engine/bc01/shared/defaultGateCriteria.ts
// Level 5 — Single source of truth for TBS BC-01 Screening Gate Criteria.
//
// This file is the ONLY location where default gate criteria are defined.
// All consumers (s2_1Utils, screeningCriteria, tests) import from here.
//
// Criteria IDs are semantic (not C1–C6). dealBreaker is explicit — never derived.
// S3 scoring criteria (with weights) are a separate concept and live in BC01_SCHEMA.v2.ts.

import type { ScreeningCriterion } from "../s2_3/screeningTypes";

export const DEFAULT_GATE_CRITERIA: ScreeningCriterion[] = [
  {
    id: "policy_compliance",
    label: "Policy / Legal / TBS compliance",
    dealBreaker: true,
    evaluationType: "binary",
    evidencePrompt:
      "Demonstrate compliance with Treasury Board policies, legal obligations, and regulatory requirements.",
  },
  {
    id: "strategic_alignment",
    label: "Strategic alignment (mandatory outcomes)",
    dealBreaker: true,
    evaluationType: "binary",
    evidencePrompt:
      "Explain how this option aligns with the approved strategic objectives and required outcomes.",
  },
  {
    id: "business_need",
    label: "Addresses the validated business need",
    dealBreaker: true,
    evaluationType: "binary",
    evidencePrompt:
      "Provide evidence that this option directly addresses the core business problem defined in Section 1.",
  },
  {
    id: "financial_affordability",
    label: "Financial affordability (CAPEX / OPEX envelope)",
    dealBreaker: true,
    evaluationType: "binary",
    evidencePrompt:
      "Demonstrate affordability within approved funding envelopes and fiscal constraints.",
  },
  {
    id: "operational_feasibility",
    label: "Operational feasibility (capacity & readiness)",
    dealBreaker: false,
    evaluationType: "binary",
    evidencePrompt:
      "Describe implementation feasibility considering organizational capacity and change readiness.",
  },
  {
    id: "risk_acceptability",
    label: "Risk acceptability (cannot exceed threshold)",
    dealBreaker: false,
    evaluationType: "binary",
    evidencePrompt:
      "Confirm that residual risk exposure remains within acceptable tolerance thresholds.",
  },
];
