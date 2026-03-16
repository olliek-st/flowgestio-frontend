// src/engine/bc01/s2_3/screeningReducer.ts
// Pass 1 — Extended orchestrator.
//
// Legacy actions (SET_RESULT, SET_JUSTIFICATION, SET_OVERRIDE, etc.) are
// preserved for ScreeningGateTable backward-compatibility (Pass 2 will migrate).
//
// New Pass-1 actions:
//   LOCK_METHODOLOGY   — store MethodologySnapshot; trigger Reset A on change
//   EVALUATE_OPTION    — run screeningEngine, append elimination log entries
//   APPLY_OVERRIDE     — create OverrideRecord; flag stale on methodology change
//   CONFIRM_SCREENING  — validate no stale overrides / missing evidence, confirm
//   UNLOCK             — alias for UNCONFIRM
//
// Reset A (S2.1 change): LOCK_METHODOLOGY with a different hash
//   → invalidates ALL criterion results & overrides
//   → marks ALL elimination log entries SUPERSEDED
//   → marks ALL existing OverrideRecords stale
//   → resets confirmed to false
//
// Reset B (S2.2 option change): triggered by EVALUATE_OPTION with resetOption=true
//   → invalidates criterion results / override for that option only
//   → marks that option's elimination log entries SUPERSEDED

import type {
  ScreeningCell,
  ScreeningCriterion,
  ScreeningResult,
  ScreeningState,
  ScreeningVerdict,
  S2_3_SCREENING,
  MethodologySnapshot,
  OptionEvidence,
  EliminationLogEntry,
  OverrideRecord,
  CriterionResult,
  ScreeningFlag,
} from "./screeningTypes";
import { buildScreeningCriteria } from "./screeningCriteria";
import { computeAllVerdicts } from "./screeningVerdict";
import { computeScreeningResults, hasInsufficientEvidence } from "./screeningEngine";
import { validateSnapshot } from "./screeningSnapshot";
import {
  buildEliminationEntry,
  markSuperseded,
  appendEntries,
} from "./screeningLog";

// ── Action union ──────────────────────────────────────────────────────────────

type Action =
  // ── Legacy actions (ScreeningGateTable compat) ──────────────────────────────
  | { type: "INIT"; options: any[]; existing?: S2_3_SCREENING; customCriteria?: ScreeningCriterion[] }
  | { type: "SET_RESULT"; optionId: string; criterionId: string; result: ScreeningResult }
  | { type: "SET_JUSTIFICATION"; optionId: string; criterionId: string; justification: string }
  | { type: "SET_OVERRIDE"; optionId: string; override: boolean }
  | { type: "SET_OVERRIDE_REASON"; optionId: string; overrideReason: string }
  | { type: "SET_FINAL_VERDICT"; optionId: string; finalVerdict: ScreeningVerdict }
  | { type: "RECOMPUTE"; options: any[]; customCriteria?: ScreeningCriterion[] }
  | { type: "CONFIRM" }
  | { type: "UNCONFIRM" }
  // ── Pass-1 actions ──────────────────────────────────────────────────────────
  | {
      type: "LOCK_METHODOLOGY";
      snapshot: MethodologySnapshot;
      /** actor string passed through for stale records audit */
      actor?: string;
    }
  | {
      type: "EVALUATE_OPTION";
      option: any;
      optionEvidence: OptionEvidence;
      isStatusQuo: boolean;
      actor: string;
      /**
       * Reset B: set to true when S2.2 evidence changed after evaluation.
       * Supersedes existing log entries for this option before re-evaluating.
       */
      resetOption?: boolean;
    }
  | {
      type: "APPLY_OVERRIDE";
      optionId: string;
      finalVerdict: ScreeningVerdict;
      overrideReason: string;
      overriddenBy: string;
    }
  | { type: "CONFIRM_SCREENING" }
  | { type: "UNLOCK" };

// ── Empty / initial state ─────────────────────────────────────────────────────

export const SCREENING_EMPTY_STATE: ScreeningState = {
  // Legacy fields
  decisionsByOptionId: {},
  criteriaOrder: [],
  viableOptionIds: [],
  screenedAt: null,
  confirmed: false,
  // Pass-1 fields
  methodologySnapshot: undefined,
  criterionResultsByOptionId: {},
  computedFlagsByOptionId: {},
  eliminationLog: [],
  overrideRecordsByOptionId: {},
  hasStaleOverrides: false,
  hasMissingEvidence: false,
};

// ── Legacy helpers ────────────────────────────────────────────────────────────

function makeDefaultCell(c: ScreeningCriterion): ScreeningCell {
  return { id: c.id, label: c.label, result: "Yes", justification: "" };
}

function hydrateState(args: {
  options: any[];
  criteria: ScreeningCriterion[];
  existing?: S2_3_SCREENING;
}): ScreeningState {
  const { options, criteria, existing } = args;

  const criteriaOrder = criteria.map((c) => c.id);
  const existingByOptionId: Record<string, any> = {};
  for (const d of existing?.decisions || []) existingByOptionId[d.optionId] = d;

  const decisionsByOptionId: ScreeningState["decisionsByOptionId"] = {};

  for (const opt of options) {
    const ex = existingByOptionId[opt.id];
    const criteriaById: Record<string, ScreeningCell> = {};
    for (const c of criteria) criteriaById[c.id] = makeDefaultCell(c);

    if (ex?.criteria?.length) {
      for (const cell of ex.criteria) {
        if (criteriaById[cell.id]) {
          criteriaById[cell.id] = {
            ...criteriaById[cell.id],
            result: cell.result,
            justification: cell.justification || "",
          };
        }
      }
    }

    decisionsByOptionId[opt.id] = {
      optionId: opt.id,
      criteriaById,
      computedVerdict: ex?.computedVerdict || "DISCOUNTED",
      finalVerdict: ex?.finalVerdict || "DISCOUNTED",
      override: !!ex?.override,
      overrideReason: ex?.overrideReason || "",
    };
  }

  const state: ScreeningState = {
    ...SCREENING_EMPTY_STATE,
    decisionsByOptionId,
    criteriaOrder,
    viableOptionIds: existing?.viableOptionIds || [],
    screenedAt: existing?.screenedAt || null,
    confirmed: !!existing?.confirmed,
  };

  return legacyRecompute(state, options, criteria);
}

function legacyRecompute(
  state: ScreeningState,
  options: any[],
  criteria: ScreeningCriterion[]
): ScreeningState {
  const resultsByOptionId: Record<string, Record<string, ScreeningResult>> = {};
  const overridesByOptionId: Record<
    string,
    { override: boolean; finalVerdict: ScreeningVerdict }
  > = {};

  for (const [optionId, d] of Object.entries(state.decisionsByOptionId)) {
    resultsByOptionId[optionId] = {};
    for (const c of criteria) {
      resultsByOptionId[optionId][c.id] = d.criteriaById[c.id]?.result || "Yes";
    }
    overridesByOptionId[optionId] = {
      override: d.override,
      finalVerdict: d.finalVerdict,
    };
  }

  const { computedByOptionId, viableOptionIds } = computeAllVerdicts({
    options,
    criteria,
    resultsByOptionId,
    overridesByOptionId,
    config: { includeBaselineInViableIds: false },
  });

  const nextDecisionsByOptionId: ScreeningState["decisionsByOptionId"] = {};
  for (const [optionId, d] of Object.entries(state.decisionsByOptionId)) {
    const computed = computedByOptionId[optionId] || d.computedVerdict;
    nextDecisionsByOptionId[optionId] = {
      ...d,
      computedVerdict: computed,
      finalVerdict: d.override ? d.finalVerdict : computed,
    };
  }

  return { ...state, decisionsByOptionId: nextDecisionsByOptionId, viableOptionIds };
}

// ── Pass-1 helpers ────────────────────────────────────────────────────────────

/** Recompute hasStaleOverrides and hasMissingEvidence from current state */
function deriveFlags(state: ScreeningState): ScreeningState {
  const hasStaleOverrides = Object.values(state.overrideRecordsByOptionId).some(
    (r) => r.stale
  );

  const hasMissingEvidence = Object.values(state.criterionResultsByOptionId).some(
    (results) => hasInsufficientEvidence(results)
  );

  return { ...state, hasStaleOverrides, hasMissingEvidence };
}

// ── Main reducer ──────────────────────────────────────────────────────────────

export function screeningReducer(
  state: ScreeningState,
  action: Action
): ScreeningState {
  switch (action.type) {
    // ── Legacy actions (unchanged logic) ────────────────────────────────────────

    case "INIT": {
      const criteria = buildScreeningCriteria(action.customCriteria);
      return hydrateState({ options: action.options, criteria, existing: action.existing });
    }

    case "SET_RESULT": {
      const d = state.decisionsByOptionId[action.optionId];
      if (!d) return state;
      const cell = d.criteriaById[action.criterionId];
      if (!cell) return state;

      return {
        ...state,
        confirmed: false,
        decisionsByOptionId: {
          ...state.decisionsByOptionId,
          [action.optionId]: {
            ...d,
            criteriaById: {
              ...d.criteriaById,
              [action.criterionId]: {
                ...cell,
                result: action.result,
                justification:
                  action.result === "Yes" ? "" : cell.justification || "",
              },
            },
          },
        },
      };
    }

    case "SET_JUSTIFICATION": {
      const d = state.decisionsByOptionId[action.optionId];
      if (!d) return state;
      const cell = d.criteriaById[action.criterionId];
      if (!cell) return state;

      return {
        ...state,
        confirmed: false,
        decisionsByOptionId: {
          ...state.decisionsByOptionId,
          [action.optionId]: {
            ...d,
            criteriaById: {
              ...d.criteriaById,
              [action.criterionId]: {
                ...cell,
                justification: action.justification,
              },
            },
          },
        },
      };
    }

    case "SET_OVERRIDE": {
      const d = state.decisionsByOptionId[action.optionId];
      if (!d) return state;

      return {
        ...state,
        confirmed: false,
        decisionsByOptionId: {
          ...state.decisionsByOptionId,
          [action.optionId]: {
            ...d,
            override: action.override,
            overrideReason: action.override ? d.overrideReason : "",
            finalVerdict: action.override ? d.finalVerdict : d.computedVerdict,
          },
        },
      };
    }

    case "SET_OVERRIDE_REASON": {
      const d = state.decisionsByOptionId[action.optionId];
      if (!d) return state;

      return {
        ...state,
        confirmed: false,
        decisionsByOptionId: {
          ...state.decisionsByOptionId,
          [action.optionId]: { ...d, overrideReason: action.overrideReason },
        },
      };
    }

    case "SET_FINAL_VERDICT": {
      const d = state.decisionsByOptionId[action.optionId];
      if (!d) return state;

      return {
        ...state,
        confirmed: false,
        decisionsByOptionId: {
          ...state.decisionsByOptionId,
          [action.optionId]: { ...d, finalVerdict: action.finalVerdict },
        },
      };
    }

    case "RECOMPUTE": {
      const criteria = buildScreeningCriteria(action.customCriteria);
      return legacyRecompute(state, action.options, criteria);
    }

    case "CONFIRM":
      return { ...state, confirmed: true, screenedAt: new Date().toISOString() };

    case "UNCONFIRM":
      return { ...state, confirmed: false };

    // ── Pass-1 actions ────────────────────────────────────────────────────────

    /**
     * LOCK_METHODOLOGY
     *
     * Stores the MethodologySnapshot. If the hash differs from the currently
     * locked snapshot → Reset A:
     *   - All existing CriterionResults cleared
     *   - All OverrideRecords marked stale
     *   - All EliminationLog entries SUPERSEDED
     *   - confirmed reset to false
     */
    case "LOCK_METHODOLOGY": {
      const { snapshot } = action;
      const prevSnapshot = state.methodologySnapshot;

      // No change → idempotent (same hash)
      if (prevSnapshot?.hash === snapshot.hash) {
        return { ...state, methodologySnapshot: snapshot };
      }

      const staleAt = new Date().toISOString();
      const staleReason = prevSnapshot
        ? `Methodology updated from version ${prevSnapshot.version} to ${snapshot.version}`
        : "Initial methodology lock";

      // Mark all existing OverrideRecords stale (Reset A)
      const staledOverrides: ScreeningState["overrideRecordsByOptionId"] = {};
      for (const [optId, rec] of Object.entries(state.overrideRecordsByOptionId)) {
        staledOverrides[optId] = rec.stale
          ? rec // already stale — don't overwrite staleAt
          : { ...rec, stale: true, staleReason, staleAt };
      }

      // SUPERSEDE all active elimination log entries (Reset A)
      const supersededLog = markSuperseded(state.eliminationLog, "global");

      return deriveFlags({
        ...state,
        methodologySnapshot: snapshot,
        // Clear computed results — must re-evaluate with new snapshot
        criterionResultsByOptionId: {},
        computedFlagsByOptionId: {},
        overrideRecordsByOptionId: staledOverrides,
        eliminationLog: supersededLog,
        confirmed: false,
      });
    }

    /**
     * EVALUATE_OPTION
     *
     * Runs computeScreeningResults (pure engine) for one option.
     * Validates snapshot integrity before evaluating.
     *
     * If resetOption=true (Reset B — S2.2 evidence changed):
     *   - SUPERSEDE existing log entries for this option
     *   - Clear criterion results / override for this option
     *
     * Appends EliminationLogEntry for each failed deal-breaker criterion.
     */
    case "EVALUATE_OPTION": {
      const { option, optionEvidence, isStatusQuo, actor, resetOption } = action;
      const snapshot = state.methodologySnapshot;

      // Guard: snapshot must be locked and valid
      if (!snapshot) {
        console.warn(
          "[screeningReducer] EVALUATE_OPTION skipped — no MethodologySnapshot locked"
        );
        return state;
      }

      const validation = validateSnapshot(snapshot);
      if (!validation.valid) {
        console.error(
          "[screeningReducer] EVALUATE_OPTION blocked — snapshot tampered:",
          validation.reason
        );
        return state;
      }

      // Reset B: supersede this option's existing log entries
      let nextLog = state.eliminationLog;
      if (resetOption) {
        nextLog = markSuperseded(nextLog, option.id);
      }

      // Run pure engine
      const { computedVerdict, criterionResults, computedFlags } =
        computeScreeningResults(snapshot, optionEvidence, isStatusQuo);

      // Build new elimination log entries for deal-breaker fails ONLY
      // (Level 5 Appendix C: log one entry per failed deal-breaker criterion)
      const optionName: string =
        option.name || option.label || option.shortDescription || option.id;

      // Pre-build lookup: criterionId → label (from locked snapshot)
      const criterionLabelById = new Map<string, string>(
        snapshot.criteria.map((c) => [c.id, c.label])
      );

      // Filter to deal-breaker fails only
      const dealBreakerIds = new Set(
        snapshot.criteria.filter((c) => c.dealBreaker).map((c) => c.id)
      );

      const newEntries: EliminationLogEntry[] = criterionResults
        .filter((r) => r.status === "fail" && dealBreakerIds.has(r.criterionId))
        .map((r) =>
          buildEliminationEntry({
            optionId: option.id,
            optionNameSnapshot: optionName,
            failedCriterionId: r.criterionId,
            criterionLabelSnapshot: criterionLabelById.get(r.criterionId) ?? r.criterionId,
            reason: r.reason,
            evidenceRefs: r.evidenceRefs,
            methodologyVersion: snapshot.version,
            methodologyHash: snapshot.hash,
            actor,
          })
        );

      nextLog = appendEntries(nextLog, newEntries);

      // Update legacy decisionsByOptionId computedVerdict / finalVerdict
      const existingDecision = state.decisionsByOptionId[option.id];
      const existingOverride = state.overrideRecordsByOptionId[option.id];
      const hasActiveOverride = existingOverride && !existingOverride.stale;

      const finalVerdict: ScreeningVerdict = hasActiveOverride
        ? existingOverride.finalVerdict
        : computedVerdict;

      const updatedDecision = existingDecision
        ? {
            ...existingDecision,
            computedVerdict,
            finalVerdict,
          }
        : {
            optionId: option.id,
            criteriaById: {},
            computedVerdict,
            finalVerdict,
            override: hasActiveOverride,
            overrideReason: existingOverride?.overrideReason ?? "",
          };

      // Recompute viableOptionIds across all options
      const nextDecisions: ScreeningState["decisionsByOptionId"] = {
        ...state.decisionsByOptionId,
        [option.id]: updatedDecision,
      };
      const nextViableIds = Object.values(nextDecisions)
        .filter(
          (d) => d.finalVerdict === "VIABLE"
        )
        .map((d) => d.optionId);

      return deriveFlags({
        ...state,
        decisionsByOptionId: nextDecisions,
        viableOptionIds: nextViableIds.filter(
          (id) => nextDecisions[id]?.finalVerdict === "VIABLE"
        ),
        criterionResultsByOptionId: {
          ...state.criterionResultsByOptionId,
          [option.id]: criterionResults,
        },
        computedFlagsByOptionId: {
          ...state.computedFlagsByOptionId,
          [option.id]: computedFlags,
        },
        eliminationLog: nextLog,
        confirmed: false,
      });
    }

    /**
     * APPLY_OVERRIDE
     *
     * Creates or replaces the OverrideRecord for an option.
     * Also syncs the legacy `override` / `overrideReason` / `finalVerdict`
     * fields so ScreeningGateTable keeps working.
     *
     * STALE: existing stale override is REPLACED (not deleted) — audit is
     * preserved in the log, but the new OverrideRecord supersedes it.
     */
    case "APPLY_OVERRIDE": {
      const { optionId, finalVerdict, overrideReason, overriddenBy } = action;
      const snapshot = state.methodologySnapshot;
      const methodologyVersion = snapshot?.version ?? "unknown";

      const newRecord: OverrideRecord = {
        finalVerdict,
        overrideReason,
        overriddenBy,
        overriddenAt: new Date().toISOString(),
        methodologyVersion,
        stale: false,
        staleReason: undefined,
        staleAt: undefined,
      };

      // Sync legacy decision fields
      const d = state.decisionsByOptionId[optionId];
      const updatedDecision = d
        ? {
            ...d,
            override: true,
            overrideReason,
            finalVerdict,
          }
        : undefined;

      return deriveFlags({
        ...state,
        confirmed: false,
        overrideRecordsByOptionId: {
          ...state.overrideRecordsByOptionId,
          [optionId]: newRecord,
        },
        decisionsByOptionId: updatedDecision
          ? { ...state.decisionsByOptionId, [optionId]: updatedDecision }
          : state.decisionsByOptionId,
      });
    }

    /**
     * CONFIRM_SCREENING
     *
     * Validates:
     *   1. No stale overrides (hasStaleOverrides must be false)
     *   2. No missing evidence (hasMissingEvidence must be false)
     *
     * If either condition is true, returns state unchanged (caller reads
     * hasStaleOverrides / hasMissingEvidence to show the blocking reason).
     */
    case "CONFIRM_SCREENING": {
      const refreshed = deriveFlags(state);
      if (refreshed.hasStaleOverrides || refreshed.hasMissingEvidence) {
        // Blocked — do not confirm; caller reads flags to show reason
        return refreshed;
      }
      return {
        ...refreshed,
        confirmed: true,
        screenedAt: new Date().toISOString(),
      };
    }

    /** UNLOCK — alias for UNCONFIRM */
    case "UNLOCK":
      return { ...state, confirmed: false };

    default:
      return state;
  }
}

// ── Serialization helpers (unchanged) ────────────────────────────────────────

export function serializeScreeningToContract(args: {
  state: ScreeningState;
  options: any[];
  customCriteria?: ScreeningCriterion[];
  screeningNarrative?: string;
}): S2_3_SCREENING {
  const criteria = buildScreeningCriteria(args.customCriteria);

  const decisions = args.options.map((opt) => {
    const d = args.state.decisionsByOptionId[opt.id];

    const cells = criteria.map((c) => {
      const cell = d?.criteriaById?.[c.id] || makeDefaultCell(c);
      return {
        id: cell.id,
        label: c.label,
        result: cell.result,
        justification:
          cell.result === "No" ? cell.justification || "" : undefined,
      };
    });

    const computedVerdict = d?.computedVerdict || "DISCOUNTED";
    const finalVerdict = d?.override ? d.finalVerdict : computedVerdict;

    return {
      optionId: opt.id,
      criteria: cells,
      computedVerdict,
      finalVerdict,
      override: d?.override || undefined,
      overrideReason: d?.override ? d.overrideReason || "" : undefined,
    };
  });

  const contract: S2_3_SCREENING = {
    decisions,
    viableOptionIds: args.state.viableOptionIds || [],
    screenedAt: args.state.screenedAt || new Date().toISOString(),
    confirmed: !!args.state.confirmed,
  };

  if (args.screeningNarrative !== undefined) {
    contract.screeningNarrative = args.screeningNarrative;
  }

  return contract;
}

export function hydrateScreeningFromContract(args: {
  options: any[];
  existing?: S2_3_SCREENING;
  customCriteria?: ScreeningCriterion[];
}): ScreeningState {
  const criteria = buildScreeningCriteria(args.customCriteria);
  return hydrateState({ options: args.options, criteria, existing: args.existing });
}

export function validateScreeningState(args: {
  state: ScreeningState;
  customCriteria?: ScreeningCriterion[];
  minJustificationLen?: number;
  minOverrideReasonLen?: number;
}): { ok: boolean; errors: string[] } {
  const criteria = buildScreeningCriteria(args.customCriteria);
  const minJ = args.minJustificationLen ?? 1;
  const minO = args.minOverrideReasonLen ?? 1;

  const errors: string[] = [];

  for (const d of Object.values(args.state.decisionsByOptionId)) {
    if (d.computedVerdict === "BASELINE") continue;

    for (const c of criteria) {
      const cell = d.criteriaById[c.id];
      if (!cell) continue;
      if (
        cell.result === "No" &&
        (cell.justification || "").trim().length < minJ
      ) {
        errors.push(
          `Option "${d.optionId}" — criterion ${c.id}: justification required`
        );
      }
    }

    if (d.override && d.overrideReason.trim().length < minO) {
      errors.push(`Option "${d.optionId}" — override reason required`);
    }
  }

  // Pass-1: block confirm if stale overrides or missing evidence
  if (args.state.hasStaleOverrides) {
    errors.push(
      "Stale overrides detected — re-confirm all overrides after methodology change"
    );
  }
  if (args.state.hasMissingEvidence) {
    errors.push(
      "Insufficient evidence detected — provide evidence for all criteria before confirming"
    );
  }

  return { ok: errors.length === 0, errors };
}
