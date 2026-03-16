// src/engine/bc01/s2_3/screeningEngine.ts
// Pass 1 — Pure computation engine. NO state, NO side effects, NO log writes.
//
// Rules:
//  - Screening is strictly binary (deal-breaker fail → DISCOUNTED)
//  - All criteria come from the MethodologySnapshot (no hardcoded C1–C6)
//  - insufficient_evidence does NOT disqualify; it only blocks CONFIRM
//  - Status Quo → BASELINE immediately, no criteria evaluated

import type {
  MethodologySnapshot,
  OptionEvidence,
  CriterionResult,
  ScreeningFlag,
  ScreeningVerdict,
  EvaluationStatus,
  ScreeningCriterion,
  CriterionEvidence,
} from "./screeningTypes";

// ── Public API ────────────────────────────────────────────────────────────────

export interface ComputeScreeningResultsOutput {
  computedVerdict: ScreeningVerdict;
  criterionResults: CriterionResult[];
  computedFlags: ScreeningFlag[];
}

/**
 * Pure function: compute screening results for one option.
 *
 * @param snapshot  - Validated MethodologySnapshot (call validateSnapshot() first)
 * @param optionEvidence - Evidence bundle for this option
 * @param isStatusQuo    - True → returns BASELINE with no criteria evaluated
 */
export function computeScreeningResults(
  snapshot: MethodologySnapshot,
  optionEvidence: OptionEvidence,
  isStatusQuo: boolean
): ComputeScreeningResultsOutput {
  // Status Quo → BASELINE unconditionally, no evaluation
  if (isStatusQuo) {
    return {
      computedVerdict: "BASELINE",
      criterionResults: [],
      computedFlags: [],
    };
  }

  const criterionResults: CriterionResult[] = [];
  const computedFlags: ScreeningFlag[] = [];

  // Evaluate each criterion from the snapshot (never hardcoded)
  for (const criterion of snapshot.criteria) {
    const evidence = optionEvidence.evidenceByCriterionId[criterion.id];

    const result = evaluateCriterion(criterion, evidence);
    criterionResults.push(result);

    // Collect flags produced by flagRules
    const flags = collectFlags(criterion, evidence);
    computedFlags.push(...flags);
  }

  const computedVerdict = deriveVerdict(
    criterionResults,
    snapshot.criteria,
    snapshot.viabilityRule
  );

  return { computedVerdict, criterionResults, computedFlags };
}

// ── Criterion evaluation ──────────────────────────────────────────────────────

function isEvidenceEmpty(evidence: CriterionEvidence | undefined): boolean {
  if (!evidence) return true;
  return (
    !evidence.textJustification?.trim() &&
    !evidence.checkedItems?.length &&
    evidence.numericValue === undefined &&
    !evidence.evidenceRefs?.length
  );
}

function evaluateCriterion(
  criterion: ScreeningCriterion,
  evidence: CriterionEvidence | undefined
): CriterionResult {
  const refs = evidence?.evidenceRefs ?? [];

  // No evidence at all → insufficient_evidence (does NOT disqualify)
  if (isEvidenceEmpty(evidence)) {
    return {
      criterionId: criterion.id,
      status: "insufficient_evidence",
      reason: `No evidence provided for criterion "${criterion.id}" (${criterion.label})`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  const evalType = criterion.evaluationType ?? "binary";

  if (evalType === "threshold") {
    return evaluateThreshold(criterion, evidence!, refs);
  }

  if (evalType === "keyword") {
    return evaluateKeyword(criterion, evidence!, refs);
  }

  // Default: binary evaluation
  return evaluateBinary(criterion, evidence!, refs);
}

/** Threshold: numericValue must satisfy criterion.thresholdConfig */
function evaluateThreshold(
  criterion: ScreeningCriterion,
  evidence: CriterionEvidence,
  refs: string[]
): CriterionResult {
  const cfg = criterion.thresholdConfig;

  if (evidence.numericValue === undefined) {
    return {
      criterionId: criterion.id,
      status: "insufficient_evidence",
      reason: `Numeric value required for threshold criterion "${criterion.id}"`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  const val = evidence.numericValue;
  const unit = cfg?.unit ?? "";

  if (cfg?.min !== undefined && val < cfg.min) {
    return {
      criterionId: criterion.id,
      status: "fail",
      reason: `Value ${val}${unit} is below minimum ${cfg.min}${unit} for criterion "${criterion.id}"`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  if (cfg?.max !== undefined && val > cfg.max) {
    return {
      criterionId: criterion.id,
      status: "fail",
      reason: `Value ${val}${unit} exceeds maximum ${cfg.max}${unit} for criterion "${criterion.id}"`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  return {
    criterionId: criterion.id,
    status: "pass",
    reason: `Value ${val}${unit} is within acceptable range for criterion "${criterion.id}"`,
    evidenceRefs: refs,
    evaluatedBy: "rule",
  };
}

/** Keyword: detects critical keywords in text evidence → fail */
function evaluateKeyword(
  criterion: ScreeningCriterion,
  evidence: CriterionEvidence,
  refs: string[]
): CriterionResult {
  const text = buildTextFromEvidence(evidence).toLowerCase();

  if (!text.trim()) {
    return {
      criterionId: criterion.id,
      status: "insufficient_evidence",
      reason: `No text evidence provided for keyword criterion "${criterion.id}"`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  // Critical keywords → fail
  const criticalRule = criterion.flagRules?.find(
    (fr) => fr.condition === "keyword" && fr.severity === "critical"
  );
  if (criticalRule?.keywords?.some((k) => text.includes(k.toLowerCase()))) {
    const matched = criticalRule.keywords.filter((k) =>
      text.includes(k.toLowerCase())
    );
    return {
      criterionId: criterion.id,
      status: "fail",
      reason: `Critical keyword(s) detected in evidence for "${criterion.id}": [${matched.join(", ")}]`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  return {
    criterionId: criterion.id,
    status: "pass",
    reason: `No blocking keywords detected for criterion "${criterion.id}"`,
    evidenceRefs: refs,
    evaluatedBy: "rule",
  };
}

/**
 * Binary: pass or fail based on textJustification / checkedItems.
 * Explicit "no"/"false"/"non" → fail; empty checkedItems → fail.
 */
function evaluateBinary(
  criterion: ScreeningCriterion,
  evidence: CriterionEvidence,
  refs: string[]
): CriterionResult {
  const text = (evidence.textJustification ?? "").trim().toLowerCase();

  const NEGATIVE_LITERALS = new Set(["no", "non", "false", "fail", "0", "n"]);
  if (NEGATIVE_LITERALS.has(text)) {
    return {
      criterionId: criterion.id,
      status: "fail",
      reason: `Explicit negative response for criterion "${criterion.id}": "${evidence.textJustification}"`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  // Empty checkedItems list (list exists but is empty) → fail
  if (evidence.checkedItems !== undefined && evidence.checkedItems.length === 0) {
    return {
      criterionId: criterion.id,
      status: "fail",
      reason: `No items checked for criterion "${criterion.id}" (binary checklist)`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }

  const justification = evidence.textJustification?.trim()
    ? `"${evidence.textJustification.trim()}"`
    : "(checklist items present)";

  return {
    criterionId: criterion.id,
    status: "pass",
    reason: `Criterion "${criterion.id}" met — ${justification}`,
    evidenceRefs: refs,
    evaluatedBy: "rule",
  };
}

// ── Flag collection ───────────────────────────────────────────────────────────

function collectFlags(
  criterion: ScreeningCriterion,
  evidence: CriterionEvidence | undefined
): ScreeningFlag[] {
  if (!criterion.flagRules?.length || isEvidenceEmpty(evidence)) return [];

  const flags: ScreeningFlag[] = [];
  const text = buildTextFromEvidence(evidence!).toLowerCase();

  for (const rule of criterion.flagRules) {
    let triggered = false;

    if (rule.condition === "keyword" && rule.keywords?.length) {
      triggered = rule.keywords.some((k) => text.includes(k.toLowerCase()));
    } else if (
      rule.condition === "threshold" &&
      rule.threshold !== undefined &&
      evidence?.numericValue !== undefined
    ) {
      triggered = evidence.numericValue >= rule.threshold;
    }
    // "custom" condition: not automatically evaluated — reserved for AI layer

    if (triggered) {
      flags.push({
        criterionId: criterion.id,
        label: rule.flagLabel,
        severity: rule.severity,
      });
    }
  }

  return flags;
}

// ── Verdict derivation ────────────────────────────────────────────────────────

/**
 * Derive BASELINE / VIABLE / DISCOUNTED / INDETERMINATE from criterion results.
 *
 * Level 5 — Appendix C — Zero optimistic fallback:
 *
 * Priority order (evaluated top-to-bottom; first match wins):
 *   1. Any deal-breaker with status="fail"          → DISCOUNTED
 *      (Explicit fail is definitive — takes priority over missing evidence.)
 *   2. Any criterion with status="insufficient_evidence" → INDETERMINATE
 *      (Evidence is mandatory. A verdict can ONLY be VIABLE or DISCOUNTED
 *       when ALL criteria have been evaluated. Absence of evidence is NOT pass.)
 *   3. passCount >= viabilityRule.minYesCount        → VIABLE
 *   4. Otherwise                                     → DISCOUNTED
 *
 * A verdict is NEVER optimistic by default.
 * INDETERMINATE is never returned after a deal-breaker fail.
 */

function deriveVerdict(
  results: CriterionResult[],
  criteria: ScreeningCriterion[],
  viabilityRule: MethodologySnapshot["viabilityRule"]
): ScreeningVerdict {
	
  const criterionById = new Map(criteria.map((c) => [c.id, c]));
  const dealBreakerSet = new Set(viabilityRule.dealBreakerIds);

  // Rule 1: any deal-breaker explicit fail → DISCOUNTED (highest priority after BASELINE)
  for (const result of results) {
    if (result.status !== "fail") continue;
    const criterion = criterionById.get(result.criterionId);
    const isDealBreaker =
      criterion?.dealBreaker === true ||
      dealBreakerSet.has(result.criterionId);
    if (isDealBreaker) return "DISCOUNTED";
  }

  // Rule 2: any unevaluated criterion → INDETERMINATE (evidence mandatory before verdict)
  // Absence of evidence is NOT pass. Never optimistic.
  const hasUnevaluated = results.some((r) => r.status === "insufficient_evidence");
  if (hasUnevaluated) return "INDETERMINATE";
  
  // Rule 3 / 4: all criteria evaluated — count passes
  const passCount = results.filter((r) => r.status === "pass").length;

  return passCount >= viabilityRule.minYesCount ? "VIABLE" : "DISCOUNTED";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTextFromEvidence(evidence: CriterionEvidence): string {
  return [
    evidence.textJustification ?? "",
    ...(evidence.checkedItems ?? []),
  ]
    .join(" ")
    .trim();
}

// ── Convenience: check if any result has insufficient_evidence ────────────────

export function hasInsufficientEvidence(results: CriterionResult[]): boolean {
  return results.some((r) => r.status === "insufficient_evidence");
}
