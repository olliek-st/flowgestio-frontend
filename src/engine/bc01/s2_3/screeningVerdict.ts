// src/engine/bc01/s2_3/screeningVerdict.ts
// Pass 1 — Thin compatibility layer.
//
// The legacy functions (computeVerdictForOption / computeAllVerdicts) are
// preserved verbatim so ScreeningGateTable and the legacy reducer path
// continue to work without modification (Pass 2 will migrate them).
//
// The new pure engine is re-exported from screeningEngine.ts for all
// Pass-1 consumers (screeningReducer EVALUATE_OPTION action).

import type {
  ScreeningComputeConfig,
  ScreeningCriterion,
  ScreeningVerdict,
  ScreeningResult,
} from "./screeningTypes";

// ── Legacy: computeVerdictForOption ──────────────────────────────────────────
// Kept intact for ScreeningGateTable / legacy reducer path.

const DEFAULT_BASELINE_PREDICATE = (option: any) =>
  option?.type === "StatusQuo" || option?.isStatusQuo === true;

/**
 * TBS Gate rules (legacy binary path):
 * - Status Quo => BASELINE
 * - Any dealBreaker "No" => DISCOUNTED
 * - Any undefined result => INDETERMINATE (absence of result is NOT "Yes")
 * - Else: YesCount >= threshold (default 5) => VIABLE else DISCOUNTED
 *
 * Level 5 — Zero optimistic fallback:
 * Removed `|| "Yes"` default. A missing result is unevaluated — NOT a pass.
 * In the legacy flow, hydrateState always initialises cells with makeDefaultCell
 * (result: "Yes"), so INDETERMINATE is only returned if external callers pass
 * undefined values — which is the correct deterministic behaviour.
 */
export function computeVerdictForOption(args: {
  option: any;
  criteria: ScreeningCriterion[];
  resultsById: Record<string, ScreeningResult>;
  config?: ScreeningComputeConfig;
}): ScreeningVerdict {
  const { option, criteria, resultsById, config } = args;

  const baselinePredicate =
    config?.baselinePredicate || DEFAULT_BASELINE_PREDICATE;
  if (baselinePredicate(option)) return "BASELINE";

  // Rule 1: any deal-breaker explicit "No" → DISCOUNTED
  const dealBreakers = criteria.filter((c) => c.dealBreaker);
  for (const c of dealBreakers) {
    const r = resultsById[c.id]; // NO fallback — undefined is not "Yes"
    if (r === "No") return "DISCOUNTED";
  }

  // Rule 2: any unevaluated criterion → INDETERMINATE (absence ≠ pass)
  const hasUnevaluated = criteria.some(
    (c) => resultsById[c.id] === undefined || resultsById[c.id] === null
  );
  if (hasUnevaluated) return "INDETERMINATE";

  // Rule 3 / 4: all criteria evaluated — count "Yes"
  const yesCount = criteria.reduce(
    (acc, c) => acc + (resultsById[c.id] === "Yes" ? 1 : 0),
    0
  );

  const threshold = config?.viabilityThresholdYesCount ?? 5;

  return yesCount >= threshold ? "VIABLE" : "DISCOUNTED";
}

// ── Legacy: computeAllVerdicts ────────────────────────────────────────────────

export function computeAllVerdicts(args: {
  options: any[];
  criteria: ScreeningCriterion[];
  resultsByOptionId: Record<string, Record<string, ScreeningResult>>;
  overridesByOptionId?: Record<
    string,
    { override: boolean; finalVerdict: ScreeningVerdict }
  >;
  config?: ScreeningComputeConfig;
}): {
  computedByOptionId: Record<string, ScreeningVerdict>;
  viableOptionIds: string[];
} {
  const { options, criteria, resultsByOptionId, overridesByOptionId, config } =
    args;

  const computedByOptionId: Record<string, ScreeningVerdict> = {};
  const viableOptionIds: string[] = [];
  const includeBaseline = config?.includeBaselineInViableIds ?? true;

  for (const opt of options) {
    const resultsById = resultsByOptionId[opt.id] || {};
    const computed = computeVerdictForOption({
      option: opt,
      criteria,
      resultsById,
      config,
    });
    computedByOptionId[opt.id] = computed;

    const ovr = overridesByOptionId?.[opt.id];
    const finalVerdict = ovr?.override ? ovr.finalVerdict : computed;

    if (finalVerdict === "VIABLE") viableOptionIds.push(opt.id);
    if (includeBaseline && finalVerdict === "BASELINE")
      viableOptionIds.push(opt.id);
  }

  return { computedByOptionId, viableOptionIds };
}

// ── Pass-1: re-export from screeningEngine ────────────────────────────────────

export {
  computeScreeningResults,
  hasInsufficientEvidence,
} from "./screeningEngine";
