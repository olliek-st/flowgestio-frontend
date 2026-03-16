// src/engine/bc01/s2_3/screeningCriteria.ts
// Level 5 — Gate criteria resolution. Single source of truth: shared/defaultGateCriteria.ts
//
// C1–C6 hardcoded identifiers are eliminated.
// buildScreeningCriteria: if custom criteria provided → use them directly (no merge).
//                          if none → return DEFAULT_GATE_CRITERIA.
// Zero arbitraire. No implicit merge. No silent dealBreaker defaults.

import type { ScreeningCriterion } from "./screeningTypes";
import { DEFAULT_GATE_CRITERIA } from "../shared/defaultGateCriteria";

export { DEFAULT_GATE_CRITERIA };

/**
 * Returns the active screening criteria for the gate engine.
 *
 * Level 5 rules:
 * - If `custom` is provided and non-empty → use it as-is (criteria come from S2.1 lock)
 * - If `custom` is absent or empty → fall back to DEFAULT_GATE_CRITERIA
 * - No merge with any hardcoded list
 * - No override by id matching
 *
 * @param custom  ScreeningCriterion[] from parseCriteriaFromS2_1 (via useScreeningGate)
 */
export function buildScreeningCriteria(
  custom?: ScreeningCriterion[]
): ScreeningCriterion[] {
  if (custom?.length) return custom;
  return DEFAULT_GATE_CRITERIA;
}
