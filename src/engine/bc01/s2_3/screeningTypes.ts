// src/engine/bc01/s2_3/screeningTypes.ts
// Pass 1 — engine core types (backward-compatible with ScreeningGateTable)

// ── Legacy types (kept for ScreeningGateTable / existing serialization) ─────

export type ScreeningResult = "Yes" | "No";
/**
 * Screening verdict for a single option.
 *
 * Level 5 — Appendix C — Zero optimistic fallback:
 *   BASELINE      — Status Quo; immutable reference, not evaluated.
 *   VIABLE        — All criteria evaluated; deal-breakers pass; threshold met.
 *   DISCOUNTED    — Any deal-breaker explicitly failed.
 *   INDETERMINATE — One or more criteria lack evidence; verdict cannot be computed.
 *                   Evidence is mandatory before a verdict can be VIABLE or DISCOUNTED.
 *                   A verdict is NEVER optimistic by default.
 */
export type ScreeningVerdict = "BASELINE" | "VIABLE" | "DISCOUNTED" | "INDETERMINATE";
export type ScreeningCriterionId = string;

// ── Pass-1: new granular evaluation status ────────────────────────────────────

/**
 * Three-way status per criterion:
 * - "pass"                 → criterion met
 * - "fail"                 → criterion not met (deal-breaker → DISCOUNTED)
 * - "insufficient_evidence"→ cannot determine yet; does NOT disqualify
 *                           but BLOCKS CONFIRM (see hasMissingEvidence)
 */
export type EvaluationStatus = "pass" | "fail" | "insufficient_evidence";

// ── Pass-1: flag rules and flags ──────────────────────────────────────────────

export interface FlagRule {
  condition: "threshold" | "keyword" | "custom";
  threshold?: number;
  keywords?: string[];
  flagLabel: string;
  severity: "info" | "warning" | "critical";
}

export interface ScreeningFlag {
  criterionId: string;
  label: string;
  severity: "info" | "warning" | "critical";
}

// ── Screening criterion (extended — backward-compatible) ──────────────────────

/**
 * All existing fields preserved.
 * New fields are optional so ScreeningGateTable is unaffected.
 */
export interface ScreeningCriterion {
  id: ScreeningCriterionId;
  label: string;
  dealBreaker?: boolean;
  // Pass-1 extensions
  evaluationType?: "binary" | "threshold" | "keyword" | "count";
  evidencePrompt?: string;
  /**
   * Threshold configuration.
   * Legacy fields (min/max) used by screeningEngine.ts — do NOT remove.
   * Level 5 UX fields (operator/value) used by S2.1B table editor.
   * Both coexist; engine reads min/max, UI writes operator/value.
   */
  thresholdConfig?: {
    min?: number;              // legacy — screeningEngine.ts reads this
    max?: number;              // legacy — screeningEngine.ts reads this
    operator?: "lte" | "gte"; // Level 5 UX (ScreeningGateCriteriaTable)
    value?: number;            // Level 5 UX (ScreeningGateCriteriaTable)
    unit?: string;
  };
  flagRules?: FlagRule[];
}

// ── Pass-1: CriterionResult ───────────────────────────────────────────────────

export interface CriterionResult {
  criterionId: string;
  status: EvaluationStatus;
  reason: string;
  evidenceRefs: string[];
  /** Who produced this result */
  evaluatedBy: "ai" | "rule" | "override";
  /** 0–1, only when evaluatedBy="ai" */
  confidence?: number;
}

// ── Pass-1: MethodologySnapshot ───────────────────────────────────────────────

export interface MethodologySnapshot {
  /** ISO timestamp used as opaque version identifier */
  version: string;
  /** SHA-256 of stableStringify({ criteria, viabilityRule, scoringMatrixSpecMeta }) */
  hash: string;
  criteria: ScreeningCriterion[];
  viabilityRule: {
    dealBreakerIds: string[];
    minYesCount: number;
    totalCriteria: number;
  };
  scoringMatrixSpecMeta?: Record<string, unknown>;
  lockedBy: string;
  lockedAt: string; // ISO
}

// ── Pass-1: EliminationLog ────────────────────────────────────────────────────

export interface EliminationLogEntry {
  id: string;
  optionId: string;
  /** Snapshot of the option name at the time of elimination */
  optionNameSnapshot: string;
  failedCriterionId: string;
  /**
   * Label of the criterion captured at evaluation time.
   * Preserved for audit readability if the label changes in a future schema version.
   */
  criterionLabelSnapshot: string;
  reason: string;
  /** All evidence reference IDs provided for this criterion (Level 5 Appendix C) */
  evidenceRefs: string[];
  /** ACTIVE: live record; SUPERSEDED: invalidated by Reset A or Reset B */
  status: "ACTIVE" | "SUPERSEDED";
  supersededAt?: string; // ISO
  methodologyVersion: string;
  /**
   * SHA-256 hash of the MethodologySnapshot at evaluation time.
   * Used to cross-reference log entries against the locked snapshot.
   */
  methodologyHash: string;
  createdAt: string; // ISO
  actor: string;
}

// ── Pass-1: OverrideRecord ────────────────────────────────────────────────────

export interface OverrideRecord {
  finalVerdict: ScreeningVerdict;
  overrideReason: string;
  overriddenBy: string;
  overriddenAt: string; // ISO
  methodologyVersion: string;
  /** True when the methodology changed after this override was created */
  stale: boolean;
  staleReason?: string;
  staleAt?: string; // ISO
}

// ── Pass-1: Evidence types ────────────────────────────────────────────────────

/** Evidence provided for a single criterion */
export interface CriterionEvidence {
  textJustification?: string;
  checkedItems?: string[];
  numericValue?: number;
  evidenceRefs?: string[];
}

/** Full evidence bundle for one option (S2.2 input to screeningEngine) */
export interface OptionEvidence {
  optionId: string;
  evidenceByCriterionId: Record<string, CriterionEvidence>;
}

// ── Legacy ScreeningCell + ScreeningOptionDecision (unchanged) ────────────────

export interface ScreeningCell {
  id: ScreeningCriterionId;
  label: string;
  result: ScreeningResult;
  justification?: string;
}

export interface ScreeningOptionDecision {
  optionId: string;
  criteria: ScreeningCell[];
  computedVerdict: ScreeningVerdict;
  finalVerdict: ScreeningVerdict;
  override?: boolean;
  overrideReason?: string;
}

export interface S2_3_SCREENING {
  decisions: ScreeningOptionDecision[];
  viableOptionIds: string[];
  screenedAt: string; // ISO
  confirmed: boolean;
  screeningNarrative?: string;
}

/**
 * Backward-compat alias — BC01_SCHEMA.v2.ts re-exports this name.
 * @deprecated Use ScreeningOptionDecision directly.
 */
export type ScreeningCriterionDecision = ScreeningOptionDecision;

// ── ScreeningState (extended — new fields appended) ───────────────────────────

/**
 * Legacy fields preserved for ScreeningGateTable compatibility.
 * Pass-1 fields added at the bottom; all have safe defaults in emptyState.
 */
export interface ScreeningState {
  // ── Legacy ──────────────────────────────────────────────────────────────────
  decisionsByOptionId: Record<
    string,
    {
      optionId: string;
      criteriaById: Record<ScreeningCriterionId, ScreeningCell>;
      computedVerdict: ScreeningVerdict;
      finalVerdict: ScreeningVerdict;
      override: boolean;
      overrideReason: string;
    }
  >;
  criteriaOrder: ScreeningCriterionId[];
  viableOptionIds: string[];
  screenedAt: string | null;
  confirmed: boolean;

  // ── Pass-1 extensions ────────────────────────────────────────────────────────
  /** The locked methodology snapshot used for all evaluations */
  methodologySnapshot?: MethodologySnapshot;
  /** CriterionResult[] per option from screeningEngine */
  criterionResultsByOptionId: Record<string, CriterionResult[]>;
  /** Computed flags per option from screeningEngine */
  computedFlagsByOptionId: Record<string, ScreeningFlag[]>;
  /** Append-only elimination log */
  eliminationLog: EliminationLogEntry[];
  /** Full override audit records per option */
  overrideRecordsByOptionId: Record<string, OverrideRecord>;
  /**
   * True when any OverrideRecord has stale=true.
   * Blocks CONFIRM until all stale overrides are re-confirmed.
   */
  hasStaleOverrides: boolean;
  /**
   * True when any CriterionResult has status="insufficient_evidence".
   * Blocks CONFIRM (does NOT change computedVerdict to DISCOUNTED).
   */
  hasMissingEvidence: boolean;
}

// ── Legacy helpers (unchanged) ────────────────────────────────────────────────

export type BaselinePredicate = (option: any) => boolean;

export interface ScreeningComputeConfig {
  baselinePredicate?: BaselinePredicate;
  includeBaselineInViableIds?: boolean;
  viabilityThresholdYesCount?: number;
  totalCriteriaCountForThreshold?: number;
}
