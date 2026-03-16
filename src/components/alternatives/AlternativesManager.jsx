// flowgestio-frontend/src/components/alternatives/AlternativesManager.jsx
// FINAL PRODUCTION - Acceptance Locking + Type Compatibility
// No temporary patches - Definitive architecture

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ensureStatusQuo,
  normalizeOption2_2,
  isOptionImmutable,
  acceptOption,
  mergeOptionsPreservingAccepted,
  updateOptionSafely,
  uid,
  OPTION_TYPES,
  ensureEvidenceSlotsForOption,
  updateEvidence,
} from "./alternativesUtils";
import { parseCriteriaFromS2_1 } from "../../engine/bc01/s2_1/s2_1Utils";

/**
 * Section 2.2 - List the Possible Options (Discovery)
 *
 * Features:
 * - AI-powered option generation (Perplexity)
 * - Acceptance locking (immutable once accepted)
 * - Type compatibility (Perplexity PascalCase + legacy lowercase)
 * - No preview under accordion (description only in textarea)
 *
 * UX additions:
 * - User options (incl. Status Quo) have primary "Save This Option" button (same position as Accept)
 * - Saved options show ✓ Saved badge + green/emerald accordion
 * - Saved fields persist even if utils normalize drops unknown keys (hardened merge)
 */
export default function AlternativesManager({
  value,
  onChange,
  onDraftWithAI,
  onResearchOptions,
  onBenchmarkOption,
  s2_1Data,
  title = "2.2 List the Possible Options",
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [isResearching, setIsResearching] = useState(false);
  // Guard: auto-expand fires once on mount; never re-fires after Save sets expandedId(null).
  const initialExpandedRef = useRef(false);

  // Derive screening criteria from S2.1 methodology lock.
  // Falls back to DEFAULT_GATE_CRITERIA when s2_1Data is absent or unpopulated.
  const screeningCriteria = useMemo(
    () => parseCriteriaFromS2_1(s2_1Data ?? {}),
    [s2_1Data]
  );

  // Normalize incoming options using Section 2.2 normalizer
  // ✅ Preserve non-canonical UI state flags (saved/savedAt) that normalizer may drop
  // ✅ Belt-and-suspenders: also explicitly re-attach evidenceByCriterionId so it
  //    survives even if a future normalizer change forgets to pass it through.
  const options = useMemo(() => {
    if (!Array.isArray(value)) return ensureStatusQuo([]);

    const base = value.map((raw) => {
      const norm = normalizeOption2_2(raw);
		return {
		  ...raw,   // ✅ Preserve ALL existing user-entered fields
		  ...norm,  // ✅ Canonicalize id/name/type/description safely
		  ...(raw?.saved !== undefined ? { saved: raw.saved } : {}),
		  ...(raw?.savedAt ? { savedAt: raw.savedAt } : {}),
		  ...(raw?.evidenceByCriterionId !== undefined
			? { evidenceByCriterionId: raw.evidenceByCriterionId }
			: {}),
		};
    });

    return ensureStatusQuo(base);
  }, [value]);

  // Ensure parent receives status quo if missing
  useEffect(() => {
    if (!Array.isArray(value)) return;
    const ensured = ensureStatusQuo(value);
    if (ensured.length !== value.length) onChange?.(ensured);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default: expand status quo once on first mount.
  // initialExpandedRef prevents re-fire when Save sets expandedId(null).
  useEffect(() => {
    if (initialExpandedRef.current) return;
    const sq = options.find((o) => o.id === "status_quo" || o.type === "status_quo");
    if (sq) {
      setExpandedId(sq.id);
      initialExpandedRef.current = true;
    } else if (options[0]) {
      setExpandedId(options[0].id);
      initialExpandedRef.current = true;
    }
  }, [options]); // expandedId removed — was the cause of re-fire on collapse

  function updateOption(next) {
    const current = options.find((o) => o.id === next.id);

    // ✅ mergedRaw: union of current stored state + incoming update.
    // next wins on conflicts, but ALL existing fields (capex, opex, sources,
    // costAssumptions, capexLevel, etc.) are preserved from current even when
    // the normalizer does not output them.
    const mergedRaw = current ? { ...current, ...next } : { ...next };

    // baseUpdated: for existing options use updateOptionSafely (preserves accepted-option
    // protection); for new options fall back to normalizeOption2_2.
    const baseUpdated = current
      ? updateOptionSafely(current, mergedRaw)
      : normalizeOption2_2(mergedRaw);

    // Final: raw fields FIRST so non-normalised fields (capex, opex, sources,
    // costAssumptions, etc.) survive; canonical overlay second; pinned flags last.
    const updated = {
      ...mergedRaw,    // ← raw first: preserves ALL stored fields
      ...baseUpdated,  // ← canonical overlay: id/name/type/description/…
      // Pinned flags: explicit last-write guarantee (immune to normaliser drift)
      ...(next?.saved !== undefined ? { saved: next.saved } : {}),
      ...(next?.savedAt ? { savedAt: next.savedAt } : {}),
      // Level 5: evidence must survive all merges
      ...(next?.evidenceByCriterionId !== undefined
        ? { evidenceByCriterionId: next.evidenceByCriterionId }
        : {}),
    };

    const nextOptions = options.map((o) => (o.id === next.id ? updated : o));
    onChange?.(ensureStatusQuo(nextOptions));
  }

  function addOption() {
    const newOpt = normalizeOption2_2({
      id: uid(),
      type: "custom",
      name: "New option",
      description: "",
      shortDescription: "",
      saved: false,
      savedAt: null,
    });
    const next = [...options, newOpt];
    onChange?.(ensureStatusQuo(next));
    setExpandedId(newOpt.id);
  }

  async function handleResearch() {
    if (!onResearchOptions) {
      alert("Research feature not configured. Please connect Perplexity API.");
      return;
    }

    setIsResearching(true);

    const warningTimeout = setTimeout(() => {
      console.warn("⏱️  Research taking longer than expected (>30s)...");
    }, 30000);

    try {
      const result = await onResearchOptions();
      clearTimeout(warningTimeout);

      // Merge preserving accepted options
      const newOptions = result?.options || [];
      const merged = mergeOptionsPreservingAccepted(options, newOptions);
      onChange?.(ensureStatusQuo(merged));
    } catch (error) {
      clearTimeout(warningTimeout);
      console.error("Research failed:", error);

      if (error.message?.includes("timeout")) {
        alert(
          "⏱️ Request timeout: The AI research service took too long to respond.\n\n" +
            "Possible solutions:\n" +
            "1. Try again (API might be temporarily slow)\n" +
            "2. Simplify your problem statement\n" +
            "3. Contact support if this persists"
        );
      } else {
        alert(`Failed to generate options: ${error.message}\n\nPlease try again.`);
      }
    } finally {
      setIsResearching(false);
    }
  }

  function deleteOption(id) {
    const option = options.find((o) => o.id === id);
    if (isOptionImmutable(option)) {
      alert("This option is locked and cannot be deleted. Unaccept it first if you need to remove it.");
      return;
    }

    const next = options.filter((o) => o.id !== id);
    onChange?.(ensureStatusQuo(next));
    if (expandedId === id) setExpandedId("status_quo");
  }

  // ✅ Accept uses the version coming from OptionEditor (localOption), not stale parent snapshot
  function handleAcceptOption(optionFromEditor) {
    const accepted = acceptOption(optionFromEditor);
    updateOption(accepted);
  }

  function handleUnacceptOption(option) {
    const unaccepted = {
      ...option,
      accepted: false,
      acceptedAt: null,
      acceptedHash: null,
      acceptedTamperDetected: false,
    };
    updateOption(unaccepted);
  }

  function toggleExpand(id) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* S2.2 Warning — criteria not yet locked */}
      {!s2_1Data?.methodologyLocked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true">⚠</span>
          <span className="text-sm text-amber-800">
            Screening criteria not locked — captured evidence may require revalidation once
            the methodology is locked in S2.1.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          {title ? <div className="text-base font-semibold text-slate-900">{title}</div> : null}
          <div className="mt-1 text-sm text-slate-600">
            Long list (brainstorming). Screening and viability decisions happen in Section 2.3 / 2.4.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleResearch}
            disabled={isResearching}
            title="Use AI to research and suggest viable options based on your project context"
          >
            {isResearching ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Researching...
              </>
            ) : (
              <>🔍 Generate Options with AI Research</>
            )}
          </button>

          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            onClick={addOption}
          >
            + Add option
          </button>
        </div>
      </div>

      {/* Options list - accordion */}
      <div className="space-y-3">
        {options.map((option, idx) => (
          <OptionAccordion
            key={option.id}
            option={option}
            index={idx}
            isExpanded={expandedId === option.id}
            onToggleExpand={() => toggleExpand(option.id)}
            onUpdate={updateOption}
            onDelete={() => deleteOption(option.id)}
            onAccept={(optFromEditor) => handleAcceptOption(optFromEditor)}
            onUnaccept={() => handleUnacceptOption(option)}
            onDraftWithAI={onDraftWithAI}
            screeningCriteria={screeningCriteria}
            onBenchmarkOption={onBenchmarkOption}
          />
        ))}
      </div>
    </div>
  );
}

function OptionAccordion({
  option,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onAccept,
  onUnaccept,
  onDraftWithAI,
  screeningCriteria,
  onBenchmarkOption,
}) {
  const isImmutable = isOptionImmutable(option);
  const isAccepted = option.accepted === true;
  const isTampered = option.acceptedTamperDetected === true;
  const isSaved = option.saved === true;

  const wrapperClasses = `rounded-xl border ${
    isTampered
      ? "border-red-400 bg-red-50"
      : isAccepted
      ? "border-green-300 bg-green-50"
      : isSaved
      ? "border-emerald-300 bg-emerald-50"
      : "border-slate-200 bg-white"
  } shadow-sm overflow-hidden`;

  return (
    <div className={wrapperClasses}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-slate-500">{`2.2.${index + 1}`}</span>

            <span className="font-semibold text-slate-900 truncate">
              {option.name || "Unnamed option"}
            </span>

            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {formatType(option.type)}
            </span>

            {isTampered && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-medium">
                ⚠️ Tampered
              </span>
            )}

            {isAccepted && !isTampered && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-600 text-white font-medium">
                ✓ Accepted
              </span>
            )}

            {isSaved && !isAccepted && !isTampered && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-medium">
                ✓ Saved
              </span>
            )}

            {isImmutable && !isAccepted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                Required
              </span>
            )}
          </div>
          {/* No preview under accordion */}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isImmutable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="Delete option"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}

          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-indigo-50/60">
          <OptionEditor
            option={option}
            onChange={onUpdate}
            onDraftWithAI={onDraftWithAI}
            onAccept={onAccept}
            onUnaccept={onUnaccept}
            onAfterSave={() => onToggleExpand()} // ✅ collapse after save for "Accepted-like" feel
            screeningCriteria={screeningCriteria}
            onBenchmarkOption={onBenchmarkOption}
          />
        </div>
      )}
    </div>
  );
}

function OptionEditor({ option, onChange, onDraftWithAI, onAccept, onUnaccept, onAfterSave, screeningCriteria, onBenchmarkOption }) {
  const [localOption, setLocalOption] = useState(option);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState(null);

  const isAccepted = option.accepted === true;
  const isTampered = option.acceptedTamperDetected === true;

  const isPerplexity =
    option?.provider === "perplexity" || String(option?.id || "").startsWith("research_");
  const isStatusQuo = option?.id === "status_quo" || option?.type === "status_quo";
  const isUserOption = !isPerplexity || isStatusQuo;

  // Sync localOption from props — but ONLY when it's safe to do so.
  //
  // Problem this fixes (Bug A):
  //   Every time the parent re-renders it may produce new option object references
  //   even when the underlying data is unchanged (useMemo rebuilds the array on any
  //   `value` identity change).  The naive `setLocalOption(option)` on every `option`
  //   reference change would silently overwrite evidence fields the user has typed but
  //   not yet saved.
  //
  // Safe-sync rules:
  //   1. Different option id  → always sync (user switched to a different option)
  //   2. Same id, no pending local changes → sync (keeps display consistent)
  //   3. Same id, user has unsaved local edits → keep local state untouched
  //      (user can Cancel to reset, or Save to commit)
  useEffect(() => {
    setLocalOption((prev) => {
      // Rule 1: different option — always replace
      if (prev?.id !== option?.id) return option;

      // Rule 2 / 3: same option — only block sync when USER-EDITABLE fields differ.
      // Comparing targeted fields instead of the full object so that upstream
      // metadata writes (accepted, acceptedAt, acceptedHash, saved, savedAt) are
      // NEVER blocked by the stale-state guard.  Those changes MUST flow in so the
      // editor correctly reflects the locked state (fields disabled, button swapped).
      const EDITABLE_FIELDS = ["name", "type", "description", "evidenceByCriterionId", "financialInputs"];
      const hasPendingEdits = EDITABLE_FIELDS.some(
        (f) => JSON.stringify(prev?.[f]) !== JSON.stringify(option?.[f])
      );
      if (hasPendingEdits) return prev; // keep user's in-progress work

      return option;
    });
  }, [option]);

  // ── Auto-commit flag ──────────────────────────────────────────────────────
  // React functional updaters must be pure — no side effects.  Instead, set
  // this ref to true before each user-initiated state update.  The useEffect
  // below reads it after React commits the new localOption and fires onChange.
  const pendingAutoCommit = useRef(false);

  function updateField(field, value) {
    pendingAutoCommit.current = true;
    setLocalOption((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancel() {
    setLocalOption(option);
  }

  function handlePrimarySave() {
    onChange({
      ...localOption,
      saved: true,
      savedAt: new Date().toISOString(),
    });
    onAfterSave?.();
  }

  const hasChanges = JSON.stringify(localOption) !== JSON.stringify(option);

  // ── Evidence update handler ──────────────────────────────────────────────
  // Updates localOption.evidenceByCriterionId via the pure updateEvidence() utility.
  // ABSOLUTE RULE: never touches acceptedHash or any acceptance metadata.
  function handleEvidenceChange(criterionId, patch) {
    pendingAutoCommit.current = true;
    setLocalOption((prev) => updateEvidence(prev, criterionId, patch));
  }

  // ── Financial inputs handler ──────────────────────────────────────────────
  // Updates a single sub-field inside localOption.financialInputs.
  // Stores null when the input is cleared so the Step3 bridge can fall through
  // to the costBenchmark midpoint (or 0) instead of hard-coding zero.
  function updateFinancialField(field, raw) {
    pendingAutoCommit.current = true;
    setLocalOption((prev) => ({
      ...prev,
      financialInputs: {
        ...(prev.financialInputs || {}),
        [field]: raw === "" ? null : Number(raw),
      },
    }));
  }

  // ── Auto-commit for generated options ─────────────────────────────────────
  // Generated options have no Save button.  Every user-initiated field change
  // must be committed to the parent immediately so edits survive accordion
  // collapse/remount (OptionEditor unmounts on collapse; useState(option) on
  // remount restores whatever the parent last received).
  //
  // This effect fires AFTER React has committed localOption to the DOM, so
  // `localOption` here is always the fully-updated value — no stale closure.
  // Calling onChange from useEffect is a valid React pattern (unlike calling
  // setState from inside a functional updater, which is not).
  //
  // The sync guard useEffect may also call setLocalOption (e.g. to reset
  // localOption = option after a parent round-trip).  pendingAutoCommit guards
  // against auto-committing those sync-guard writes back to the parent.
  useEffect(() => {
    if (!pendingAutoCommit.current || isUserOption || isAccepted) return;
    pendingAutoCommit.current = false;
    onChange(localOption);
  }, [localOption]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cost benchmark handler ────────────────────────────────────────────────
  // Fetches raw benchmark data from onBenchmarkOption() and stores it under
  // costBenchmark.  Two important constraints:
  //
  // 1. Functional setLocalOption updater — avoids the stale-closure problem
  //    where the `localOption` captured at call-time may be out of date by
  //    the time the async result arrives (user may have edited fields while
  //    the request was in-flight).  `prev` is always the current state.
  //
  // 2. onChange uses `option` (parent prop) as base — NOT `localOption`.
  //    Using localOption would commit all unsaved edits to the parent, which
  //    makes `option` match `localOption` in every EDITABLE_FIELD.  The
  //    subsequent useEffect sync then sets hasPendingEdits = false, collapses
  //    localOption back to option, and makes hasChanges = false — disabling
  //    the Save button even though the user has made meaningful changes.
  //    By using option as base we push only costBenchmark to parent while
  //    leaving the editable-field delta intact so hasChanges stays true.
  async function handleBenchmark() {
    if (!onBenchmarkOption || isBenchmarking) return;
    setIsBenchmarking(true);
    setBenchmarkError(null);
    try {
      const result = await onBenchmarkOption(localOption);
      if (result) {
        const costBenchmark = {
          capex:            result.capex            ?? null,
          opex:             result.opex             ?? null,
          costAssumptions:  result.costAssumptions  || "",
          sources:          Array.isArray(result.sources) ? result.sources : [],
          updatedAt:        new Date().toISOString(),
        };
        // Functional updater: `prev` is the current local state, safe against
        // concurrent edits made while the async request was in-flight.
        setLocalOption((prev) => ({ ...prev, costBenchmark }));
        // onChange uses `option` (parent prop) as base — NOT `localOption`.
        // handleBenchmark is async; by the time this line runs, `onChange` is
        // still the closure captured at click-time.  That closure chain includes
        // the stale `handleSectionChange` in Step3Generate, which captured
        // `formData` at click-time.  If we spread `localOption` here we push ALL
        // editable fields into the stale formData write, overwriting any S2.1
        // keystrokes the user made while the benchmark was loading.  Spreading
        // only `option` (parent snapshot) keeps the delta minimal — just
        // costBenchmark — so the stale-closure overwrite is harmless.
        onChange({ ...option, costBenchmark });
      } else {
        setBenchmarkError("No reliable cost data found for this option.");
      }
    } catch (err) {
      console.error("Benchmark failed:", err);
      setBenchmarkError("Benchmark request failed. Please try again.");
    } finally {
      setIsBenchmarking(false);
    }
  }

  // ── Apply benchmark to financial inputs ───────────────────────────────────
  // Explicit user action: reads midpoints from costBenchmark and writes them
  // into localOption.financialInputs only.  Null dimensions are skipped so
  // existing user-entered values are preserved.
  //
  // IMPORTANT — onChange uses `option` (parent prop) as base, NOT `localOption`.
  // We must persist financialInputs to the parent so the values survive an
  // accordion collapse/remount (OptionEditor remounts from useState(option); if
  // the parent still has financialInputs: null the applied values are lost).
  // Using `option` as base (not `localOption`) keeps the delta minimal — only
  // financialInputs is written — so other unsaved edits (description, evidence)
  // remain as a delta between localOption and the updated parent, keeping
  // hasPendingEdits = true and hasChanges = true for user options.
  // For generated options the Accept button is not gated by hasChanges, so
  // either way is safe.
  function handleApplyBenchmark() {
    const bm = localOption.costBenchmark;
    if (!bm) return;
    // Handles number | { low, high } | { min, max } | { value } | one-sided ranges.
    // BUG 3 fix: the API may return capex as { min, max } while opex is a plain number;
    // the old function only handled number|{ low,high } so capex stayed null after Apply.
    const midpoint = (v) => {
      if (typeof v === "number") return v;
      if (v && typeof v === "object") {
        const lo = v.low  ?? v.min  ?? null;
        const hi = v.high ?? v.max  ?? null;
        if (lo != null && hi != null) return (Number(lo) + Number(hi)) / 2;
        if (lo != null) return Number(lo); // lower-bound only → use it
        if (hi != null) return Number(hi); // upper-bound only → use it
        if (v.value != null) return Number(v.value); // single-value shape
      }
      return null;
    };
    const capexMid = midpoint(bm.capex);
    const opexMid  = midpoint(bm.opex);
    // Build the new financialInputs from the parent option (not localOption) so
    // we don't accidentally commit unsaved description/evidence edits.
    const newFi = {
      ...(option.financialInputs || {}),
      ...(capexMid !== null ? { capex:      capexMid } : {}),
      ...(opexMid  !== null ? { opexAnnual: opexMid  } : {}),
    };
    // Update local state via functional updater (safe against batched updates).
    setLocalOption((prev) => ({
      ...prev,
      financialInputs: {
        ...(prev.financialInputs || {}),
        ...(capexMid !== null ? { capex:      capexMid } : {}),
        ...(opexMid  !== null ? { opexAnnual: opexMid  } : {}),
      },
    }));
    // Persist to parent so values survive accordion collapse/remount.
    onChange({ ...option, financialInputs: newFi });
  }

  return (
    <div className="p-4 space-y-4">
      {isTampered && (
        <div className="p-3 bg-red-100 border border-red-400 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-600 font-bold">⚠️</span>
            <div className="flex-1">
              <div className="font-semibold text-red-900">Tamper Detected</div>
              <div className="text-sm text-red-800 mt-1">
                This accepted option&apos;s core fields have been modified. Unaccept and re-accept to resolve.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Option name */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Option name {isAccepted && <span className="text-xs text-green-600">(locked)</span>}
        </label>
        <input
          type="text"
          value={localOption.name || ""}
          onChange={(e) => updateField("name", e.target.value)}
          disabled={isAccepted}
          placeholder="e.g., COTS - Workday HCM"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Type {isAccepted && <span className="text-xs text-green-600">(locked)</span>}
        </label>
        <select
          value={localOption.type || "custom"}
          onChange={(e) => updateField("type", e.target.value)}
          disabled={isAccepted}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          {OPTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Description {isAccepted && <span className="text-xs text-green-600">(locked)</span>}
          </label>
          {onDraftWithAI && !isAccepted && (
            <button
              type="button"
              onClick={() => onDraftWithAI(localOption)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              ✨ Draft with AI
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 mb-2">
          3–5 sentences: what it is, how it addresses the business need, key assumptions/dependencies. Optional: 1 official URL max.
        </div>

        <textarea
          value={localOption.description || ""}
          onChange={(e) => {
            const v = e.target.value;
            updateField("description", v);
            updateField("shortDescription", v);
          }}
          disabled={isAccepted}
          placeholder="Briefly describe the option at comparable high-level detail..."
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* ── Section 1: Cost estimates (primary inputs) ───────────────────────── */}
      {/* Editable CAPEX / OPEX fields for all options.                          */}
      {/* Values feed Step 3.3 as priority-1 source (above legacy opt.capex and  */}
      {/* above costBenchmark midpoints). Benefits are calculated automatically   */}
      {/* by scoreEngineV3 and are NOT entered here.                              */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-700">Cost estimates</span>
          {isAccepted && <span className="text-xs text-green-600">(locked)</span>}
        </div>
        <p className="text-xs text-slate-500 mb-2">
          Enter the estimated implementation and operating costs for this option.
          These values will be used later in the financial evaluation (Step 3.3).
          Benefits and financial metrics are calculated automatically by scoreEngineV3.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              CAPEX — one-time ($)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={localOption.financialInputs?.capex ?? ""}
              onChange={(e) => updateFinancialField("capex", e.target.value)}
              disabled={isAccepted}
              placeholder="e.g. 250 000"
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Annual OPEX ($)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={localOption.financialInputs?.opexAnnual ?? ""}
              onChange={(e) => updateFinancialField("opexAnnual", e.target.value)}
              disabled={isAccepted}
              placeholder="e.g. 80 000"
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Benchmark evidence card ───────────────────────────────── */}
      {/* Shown for all Perplexity options (pre- and post-acceptance).           */}
      {/* Action buttons (Refresh / Apply) are hidden once the option is locked. */}
      {isPerplexity && onBenchmarkOption && (
        <BenchmarkEvidenceCard
          benchmark={localOption.costBenchmark}
          isBenchmarking={isBenchmarking}
          benchmarkError={benchmarkError}
          isLocked={isAccepted}
          onRefresh={handleBenchmark}
          onApply={handleApplyBenchmark}
        />
      )}

      {/* ── Screening evidence (S2.2) — Level 5 ────────────────────────────── */}
      <ScreeningEvidencePanel
        localOption={localOption}
        onEvidenceChange={handleEvidenceChange}
        criteria={screeningCriteria}
      />

      {/* Primary action controls */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
        {!isAccepted && hasChanges && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}

          {/* User options (Status Quo + custom): primary Save button.
            Saves without locking — saved:true + emerald badge. */}
        {isUserOption && !isAccepted && (
          <button
            type="button"
            onClick={handlePrimarySave}
            className="ml-auto px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasChanges}
            title={!hasChanges ? "No changes to save" : "Save this option"}
          >
            ✓ Save This Option
          </button>
        )}

        {/* Perplexity-generated options: Accept button (permanently locks the option).
            Passes localOption so all current edits are committed atomically before locking. */}
        {!isUserOption && !isAccepted && (
          <button
            type="button"
            onClick={() => { onAccept(localOption); onAfterSave?.(); }}
            className="ml-auto px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!localOption?.name?.trim()}
            title={!localOption?.name?.trim() ? "Option name is required" : "Accept and permanently lock this option"}
          >
            ✓ Accept This Option
          </button>
        )}

        {isAccepted && (
          <button
            type="button"
            onClick={onUnaccept}
            className="ml-auto px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
            title="Unlock this option to allow modification"
          >
            ✗ Unaccept
          </button>
        )}
      </div>
    </div>
  );
}

// ── ScreeningEvidencePanel ────────────────────────────────────────────────────

/**
 * Renders the S2.2 screening evidence capture panel inside OptionEditor.
 *
 * Design invariants:
 *  - Read-only when option.acceptedHash is present (accepted options are immutable)
 *  - Binary criteria show Yes/No/Unknown select → value: true/false/null
 *  - Threshold/number criteria show numeric input → value: number|null
 *  - All criteria show a text textarea and an evidenceRefs text input
 *  - Evidence is stored in localOption.evidenceByCriterionId (never in a separate state)
 *  - Never touches acceptedHash or acceptance metadata
 *
 * @param {object}   localOption        - current local option state from OptionEditor
 * @param {function} onEvidenceChange   - (criterionId, patch) => void
 * @param {Array}    criteria           - ScreeningCriterion[] from parseCriteriaFromS2_1
 */
function ScreeningEvidencePanel({ localOption, onEvidenceChange, criteria }) {
  if (!criteria || criteria.length === 0) return null;

  // ABSOLUTE RULE: option with acceptedHash = fully read-only evidence panel
  const isLocked = !!localOption.acceptedHash;

  // Normalize slots so every criterion has a slot (does not mutate localOption)
  const withSlots = ensureEvidenceSlotsForOption(localOption, criteria);

  return (
    <div className="space-y-1">
      {/* Panel header */}
      <div className="flex items-center gap-2 pt-2 pb-1 border-t border-slate-200">
        <span className="text-sm font-semibold text-slate-700">Screening evidence</span>
        <span className="text-xs text-slate-400 font-normal">(S2.2 — Level 5)</span>
        {isLocked && (
          <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
            Locked — accepted
          </span>
        )}
      </div>

      {/* Criterion slots */}
      <div
        className={[
          "space-y-3",
          isLocked ? "opacity-60 pointer-events-none select-none" : "",
        ].join(" ")}
      >
        {criteria.map((c) => {
          const slot = withSlots.evidenceByCriterionId?.[c.id] ?? {
            text: "",
            value: null,
            evidenceRefs: [],
          };
          const ruleType = c.ruleConfig?.type;

          return (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-3 space-y-2"
            >
              {/* Criterion label row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {c.dealBreaker === true && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                    Deal-breaker
                  </span>
                )}
                <span className="text-sm font-medium text-slate-800">{c.label}</span>
                <span className="text-xs text-slate-400 font-mono">{c.id}</span>
              </div>

              {/* Helper text for financial affordability criterion */}
              {c.id === "financial_affordability" && (
                <p className="text-xs text-slate-500">
                  Explain whether the proposed CAPEX and OPEX values fit within the
                  organization&apos;s approved funding envelope or affordability constraints.
                  You may reference benchmark evidence above.
                </p>
              )}

              {/* Text evidence (always shown) */}
              <textarea
                rows={2}
                disabled={isLocked}
                value={slot.text || ""}
                onChange={(e) => onEvidenceChange(c.id, { text: e.target.value })}
                placeholder="Describe the evidence for this criterion…"
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:bg-slate-50 disabled:cursor-not-allowed resize-none"
              />

              {/* Binary select (Yes / No / Unknown) */}
              {ruleType === "binary" && (
                <select
                  disabled={isLocked}
                  value={
                    slot.value === true
                      ? "true"
                      : slot.value === false
                      ? "false"
                      : ""
                  }
                  onChange={(e) => {
                    const v =
                      e.target.value === "true"
                        ? true
                        : e.target.value === "false"
                        ? false
                        : null;
                    onEvidenceChange(c.id, { value: v });
                  }}
                  className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="">— Unknown —</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}

              {/* Numeric input (threshold / number rule type) */}
              {(ruleType === "threshold" || ruleType === "number") && (
                <input
                  type="number"
                  disabled={isLocked}
                  value={slot.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    onEvidenceChange(c.id, { value: v });
                  }}
                  placeholder="Enter numeric value…"
                  className="w-36 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              )}

              {/* Evidence references (comma-separated) */}
              <input
                type="text"
                disabled={isLocked}
                value={Array.isArray(slot.evidenceRefs) ? slot.evidenceRefs.join(", ") : ""}
                onChange={(e) => {
                  const refs = e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  onEvidenceChange(c.id, { evidenceRefs: refs });
                }}
                placeholder="Evidence refs (comma-separated): Doc-1, Annex-B…"
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── BenchmarkEvidenceCard ─────────────────────────────────────────────────────
/**
 * Compact evidence card for costBenchmark data (Section 2 of the cost UX).
 *
 * Layout:
 *   [📊 Benchmark evidence]          [↻ Refresh benchmark]
 *   Suggested CAPEX: $X,XXX,XXX
 *   Suggested Annual OPEX: $X,XXX
 *   Sources: N
 *   [Apply benchmark values →]
 *
 * Rules:
 *  - "Refresh benchmark" and "Apply benchmark values" are hidden when isLocked.
 *  - capex / opex may be a plain number OR { low, high, currency } range object.
 *    Both are displayed as a formatted string; the Apply action uses midpoints.
 *  - Returns a card shell (never null) so the section is always visible for
 *    Perplexity options, even before the first benchmark fetch.
 */
function BenchmarkEvidenceCard({
  benchmark,
  isBenchmarking,
  benchmarkError,
  isLocked,
  onRefresh,
  onApply,
}) {
  // Formats number | { low, high } | { min, max } | { value } → "$X,XXX" or "$X – $Y" or null
  // BUG 3 fix: extended to handle { min, max } and { value } so capex ranges display correctly.
  const fmtVal = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return `$${v.toLocaleString()}`;
    if (typeof v === "object") {
      const lo = v.low  ?? v.min  ?? null;
      const hi = v.high ?? v.max  ?? null;
      const loStr = lo != null ? `$${Number(lo).toLocaleString()}` : null;
      const hiStr = hi != null ? `$${Number(hi).toLocaleString()}` : null;
      if (loStr && hiStr) return `${loStr} – ${hiStr}`;
      if (loStr) return `≥ ${loStr}`;
      if (hiStr) return `≤ ${hiStr}`;
      if (v.value != null) return `$${Number(v.value).toLocaleString()}`;
    }
    return null;
  };

  const capexStr    = benchmark ? fmtVal(benchmark.capex) : null;
  const opexStr     = benchmark ? fmtVal(benchmark.opex)  : null;
  const sourceCount = benchmark && Array.isArray(benchmark.sources) ? benchmark.sources.length : 0;
  const hasData     = capexStr || opexStr;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">📊 Benchmark evidence</span>
        {!isLocked && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isBenchmarking}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBenchmarking ? "⏳ Benchmarking…" : "↻ Benchmark with AI"}
          </button>
        )}
      </div>

      {/* Suggested values */}
      {hasData ? (
        <div className="space-y-0.5">
          {capexStr && (
            <div className="text-xs text-slate-600">
              Suggested CAPEX:{" "}
              <span className="font-medium">{capexStr}</span>
            </div>
          )}
          {opexStr && (
            <div className="text-xs text-slate-600">
              Suggested Annual OPEX:{" "}
              <span className="font-medium">{opexStr}</span>
            </div>
          )}
          {sourceCount > 0 && (
            <div className="text-xs text-slate-400">
              Sources: {sourceCount}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs italic text-slate-400">
          {benchmarkError ? (
            <span className="text-amber-700">{benchmarkError}</span>
          ) : benchmark ? (
            "No reliable cost data found for this option."
          ) : (
            "No benchmark data yet — click Benchmark with AI to fetch cost estimates."
          )}
        </div>
      )}

      {/* Apply action (only when unlocked and has data) */}
      {!isLocked && hasData && (
        <button
          type="button"
          onClick={onApply}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          Apply benchmark values →
        </button>
      )}

      {/* Error when it occurs alongside existing data */}
      {benchmarkError && hasData && (
        <div className="text-xs text-amber-700">{benchmarkError}</div>
      )}
    </div>
  );
}

function formatType(type) {
  const typeObj = OPTION_TYPES.find((t) => t.value === type);
  return typeObj ? typeObj.label : type;
}
