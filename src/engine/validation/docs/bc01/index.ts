// src/engine/validation/docs/bc01/index.ts
// ─── BC-01 Rule Registry ─────────────────────────────────────────────────────
// Aggregates all registered BC-01 rules and exposes a filtered view.
// To add new rules: import and push into the relevant pack below.

import type { ValidationStandard } from "../../types";
import type { ValidationRule } from "../../registry/types";
import { tbsBC01Rules } from "./tbs.rules";
import { pmiBC01Rules } from "./pmi.rules";
import { structuralBC01Rules } from "./structural.rules";

// All BC-01 rules, grouped by standard for easy audit.
// TBS (2 existing + 15 structural = 17 BLOCK) + PMI (2 existing + 2 structural = 4 WARN).
// Phase 2+: add REGULATORY pack here.
const ALL_BC01_RULES: ValidationRule[] = [
  ...tbsBC01Rules,
  ...pmiBC01Rules,
  ...structuralBC01Rules,
  // Phase 2: ...regulatoryBC01Rules
  // Phase 3: ...industryBC01Rules
];

/**
 * Returns BC-01 rules for the requested standards only.
 * Passing all three standards returns the full Phase 1 rule set.
 */
export function getBC01Rules(standards: ValidationStandard[]): ValidationRule[] {
  return ALL_BC01_RULES.filter((r) => standards.includes(r.standard));
}
