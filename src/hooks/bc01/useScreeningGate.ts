// src/hooks/bc01/useScreeningGate.ts
// Pass 2D — Reactive evidence-driven hook. Zero optimistic fallback.
//
// Root-cause fix (all-green display):
//   criterionResultsByOptionId was always {} in the reducer because EVALUATE_OPTION
//   was never dispatched. CriterionRow fell back to legacyCell (result: "Yes") → all green.
//
// Fix: useMemo reactive computation that calls computeScreeningResults for every
//   option on every render. Results come from evidenceByOptionId (explicit prop)
//   or options[i].evidenceByCriterionId (embedded). No EVALUATE_OPTION dispatch needed.
//
// Changes vs. Pass 1:
//   - UseScreeningGateArgs: +evidenceByOptionId (optional, evidence-by-option-id map)
//   - effectiveSnapshot useMemo: locked snapshot || virtual from criteriaDefs
//   - reactiveComputed useMemo: pure-engine pass over all options
//   - decisions useMemo: built from reactiveComputed.verdictByOptionId + override records
//   - viableOptionIds: from reactive decisions (not state.viableOptionIds)
//   - hasMissingEvidence: from reactive results (not state.hasMissingEvidence)
//   - criterionResultsByOptionId, computedFlagsByOptionId: from reactive results
//   - setCriterionResult: deprecated no-op (signature preserved for backward compat)
//   - confirmScreeningV2: uses hasMissingEvidenceRef (not state.hasMissingEvidence)
//   - onChange useEffect: injects reactive verdicts into state copy before serializing

import { useReducer, useEffect, useMemo, useCallback, useRef } from "react";
import {
  screeningReducer,
  serializeScreeningToContract,
  validateScreeningState,
  SCREENING_EMPTY_STATE,
} from "../../engine/bc01/s2_3/screeningReducer";
import { buildScreeningCriteria } from "../../engine/bc01/s2_3/screeningCriteria";
import { computeScreeningResults } from "../../engine/bc01/s2_3/screeningEngine";
import type {
  ScreeningCriterion,
  ScreeningResult,
  ScreeningState,
  ScreeningVerdict,
  S2_3_SCREENING,
  MethodologySnapshot,
  OptionEvidence,
  EliminationLogEntry,
  CriterionResult,
  ScreeningFlag,
  OverrideRecord,
  CriterionEvidence,
} from "../../engine/bc01/s2_3/screeningTypes";

// ── Input types ───────────────────────────────────────────────────────────────

interface UseScreeningGateArgs {
  /** S2_2 alternatives array — [{ id, label?, shortDescription?, type?, isStatusQuo? }] */
  options: any[];
  /** Existing persisted S2_3_SCREENING blob (or undefined on first load) */
  existing?: S2_3_SCREENING;
  /** Custom criteria overrides; defaults to DEFAULT_SCREENING_CRITERIA */
  customCriteria?: ScreeningCriterion[];
  /** Called whenever state changes — receives the serialized contract ready for formData */
  onChange?: (contract: S2_3_SCREENING) => void;
  /**
   * Evidence per option, keyed by optionId → criterionId → CriterionEvidence.
   *
   * Level 5 — Zero optimistic fallback:
   *   When provided, reactive computation uses this source over options[i].evidenceByCriterionId.
   *   Absence of evidence for any criterion → CriterionResult{status:"insufficient_evidence"}
   *   → option verdict INDETERMINATE (never VIABLE by default).
   */
  evidenceByOptionId?: Record<string, Record<string, CriterionEvidence>>;
}

// ── Return type ───────────────────────────────────────────────────────────────

interface UseScreeningGateReturn {
  // ── Legacy surface (unchanged — ScreeningGateTable compat) ──────────────────
  state: ScreeningState;
  criteriaDefs: ScreeningCriterion[];
  decisions: ScreeningState["decisionsByOptionId"][string][];
  viableOptionIds: string[];
  errors: string[];
  isValid: boolean;
  confirmed: boolean;

  /** @deprecated Pass-2D: no-op. Results are computed reactively from evidenceByOptionId. */
  setCriterionResult: (
    optionId: string,
    criterionId: string,
    result: ScreeningResult
  ) => void;
  setJustification: (
    optionId: string,
    criterionId: string,
    justification: string
  ) => void;
  setOverride: (optionId: string, override: boolean) => void;
  setOverrideReason: (optionId: string, overrideReason: string) => void;
  setFinalVerdict: (optionId: string, finalVerdict: ScreeningVerdict) => void;
  confirmScreening: (screeningNarrative?: string) => boolean;
  unlock: () => void;

  // ── Pass-1 surface (new) ──────────────────────────────────────────────────

  /** Methodology snapshot currently locked in the engine */
  methodologySnapshot: MethodologySnapshot | undefined;

  /**
   * CriterionResult[] per optionId — REACTIVE source.
   * Populated on every render from computeScreeningResults (pure engine).
   * Never empty as long as criteriaDefs is non-empty.
   */
  criterionResultsByOptionId: Record<string, CriterionResult[]>;

  /**
   * ScreeningFlag[] per optionId — REACTIVE source.
   * Populated on every render from computeScreeningResults.
   */
  computedFlagsByOptionId: Record<string, ScreeningFlag[]>;

  /** Full append-only elimination log */
  eliminationLog: EliminationLogEntry[];

  /** OverrideRecord per optionId */
  overrideRecordsByOptionId: Record<string, OverrideRecord>;

  /** True when any OverrideRecord has stale=true — blocks confirmScreening */
  hasStaleOverrides: boolean;

  /**
   * True when any CriterionResult has status="insufficient_evidence".
   * REACTIVE: derived from reactive results, not state.hasMissingEvidence.
   * Blocks confirmScreening / confirmScreeningV2.
   */
  hasMissingEvidence: boolean;

  // Pass-1 action dispatchers

  /**
   * Lock the methodology snapshot. If the hash differs from the currently
   * locked one, triggers Reset A (all evaluations cleared, log SUPERSEDED).
   */
  lockMethodology: (snapshot: MethodologySnapshot, actor?: string) => void;

  /**
   * Evaluate one option using the pure engine (reducer path).
   * Note: reactive computation (useMemo) does NOT require this dispatch —
   * it runs automatically on every render from evidenceByOptionId.
   * @param resetOption - Set true on Reset B (S2.2 evidence changed post-evaluation)
   */
  evaluateOption: (
    option: any,
    optionEvidence: OptionEvidence,
    isStatusQuo: boolean,
    actor: string,
    resetOption?: boolean
  ) => void;

  /**
   * Apply a manual override with full audit trail.
   * If the methodology has changed since the previous override, the new
   * override replaces the stale one and is immediately non-stale.
   */
  applyOverride: (
    optionId: string,
    finalVerdict: ScreeningVerdict,
    overrideReason: string,
    overriddenBy: string
  ) => void;

  /**
   * Confirm screening via the Pass-1 path.
   * Blocked if hasStaleOverrides || hasMissingEvidence (reactive).
   * Returns true on success, false if blocked.
   */
  confirmScreeningV2: (screeningNarrative?: string) => boolean;
}

// ── Hook implementation ───────────────────────────────────────────────────────

export function useScreeningGate(
  args: UseScreeningGateArgs
): UseScreeningGateReturn {
  const { options, existing, customCriteria, onChange, evidenceByOptionId } = args;

  const criteriaDefs = useMemo(
    () => buildScreeningCriteria(customCriteria),
    [customCriteria]
  );

  // ── Reducer init ─────────────────────────────────────────────────────────────
  const [state, dispatch] = useReducer(screeningReducer, SCREENING_EMPTY_STATE);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ── Hydrate from existing / re-init when options change ────────────────────
  const optionsKey = useMemo(() => options.map((o) => o.id).join("|"), [options]);

  useEffect(() => {
    if (!options?.length) return;
    dispatch({ type: "INIT", options, existing, customCriteria });
  }, [optionsKey, existing, customCriteria]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effective snapshot ───────────────────────────────────────────────────────
  // Authoritative: the locked MethodologySnapshot when present.
  // Virtual fallback: built from criteriaDefs when no methodology is locked.
  //   hash="_virtual" / version="_virtual" signals display-only use.
  //   minYesCount = all criteria (strictest; only matters when evidence IS present).
  const effectiveSnapshot = useMemo((): MethodologySnapshot => {
    if (state.methodologySnapshot) return state.methodologySnapshot;
    const dealBreakerIds = criteriaDefs
      .filter((c) => c.dealBreaker === true)
      .map((c) => c.id);
    return {
      version: "_virtual",
      hash: "_virtual",
      criteria: criteriaDefs,
      viabilityRule: {
        dealBreakerIds,
        minYesCount: criteriaDefs.length,
        totalCriteria: criteriaDefs.length,
      },
      lockedBy: "system",
      lockedAt: "",
    };
  }, [state.methodologySnapshot, criteriaDefs]);

  // ── Screening-eligible options ───────────────────────────────────────────────
  // Status Quo is always included (it renders as BASELINE).
  // Every other option must have been explicitly advanced from S2.2:
  //   accepted === true  — user accepted the option (locked)
  //   saved    === true  — user hit "Save This Option" (softer gate)
  // Unsaved / un-accepted drafts remain invisible in S2.3.
  const screeningOptions = useMemo(() => {
    const isStatusQuo = (opt: any) =>
      opt?.type === "StatusQuo" ||
      opt?.type === "status_quo" ||
      opt?.id   === "status_quo" ||
      opt?.isStatusQuo === true;

    return (options ?? []).filter((opt: any) => {
      if (!opt) return false;
      if (isStatusQuo(opt)) return true;
      return opt.accepted === true || opt.saved === true;
    });
  }, [options]);

  // ── Reactive computation ─────────────────────────────────────────────────────
  // Runs computeScreeningResults for EVERY option on every render where deps change.
  //
  // Evidence source priority (per option):
  //   1. evidenceByOptionId[opt.id]          — explicit prop (highest priority)
  //   2. opt.evidenceByCriterionId           — option-embedded evidence
  //   3. {}                                  — no evidence → all insufficient_evidence
  //
  // Zero optimistic fallback:
  //   Missing evidence for any criterion → status="insufficient_evidence"
  //   → computedVerdict = INDETERMINATE (never VIABLE by default).
  const reactiveComputed = useMemo(() => {
    const resultsByOptionId: Record<string, CriterionResult[]> = {};
    const verdictByOptionId: Record<string, ScreeningVerdict> = {};
    const flagsByOptionId: Record<string, ScreeningFlag[]> = {};

    // Fix B — Evidence bridge normalisation
    // S2.2 (AlternativesManager / alternativesUtils) stores evidence slots as:
    //   { text: string, value: boolean|number|null, evidenceRefs: string[] }
    //
    // screeningEngine.ts reads evidence slots as:
    //   { textJustification?: string, numericValue?: number, evidenceRefs?: string[] }
    //
    // Without normalisation the engine always sees empty evidence → INDETERMINATE.
    // We normalise every slot here so the engine receives the shape it expects.
    function normalizeEvidenceSlot(raw: any): CriterionEvidence {
      if (!raw || typeof raw !== "object") return {};
      return {
        // "text" (S2.2 field key) → "textJustification" (engine field key)
        textJustification: raw.textJustification ?? raw.text ?? undefined,
        checkedItems: Array.isArray(raw.checkedItems) ? raw.checkedItems : undefined,
        // "value" stored as a number → numericValue.
        // Boolean / null (binary-select) is intentionally ignored here: the binary
        // evaluator reads textJustification, and the user must provide a text
        // justification alongside their Yes/No answer for the criterion to pass.
        numericValue:
          raw.numericValue !== undefined
            ? raw.numericValue
            : typeof raw.value === "number"
            ? raw.value
            : undefined,
        evidenceRefs: Array.isArray(raw.evidenceRefs) ? raw.evidenceRefs : [],
      };
    }

    for (const opt of screeningOptions) {
      // Read raw slots from the highest-priority source available
      const rawSlots: Record<string, any> =
        evidenceByOptionId?.[opt.id] ??
        (opt?.evidenceByCriterionId as Record<string, any> | undefined) ??
        {};

      // Build the normalised evidence map the engine can consume
      const evidenceMap: Record<string, CriterionEvidence> = {};
      for (const [cId, rawSlot] of Object.entries(rawSlots)) {
        evidenceMap[cId] = normalizeEvidenceSlot(rawSlot);
      }

      // Fix C — Status Quo detection
      // AlternativesManager stores the Status Quo with type "status_quo" (lowercase +
      // underscore) and id "status_quo". The previous check only matched "StatusQuo"
      // (PascalCase), so Status Quo was never recognised as baseline → INDETERMINATE.
      const isStatusQuo =
        opt?.type === "StatusQuo"  ||
        opt?.type === "status_quo" ||
        opt?.id   === "status_quo" ||
        opt?.isStatusQuo === true;

      const { computedVerdict, criterionResults, computedFlags } =
        computeScreeningResults(
          effectiveSnapshot,
          { optionId: opt.id, evidenceByCriterionId: evidenceMap },
          isStatusQuo
        );

      resultsByOptionId[opt.id] = criterionResults;
      verdictByOptionId[opt.id] = computedVerdict;
      flagsByOptionId[opt.id] = computedFlags;
    }

    return { resultsByOptionId, verdictByOptionId, flagsByOptionId };
  }, [screeningOptions, evidenceByOptionId, effectiveSnapshot]);

  // Sync reactive values to refs immediately (refs are read by effects + callbacks)
  const reactiveComputedRef = useRef(reactiveComputed);
  reactiveComputedRef.current = reactiveComputed;

  // ── Reactive decisions ────────────────────────────────────────────────────────
  // Built from engine verdicts + active override records.
  // criteriaById from reducer — used only as legacy fallback in CriterionRow.
  const decisions = useMemo(
    () =>
      screeningOptions
        .map((opt) => {
          const reducerD = state.decisionsByOptionId[opt.id];
          const computedVerdict: ScreeningVerdict =
            reactiveComputed.verdictByOptionId[opt.id] ?? "INDETERMINATE";
          const overrideRecord = state.overrideRecordsByOptionId[opt.id];
          const hasActiveOverride = !!overrideRecord && !overrideRecord.stale;
          const finalVerdict: ScreeningVerdict = hasActiveOverride
            ? overrideRecord.finalVerdict
            : computedVerdict;
          return {
            optionId: opt.id,
            criteriaById: reducerD?.criteriaById ?? {},
            computedVerdict,
            finalVerdict,
            override: hasActiveOverride,
            overrideReason:
              reducerD?.overrideReason ??
              overrideRecord?.overrideReason ??
              "",
          };
        })
        .filter(Boolean),
    [
      screeningOptions,
      state.decisionsByOptionId,
      state.overrideRecordsByOptionId,
      reactiveComputed,
    ]
  );

  const decisionsRef = useRef(decisions);
  decisionsRef.current = decisions;

  // ── Reactive viableOptionIds ──────────────────────────────────────────────────
  const viableOptionIds = useMemo(
    () =>
      decisions
        .filter((d) => d.finalVerdict === "VIABLE")
        .map((d) => d.optionId),
    [decisions]
  );

  // ── Reactive hasMissingEvidence ───────────────────────────────────────────────
  // Derived from reactive results — NOT from state.hasMissingEvidence.
  // state.hasMissingEvidence is only set after EVALUATE_OPTION dispatches,
  // which is never dispatched in the current flow.
  const hasMissingEvidence = useMemo(
    () =>
      Object.values(reactiveComputed.resultsByOptionId).some((results) =>
        results.some((r) => r.status === "insufficient_evidence")
      ),
    [reactiveComputed.resultsByOptionId]
  );

  const hasMissingEvidenceRef = useRef(hasMissingEvidence);
  hasMissingEvidenceRef.current = hasMissingEvidence;

  // ── Validation (derived) ─────────────────────────────────────────────────────
  const { ok: isValid, errors } = useMemo(
    () => validateScreeningState({ state, customCriteria }),
    [state, customCriteria]
  );

  // ── Propagate changes to parent ──────────────────────────────────────────────
  // Injects reactive verdicts and criterion results into the serialized contract.
  // Uses refs so the latest reactive values are always included, even when the
  // effect fires due to reducer state changes (not evidence changes).
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
    if (!options?.length) return;

    const rComp = reactiveComputedRef.current;
    const rDecs = decisionsRef.current;

    // Build injected decisions with reactive verdicts
    const injectedDecisions: ScreeningState["decisionsByOptionId"] = {};
    for (const d of rDecs) {
      const existing = state.decisionsByOptionId[d.optionId];
      injectedDecisions[d.optionId] = {
        optionId: d.optionId,
        criteriaById: existing?.criteriaById ?? {},
        computedVerdict: d.computedVerdict,
        finalVerdict: d.finalVerdict,
        override: d.override,
        overrideReason: d.overrideReason,
      };
    }

    const stateWithReactiveVerdicts: ScreeningState = {
      ...state,
      decisionsByOptionId: injectedDecisions,
      criterionResultsByOptionId: rComp.resultsByOptionId,
      computedFlagsByOptionId: rComp.flagsByOptionId,
      viableOptionIds: rDecs
        .filter((d) => d.finalVerdict === "VIABLE")
        .map((d) => d.optionId),
      hasMissingEvidence: hasMissingEvidenceRef.current,
    };

    const contract = serializeScreeningToContract({
      state: stateWithReactiveVerdicts,
      options,
      customCriteria,
    });
    onChangeRef.current?.(contract);
  }, [state, options, customCriteria]);

  // ── Legacy handlers ──────────────────────────────────────────────────────────

  /**
   * @deprecated Pass-2D: no-op — results are computed reactively from
   * evidenceByOptionId via computeScreeningResults (pure engine).
   * Signature preserved for backward-compatibility only.
   */
  const setCriterionResult = useCallback(
    (_optionId: string, _criterionId: string, _result: ScreeningResult) => {
      // Intentional no-op: do not dispatch SET_RESULT.
      // CriterionRow now reads from criterionResultsByOptionId (reactive).
    },
    []
  );

  const setJustification = useCallback(
    (optionId: string, criterionId: string, justification: string) => {
      dispatch({ type: "SET_JUSTIFICATION", optionId, criterionId, justification });
    },
    []
  );

  const setOverride = useCallback(
    (optionId: string, override: boolean) => {
      dispatch({ type: "SET_OVERRIDE", optionId, override });
      dispatch({ type: "RECOMPUTE", options, customCriteria });
    },
    [options, customCriteria]
  );

  const setOverrideReason = useCallback(
    (optionId: string, overrideReason: string) => {
      dispatch({ type: "SET_OVERRIDE_REASON", optionId, overrideReason });
    },
    []
  );

  const setFinalVerdict = useCallback(
    (optionId: string, finalVerdict: ScreeningVerdict) => {
      dispatch({ type: "SET_FINAL_VERDICT", optionId, finalVerdict });
      dispatch({ type: "RECOMPUTE", options, customCriteria });
    },
    [options, customCriteria]
  );

  const confirmScreening = useCallback(
    (screeningNarrative?: string): boolean => {
      const validation = validateScreeningState({ state, customCriteria });
      if (!validation.ok) return false;
      dispatch({ type: "CONFIRM" });

      const confirmedState: ScreeningState = {
        ...state,
        confirmed: true,
        screenedAt: new Date().toISOString(),
      };
      const contract = serializeScreeningToContract({
        state: confirmedState,
        options,
        customCriteria,
        screeningNarrative,
      });
      onChangeRef.current?.(contract);
      return true;
    },
    [state, options, customCriteria]
  );

  const unlock = useCallback(() => {
    dispatch({ type: "UNCONFIRM" });
  }, []);

  // ── Pass-1 handlers ──────────────────────────────────────────────────────────

  const lockMethodology = useCallback(
    (snapshot: MethodologySnapshot, actor?: string) => {
      dispatch({ type: "LOCK_METHODOLOGY", snapshot, actor });
    },
    []
  );

  const evaluateOption = useCallback(
    (
      option: any,
      optionEvidence: OptionEvidence,
      isStatusQuo: boolean,
      actor: string,
      resetOption = false
    ) => {
      dispatch({
        type: "EVALUATE_OPTION",
        option,
        optionEvidence,
        isStatusQuo,
        actor,
        resetOption,
      });
    },
    []
  );

  const applyOverride = useCallback(
    (
      optionId: string,
      finalVerdict: ScreeningVerdict,
      overrideReason: string,
      overriddenBy: string
    ) => {
      dispatch({
        type: "APPLY_OVERRIDE",
        optionId,
        finalVerdict,
        overrideReason,
        overriddenBy,
      });
    },
    []
  );

  const confirmScreeningV2 = useCallback(
    (screeningNarrative?: string): boolean => {
      // Use hasMissingEvidenceRef (reactive) — NOT state.hasMissingEvidence,
      // which is only populated after EVALUATE_OPTION dispatches (never dispatched here).
      if (state.hasStaleOverrides || hasMissingEvidenceRef.current) return false;

      dispatch({ type: "CONFIRM_SCREENING" });

      const rComp = reactiveComputedRef.current;
      const rDecs = decisionsRef.current;

      const injectedDecisions: ScreeningState["decisionsByOptionId"] = {};
      for (const d of rDecs) {
        const existing = state.decisionsByOptionId[d.optionId];
        injectedDecisions[d.optionId] = {
          optionId: d.optionId,
          criteriaById: existing?.criteriaById ?? {},
          computedVerdict: d.computedVerdict,
          finalVerdict: d.finalVerdict,
          override: d.override,
          overrideReason: d.overrideReason,
        };
      }

      const confirmedState: ScreeningState = {
        ...state,
        confirmed: true,
        screenedAt: new Date().toISOString(),
        decisionsByOptionId: injectedDecisions,
        criterionResultsByOptionId: rComp.resultsByOptionId,
        computedFlagsByOptionId: rComp.flagsByOptionId,
        viableOptionIds: rDecs
          .filter((d) => d.finalVerdict === "VIABLE")
          .map((d) => d.optionId),
        hasMissingEvidence: false, // confirmed → evidence is complete by definition
      };

      const contract = serializeScreeningToContract({
        state: confirmedState,
        options,
        customCriteria,
        screeningNarrative,
      });
      onChangeRef.current?.(contract);
      return true;
    },
    [state, options, customCriteria]
  );

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    // Legacy surface
    state,
    criteriaDefs,
    decisions,
    viableOptionIds,
    errors,
    isValid,
    confirmed: state.confirmed,
    setCriterionResult,
    setJustification,
    setOverride,
    setOverrideReason,
    setFinalVerdict,
    confirmScreening,
    unlock,

    // Pass-1 surface — reactive sources where applicable
    methodologySnapshot: state.methodologySnapshot,
    criterionResultsByOptionId: reactiveComputed.resultsByOptionId,   // REACTIVE
    computedFlagsByOptionId: reactiveComputed.flagsByOptionId,         // REACTIVE
    eliminationLog: state.eliminationLog,
    overrideRecordsByOptionId: state.overrideRecordsByOptionId,
    hasStaleOverrides: state.hasStaleOverrides,
    hasMissingEvidence,                                                 // REACTIVE
    lockMethodology,
    evaluateOption,
    applyOverride,
    confirmScreeningV2,
  };
}
