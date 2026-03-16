// src/engine/bc01/s2_1/s2_1Utils.ts
// Pass 1 — S2.1 utilities: build MethodologySnapshot from BC01_SCHEMA.v2 form data.
//
// Integration contract:
//   - Called when the user toggles `methodologyLocked = true` on the S2_1_EVAL_CRITERIA section
//   - Triggers Reset A (global) in screeningReducer when the snapshot hash changes
//   - The hook `useLockMethodologyEffect` watches formData.S2_1_EVAL_CRITERIA and
//     dispatches LOCK_METHODOLOGY when methodologyLocked transitions to true
//     or when the snapshot hash changes after lock (re-lock on edit)
//
// Level 5 — Single source of truth:
//   parseCriteriaFromS2_1 reads ONLY screeningGateCriteriaJson.
//   Falls back to DEFAULT_GATE_CRITERIA (shared/defaultGateCriteria.ts).
//   Never reads strategicCriteriaJson / feasibilityCriteriaJson for gate logic.
//   Never merges with C1–C6 legacy defaults.

import type { ScreeningCriterion, MethodologySnapshot } from "../s2_3/screeningTypes";
import {
  createMethodologySnapshot,
  stableStringify,
  sha256,
} from "../s2_3/screeningSnapshot";
import { DEFAULT_GATE_CRITERIA } from "../shared/defaultGateCriteria";

// ── S2.1 form data shape (from BC01_SCHEMA.v2.ts) ────────────────────────────

export interface S2_1FormData {
  /** Whether the methodology is locked (prevents editing weights/criteria) */
  methodologyLocked?: boolean;
  // ── Legacy keys — kept for backward compat; NOT used in fingerprint ───────
  /** @deprecated Use profileType. Kept for backward compat with buildScoringMatrixMeta. */
  evaluationProfile?: "balanced" | "transformation" | "efficiency" | "compliance";
  /** @deprecated Use timeHorizonYears. Kept for backward compat. */
  timeHorizon?: number;
  // ── Correct schema keys (BC01_SCHEMA.v2 — Level 5) ───────────────────────
  /** Evaluation profile type (schema key: profileType) */
  profileType?: "balanced" | "transformation" | "efficiency" | "compliance";
  /** Discount rate (%) */
  discountRate?: number;
  /** Time horizon (years) — schema key: timeHorizonYears */
  timeHorizonYears?: number;
  /** Inflation rate (%) */
  inflationRate?: number;
  /** Currency unit (e.g. "CAD", "$M") */
  currencyUnit?: string;
  /** Weight: financial dimension (fraction, 0–1) */
  weight_financial?: number;
  /** Weight: strategic dimension (fraction, 0–1) */
  weight_strategic?: number;
  /** Weight: feasibility dimension (fraction, 0–1) */
  weight_feasibility?: number;
  // ── Gate criteria (Level 5 — single source of truth) ─────────────────────
  /** JSON string of ScreeningCriterion[] — gate for S2.3. Empty → DEFAULT_GATE_CRITERIA. */
  screeningGateCriteriaJson?: string;
  // ── S3 scoring criteria (separate concern — not used for gate logic) ──────
  /** JSON string storing strategic scoring criteria (S3) */
  strategicCriteriaJson?: string;
  /** JSON string storing feasibility scoring criteria (S3) */
  feasibilityCriteriaJson?: string;
  /** Scoring matrix spec meta (passed through to snapshot for S3 integration) */
  scoringMatrixSpecMeta?: Record<string, unknown>;
  /** Any other fields from the schema (preserved as unknown) */
  [key: string]: unknown;
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Builds a MethodologySnapshot from S2.1 form data.
 *
 * Criteria resolution order:
 * 1. `screeningGateCriteriaJson` parsed as ScreeningCriterion[]
 * 2. Falls back to DEFAULT_GATE_CRITERIA (shared/defaultGateCriteria.ts)
 *
 * S3 scoring criteria (strategicCriteriaJson, feasibilityCriteriaJson) are
 * NOT used for gate logic — they are a separate concern.
 *
 * This function is PURE — it does not trigger any state mutation.
 * The caller (useLockMethodologyEffect) dispatches LOCK_METHODOLOGY.
 */
export function buildMethodologySnapshotFromS2_1(
  s2_1Data: S2_1FormData,
  actor: string
): MethodologySnapshot {
  const criteria = parseCriteriaFromS2_1(s2_1Data);

  const dealBreakerIds = criteria
    .filter((c) => c.dealBreaker === true)
    .map((c) => c.id);

  // Default: 5 of N must pass (TBS standard — adjustable via schema later)
  const minYesCount = Math.max(
    Math.ceil(criteria.length * 0.75),
    Math.min(5, criteria.length)
  );

  const viabilityRule: MethodologySnapshot["viabilityRule"] = {
    dealBreakerIds,
    minYesCount,
    totalCriteria: criteria.length,
  };

  // Build scoring matrix spec meta from profile weights
  const scoringMatrixSpecMeta =
    s2_1Data.scoringMatrixSpecMeta ??
    buildScoringMatrixMeta(s2_1Data.evaluationProfile);

  return createMethodologySnapshot(
    criteria,
    viabilityRule,
    scoringMatrixSpecMeta,
    actor
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse gate screening criteria from S2.1 form data.
 *
 * Level 5 — Single source of truth rules:
 * 1. Reads ONLY `screeningGateCriteriaJson` (the dedicated gate field)
 * 2. Falls back to DEFAULT_GATE_CRITERIA when absent or invalid
 * 3. Does NOT read strategicCriteriaJson or feasibilityCriteriaJson
 * 4. Does NOT merge with any hardcoded legacy list
 * 5. dealBreaker must be explicit in the JSON — never defaulted silently
 */
export function parseCriteriaFromS2_1(
  data: S2_1FormData
): ScreeningCriterion[] {
  const raw = data?.screeningGateCriteriaJson?.trim?.();

  if (raw) {
    const parsed = safeParseJson<ScreeningCriterion[]>(raw);
    if (parsed?.length) {
      return parsed;
    }
  }

  return DEFAULT_GATE_CRITERIA;
}

function safeParseJson<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Evaluation profile weights → scoringMatrixSpecMeta for S3 integration */
function buildScoringMatrixMeta(
  profile?: S2_1FormData["evaluationProfile"]
): Record<string, unknown> {
  const weights: Record<string, { financial: number; strategic: number; feasibility: number }> = {
    balanced:       { financial: 0.5,  strategic: 0.3,  feasibility: 0.2 },
    transformation: { financial: 0.35, strategic: 0.45, feasibility: 0.2 },
    efficiency:     { financial: 0.6,  strategic: 0.2,  feasibility: 0.2 },
    compliance:     { financial: 0.2,  strategic: 0.3,  feasibility: 0.5 },
  };

  const selected = profile && weights[profile] ? weights[profile] : weights.balanced;

  // NOTE: generatedAt intentionally omitted — non-deterministic timestamps
  // would break SHA-256 hash idempotence in MethodologySnapshot.
  return {
    profile: profile ?? "balanced",
    weights: selected,
  };
}

// ── Fingerprint helper ────────────────────────────────────────────────────────

/**
 * Returns a SHA-256 hash of the S2.1 evaluation-relevant inputs.
 * Used to detect changes after methodology lock and trigger Reset A.
 *
 * Level 5 — Audit-safe: hashes EXACTLY these 10 keys (Appendix C compliant):
 *   screeningGateCriteriaJson, strategicCriteriaJson, feasibilityCriteriaJson,
 *   discountRate, timeHorizonYears, inflationRate, currencyUnit,
 *   profileType,
 *   weight_financial, weight_strategic, weight_feasibility
 *
 * Any change to criteria JSON, financial params, or weights invalidates the fingerprint.
 * Keys are correct BC01_SCHEMA.v2 names — NOT legacy aliases.
 */
export function fingerprintS2_1(data: S2_1FormData): string {
  const relevant = {
    screeningGateCriteriaJson: data.screeningGateCriteriaJson ?? "",
    strategicCriteriaJson:     data.strategicCriteriaJson ?? "",
    feasibilityCriteriaJson:   data.feasibilityCriteriaJson ?? "",
    discountRate:              data.discountRate ?? 0,
    timeHorizonYears:          data.timeHorizonYears ?? 0,
    inflationRate:             data.inflationRate ?? 0,
    currencyUnit:              data.currencyUnit ?? "",
    profileType:               data.profileType ?? "balanced",
    weight_financial:          data.weight_financial ?? 0,
    weight_strategic:          data.weight_strategic ?? 0,
    weight_feasibility:        data.weight_feasibility ?? 0,
  };
  return sha256(stableStringify(relevant));
}

// ── React integration hook (data plumbing only) ───────────────────────────────

import { useEffect, useRef } from "react";

/**
 * Watches `s2_1Data.methodologyLocked` and dispatches LOCK_METHODOLOGY
 * when it becomes true or when the evaluation inputs change post-lock.
 *
 * Triggers Reset A in screeningReducer if the snapshot hash changes.
 *
 * @param s2_1Data       - Current S2.1 form data
 * @param lockMethodology - Dispatch function from useScreeningGate
 * @param actor          - Actor string (user id or "system")
 */
export function useLockMethodologyEffect(
  s2_1Data: S2_1FormData | undefined,
  lockMethodology: (snapshot: MethodologySnapshot, actor?: string) => void,
  actor = "system"
): void {
  const prevFingerprintRef = useRef<string | null>(null);
  const prevLockedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!s2_1Data) return;

    const isLocked = !!s2_1Data.methodologyLocked;
    const fingerprint = fingerprintS2_1(s2_1Data);

    // Only act when locked
    if (!isLocked) {
      prevLockedRef.current = false;
      return;
    }

    const justLocked = !prevLockedRef.current && isLocked;
    const inputsChangedAfterLock =
      prevLockedRef.current &&
      isLocked &&
      prevFingerprintRef.current !== null &&
      prevFingerprintRef.current !== fingerprint;

    if (justLocked || inputsChangedAfterLock) {
      const snapshot = buildMethodologySnapshotFromS2_1(s2_1Data, actor);
      lockMethodology(snapshot, actor);
      prevFingerprintRef.current = fingerprint;
    }

    prevLockedRef.current = isLocked;
  }, [
    s2_1Data?.methodologyLocked,
    s2_1Data?.screeningGateCriteriaJson,
    s2_1Data?.strategicCriteriaJson,
    s2_1Data?.feasibilityCriteriaJson,
    s2_1Data?.discountRate,
    s2_1Data?.timeHorizonYears,
    s2_1Data?.inflationRate,
    s2_1Data?.currencyUnit,
    s2_1Data?.profileType,
    s2_1Data?.weight_financial,
    s2_1Data?.weight_strategic,
    s2_1Data?.weight_feasibility,
  ]); // eslint-disable-line react-hooks/exhaustive-deps
}
