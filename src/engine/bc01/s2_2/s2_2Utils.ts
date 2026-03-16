// src/engine/bc01/s2_2/s2_2Utils.ts
// Pass 1 — S2.2 utilities: evidenceByCriterionId per option + change detection.
//
// This module is UI-free (no React). AlternativesManager calls these utilities
// to ensure each option carries evidence for the locked criteria set.
//
// Integration contract:
//   - Each option in formData.S2_2_LIST_OPTIONS.alternatives[] may have
//     an `evidenceByCriterionId` field added by this module.
//   - When an option's evidence changes after its first evaluation,
//     `hasEvidenceChanged(prev, next)` returns true → caller dispatches
//     EVALUATE_OPTION with resetOption=true (Reset B).

import type {
  OptionEvidence,
  CriterionEvidence,
  ScreeningCriterion,
} from "../s2_3/screeningTypes";
import { stableStringify, sha256 } from "../s2_3/screeningSnapshot";

// ── Enhanced Option type (extension of existing S2.2 option) ─────────────────

/**
 * Extension added to each S2.2 option during Pass 1.
 * All fields are optional for backward compatibility with AlternativesManager.
 */
export interface OptionEvidenceFields {
  /**
   * Evidence keyed by criterion id (from MethodologySnapshot.criteria[].id).
   * Populated by the user or AI during S2.3 evaluation.
   */
  evidenceByCriterionId?: Record<string, CriterionEvidence>;
  /**
   * SHA-256 hash of evidenceByCriterionId (stableStringify).
   * Used by hasEvidenceChanged() to detect S2.2 edits after evaluation.
   */
  evidenceHash?: string;
  /** ISO timestamp of last evidence update */
  evidenceUpdatedAt?: string;
}

// ── Factory: build an empty evidence record from criteria ────────────────────

/**
 * Creates an empty OptionEvidence bundle for an option given the locked criteria.
 * All evidenceByCriterionId values start as empty objects.
 */
export function buildEmptyOptionEvidence(
  optionId: string,
  criteria: ScreeningCriterion[]
): OptionEvidence {
  const evidenceByCriterionId: Record<string, CriterionEvidence> = {};
  for (const c of criteria) {
    evidenceByCriterionId[c.id] = {};
  }
  return { optionId, evidenceByCriterionId };
}

// ── Evidence update helper ────────────────────────────────────────────────────

/**
 * Returns a new evidence bundle with one criterion's evidence updated.
 * Immutable — never mutates the original.
 */
export function updateOptionEvidence(
  existing: OptionEvidence,
  criterionId: string,
  evidence: CriterionEvidence
): OptionEvidence {
  return {
    ...existing,
    evidenceByCriterionId: {
      ...existing.evidenceByCriterionId,
      [criterionId]: evidence,
    },
  };
}

// ── Merge evidence into option ────────────────────────────────────────────────

/**
 * Merges OptionEvidence back into a S2.2 option object, updating
 * evidenceByCriterionId, evidenceHash, and evidenceUpdatedAt.
 *
 * Returns a new option object (immutable).
 */
export function mergeEvidenceIntoOption<T extends { id: string }>(
  option: T,
  evidence: OptionEvidence
): T & OptionEvidenceFields {
  const evidenceByCriterionId = evidence.evidenceByCriterionId;
  const evidenceHash = hashEvidence(evidenceByCriterionId);

  return {
    ...option,
    evidenceByCriterionId,
    evidenceHash,
    evidenceUpdatedAt: new Date().toISOString(),
  };
}

// ── Change detection ──────────────────────────────────────────────────────────

/**
 * Returns true if the evidence has changed since it was last hashed.
 *
 * Triggers Reset B: caller should dispatch EVALUATE_OPTION with resetOption=true.
 */
export function hasEvidenceChanged(
  prevOption: OptionEvidenceFields,
  nextEvidence: OptionEvidence
): boolean {
  if (!prevOption.evidenceHash) {
    // Never hashed → treat as changed
    return true;
  }
  const nextHash = hashEvidence(nextEvidence.evidenceByCriterionId);
  return prevOption.evidenceHash !== nextHash;
}

/**
 * Returns true if an option has been evaluated at least once
 * (i.e., it has a non-empty evidenceHash).
 */
export function isOptionEvaluated(option: OptionEvidenceFields): boolean {
  return !!option.evidenceHash;
}

// ── Extract OptionEvidence from option ───────────────────────────────────────

/**
 * Extracts the OptionEvidence bundle from a S2.2 option object.
 * Falls back to an empty bundle if evidenceByCriterionId is missing.
 */
export function extractOptionEvidence(
  option: { id: string } & OptionEvidenceFields,
  criteria: ScreeningCriterion[]
): OptionEvidence {
  if (option.evidenceByCriterionId) {
    return {
      optionId: option.id,
      evidenceByCriterionId: option.evidenceByCriterionId,
    };
  }
  return buildEmptyOptionEvidence(option.id, criteria);
}

// ── Ensure all criteria have evidence slots ───────────────────────────────────

/**
 * Ensures that an option's evidenceByCriterionId has an entry for every
 * criterion in the locked snapshot. Adds empty entries for any new criteria.
 *
 * Returns a new option object (immutable).
 */
export function ensureEvidenceSlots<T extends { id: string } & OptionEvidenceFields>(
  option: T,
  criteria: ScreeningCriterion[]
): T {
  const existing = option.evidenceByCriterionId ?? {};
  const updated = { ...existing };

  let changed = false;
  for (const c of criteria) {
    if (!(c.id in updated)) {
      updated[c.id] = {};
      changed = true;
    }
  }

  if (!changed) return option;

  return {
    ...option,
    evidenceByCriterionId: updated,
  };
}

// ── Private helpers ───────────────────────────────────────────────────────────

function hashEvidence(
  evidenceByCriterionId: Record<string, CriterionEvidence>
): string {
  return sha256(stableStringify(evidenceByCriterionId));
}
