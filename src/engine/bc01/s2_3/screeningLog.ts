// src/engine/bc01/s2_3/screeningLog.ts
// Pass 1 — Elimination log utilities.
//
// Design invariants:
//  - append-only: entries are never deleted, only SUPERSEDED
//  - SUPERSEDED entries are preserved with a supersededAt timestamp
//  - markSuperseded with scope="global" supersedes ALL active entries
//  - markSuperseded with scope=optionId supersedes active entries for that option only

import type { EliminationLogEntry } from "./screeningTypes";

// ── ID generation ─────────────────────────────────────────────────────────────

let _counter = 0;

/**
 * Generates a short, unique log entry ID.
 * Format: "eli-<timestamp>-<counter>"
 */
function generateLogId(): string {
  _counter = (_counter + 1) % 999999;
  return `eli-${Date.now()}-${String(_counter).padStart(6, "0")}`;
}

// ── buildEliminationEntry ─────────────────────────────────────────────────────

export interface BuildEliminationEntryParams {
  optionId: string;
  optionNameSnapshot: string;
  failedCriterionId: string;
  /** Label of the criterion at evaluation time — preserved for audit readability */
  criterionLabelSnapshot: string;
  reason: string;
  /** All evidence reference IDs for this criterion (Level 5 Appendix C) */
  evidenceRefs: string[];
  methodologyVersion: string;
  /** SHA-256 hash of the MethodologySnapshot — for cross-reference validation */
  methodologyHash: string;
  actor: string;
}

/**
 * Constructs a new ACTIVE EliminationLogEntry.
 * Does NOT append to any log — use appendEntry() for that.
 */
export function buildEliminationEntry(
  params: BuildEliminationEntryParams
): EliminationLogEntry {
  return {
    id: generateLogId(),
    optionId: params.optionId,
    optionNameSnapshot: params.optionNameSnapshot,
    failedCriterionId: params.failedCriterionId,
    criterionLabelSnapshot: params.criterionLabelSnapshot,
    reason: params.reason,
    evidenceRefs: params.evidenceRefs,
    status: "ACTIVE",
    supersededAt: undefined,
    methodologyVersion: params.methodologyVersion,
    methodologyHash: params.methodologyHash,
    createdAt: new Date().toISOString(),
    actor: params.actor,
  };
}

// ── markSuperseded ────────────────────────────────────────────────────────────

/**
 * Returns a new log array where all ACTIVE entries matching the scope
 * are transitioned to SUPERSEDED.
 *
 * @param entries  - Current elimination log (immutable input)
 * @param scope    - "global" → supersede all ACTIVE entries
 *                   any other string → supersede ACTIVE entries for that optionId
 */
export function markSuperseded(
  entries: EliminationLogEntry[],
  scope: "global" | string
): EliminationLogEntry[] {
  const now = new Date().toISOString();

  return entries.map((entry) => {
    if (entry.status !== "ACTIVE") return entry; // already SUPERSEDED — immutable

    const matches =
      scope === "global" || entry.optionId === scope;

    if (!matches) return entry;

    return {
      ...entry,
      status: "SUPERSEDED" as const,
      supersededAt: now,
    };
  });
}

// ── appendEntry ───────────────────────────────────────────────────────────────

/**
 * Append-only guard: adds a new entry to the log.
 *
 * Throws if an entry with the same id already exists (double-append protection).
 * Returns a new array — never mutates the original.
 */
export function appendEntry(
  log: EliminationLogEntry[],
  entry: EliminationLogEntry
): EliminationLogEntry[] {
  if (log.some((e) => e.id === entry.id)) {
    throw new Error(
      `[screeningLog] Duplicate entry id "${entry.id}" — append-only log violation`
    );
  }
  return [...log, entry];
}

// ── appendEntries (batch version) ─────────────────────────────────────────────

/**
 * Batch-appends multiple entries at once.
 * Validates no id collision across the entire batch + existing log.
 */
export function appendEntries(
  log: EliminationLogEntry[],
  entries: EliminationLogEntry[]
): EliminationLogEntry[] {
  const existingIds = new Set(log.map((e) => e.id));
  for (const entry of entries) {
    if (existingIds.has(entry.id)) {
      throw new Error(
        `[screeningLog] Duplicate entry id "${entry.id}" — append-only log violation`
      );
    }
    existingIds.add(entry.id);
  }
  return [...log, ...entries];
}

// ── Selector helpers ──────────────────────────────────────────────────────────

/** Returns only ACTIVE entries for a given option */
export function getActiveEntriesForOption(
  log: EliminationLogEntry[],
  optionId: string
): EliminationLogEntry[] {
  return log.filter((e) => e.optionId === optionId && e.status === "ACTIVE");
}

/** Returns all entries (ACTIVE + SUPERSEDED) for a given option */
export function getAllEntriesForOption(
  log: EliminationLogEntry[],
  optionId: string
): EliminationLogEntry[] {
  return log.filter((e) => e.optionId === optionId);
}
