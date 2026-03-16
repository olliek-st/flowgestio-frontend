// src/components/bc01/s2_3/ScreeningGateTable.jsx
// Pass 2 — Read-only screening audit table.
//
// Breaking changes from Pass 1 (intentional):
//  - YesNoToggle removed entirely — no manual Oui/Non input
//  - Criteria rows are 100% computed from criterionResultsByOptionId (Pass-1 engine)
//    with a graceful legacy fallback when no Pass-1 evaluation has run yet
//  - Verdict pill supports VIABLE⚠️ when computedFlags contain warning/critical flags
//  - Override UI wired to applyOverride() (Pass-1 action) via OverridePanel
//  - Confirm button: uses confirmScreeningV2 when a snapshot is locked,
//    falls back to legacy confirmScreening otherwise; blocked by missing evidence
//    and stale overrides
//  - Elimination Log (Appendix C) rendered via EliminationLogTable
//
// Backward compat preserved:
//  - Props interface unchanged: { options, value, customCriteria, onChange }
//  - SectionCard wiring in SectionCard.jsx unchanged

import React, { useState, useEffect, useMemo } from "react";
import { useScreeningGate } from "../../../hooks/bc01/useScreeningGate";
import EliminationLogTable from "./EliminationLogTable";
import OverridePanel from "./OverridePanel";

// ── Constants ─────────────────────────────────────────────────────────────────

const VERDICT_STYLE = {
  BASELINE:      { label: "Baseline",      cls: "bg-slate-100 text-slate-700",   icon: "⚪" },
  VIABLE:        { label: "Viable",        cls: "bg-green-100 text-green-800",   icon: "🟢" },
  DISCOUNTED:    { label: "Discounted",    cls: "bg-red-100 text-red-800",       icon: "🔴" },
  INDETERMINATE: { label: "Indeterminate", cls: "bg-yellow-100 text-yellow-800", icon: "🟡" },
  VIABLE_WARN:   { label: "Viable ⚠️",    cls: "bg-yellow-100 text-yellow-800", icon: "⚠️" },
};

// EvaluationStatus → display config
const STATUS_DISPLAY = {
  pass:                 { icon: "✅", cls: "text-green-700",  label: "Pass" },
  fail:                 { icon: "❌", cls: "text-red-700",    label: "Fail" },
  insufficient_evidence:{ icon: "🟡", cls: "text-yellow-700", label: "Pending" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * VerdictPill — shows VIABLE⚠️ when flags contain warning or critical severity.
 * @param {string}   verdict        - "BASELINE" | "VIABLE" | "DISCOUNTED"
 * @param {Array}    computedFlags  - ScreeningFlag[] from Pass-1 engine
 * @param {boolean}  hasOverride    - Whether a non-stale override exists
 * @param {boolean}  isStaleOverride
 */
function VerdictPill({ verdict, computedFlags = [], hasOverride = false, isStaleOverride = false }) {
  const hasWarnFlag = computedFlags.some(
    (f) => f.severity === "warning" || f.severity === "critical"
  );
  const styleKey =
    verdict === "VIABLE" && hasWarnFlag ? "VIABLE_WARN" : verdict;
  const meta = styleKey ? VERDICT_STYLE[styleKey] : null;

  if (!meta) {
    return <span className="text-xs text-gray-400 italic">Pending…</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>
      {meta.icon} {meta.label}
      {hasOverride && !isStaleOverride && (
        <span className="ml-0.5 opacity-70" title="Override applied">★</span>
      )}
    </span>
  );
}

/**
 * CriterionRow — read-only display of a single criterion evaluation.
 *
 * Render priority:
 *  1. Pass-1 CriterionResult (criterionResult prop) — authoritative
 *  2. Legacy ScreeningCell (legacyCell prop) — fallback for pre-Pass-1 state
 *  3. "Not evaluated" placeholder
 */
function CriterionRow({ criterion, criterionResult, legacyCell }) {
  const isDealBreaker = criterion.dealBreaker === true;

  // ── Status determination ─────────────────────────────────────────────────
  let statusKey = null;
  let reason = null;
  let evidenceRefs = [];

  if (criterionResult) {
    // Pass-1 path (authoritative)
    statusKey = criterionResult.status;
    reason = criterionResult.reason;
    evidenceRefs = criterionResult.evidenceRefs ?? [];
  } else if (legacyCell) {
    // Legacy path fallback — map Yes/No to pass/fail
    statusKey = legacyCell.result === "Yes" ? "pass" : "fail";
    reason = legacyCell.justification || null;
  }

  const statusMeta = statusKey ? STATUS_DISPLAY[statusKey] : null;

  return (
    <div
      className={[
        "px-4 py-3",
        isDealBreaker ? "bg-amber-50/40 border-l-2 border-amber-400" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">

        {/* Left: label + reason + evidence refs */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isDealBreaker && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800"
                title="A fail on this criterion immediately discards the option"
              >
                Deal-breaker
              </span>
            )}
            <span className="text-sm font-medium text-gray-800">{criterion.label}</span>
            <span className="text-xs text-gray-400 font-mono">{criterion.id}</span>
          </div>

          {/* Reason — shown when present */}
          {reason && (
            <p className="mt-1 text-xs text-gray-500 italic">{reason}</p>
          )}

          {/* Evidence refs — shown when present */}
          {evidenceRefs.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {evidenceRefs.map((ref, i) => (
                <span
                  key={i}
                  className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-xs"
                >
                  {ref}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: status badge */}
        <div className="shrink-0">
          {statusMeta ? (
            <span
              className={`inline-flex items-center gap-1 text-sm font-semibold ${statusMeta.cls}`}
              aria-label={`Criterion ${criterion.id}: ${statusMeta.label}`}
            >
              {statusMeta.icon}
              <span className="text-xs font-medium">{statusMeta.label}</span>
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">Not evaluated</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FlagsDisplay — shows computed flags (from screeningEngine) below criteria.
 * Only rendered when flags exist with severity info/warning/critical.
 */
function FlagsDisplay({ flags = [] }) {
  if (!flags.length) return null;

  const severityStyle = {
    info:     "bg-blue-50 text-blue-700 border-blue-200",
    warning:  "bg-yellow-50 text-yellow-800 border-yellow-200",
    critical: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="px-4 py-2 border-t border-gray-100 space-y-1">
      {flags.map((flag, i) => (
        <div
          key={i}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium mr-1 ${severityStyle[flag.severity] ?? severityStyle.info}`}
        >
          {flag.severity === "critical" && "🚨"}
          {flag.severity === "warning" && "⚠️"}
          {flag.severity === "info" && "ℹ️"}
          {flag.label}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * ScreeningGateTable — Pass 2, read-only audit table.
 *
 * Props (unchanged from Pass 1 for SectionCard compat):
 * @param {Array}    options            - S2.2 alternatives
 * @param {Object}   value              - Persisted S2_3_SCREENING blob
 * @param {Array}    customCriteria     - Optional custom criteria
 * @param {Function} onChange           - Callback (contract) => void
 * @param {Object}   evidenceByOptionId - Optional: evidence keyed by optionId → criterionId → CriterionEvidence.
 *                                        When provided, reactive computation uses this source.
 *                                        Absence of evidence → INDETERMINATE (zero optimistic fallback).
 */
export default function ScreeningGateTable({ options, value, customCriteria, onChange, evidenceByOptionId, onDraftNarrative }) {
  const [narrative, setNarrative] = useState(value?.screeningNarrative ?? "");
  const [isDrafting, setIsDrafting] = useState(false);

  // Resync narrative when value hydrates late
  useEffect(() => {
    if (value?.screeningNarrative !== undefined) {
      setNarrative(value.screeningNarrative);
    }
  }, [value?.screeningNarrative]);

  const {
    // Legacy surface
    criteriaDefs,
    decisions,
    viableOptionIds,
    errors,
    confirmed,
    confirmScreening,
    unlock,

    // Pass-1 surface
    methodologySnapshot,
    criterionResultsByOptionId,
    computedFlagsByOptionId,
    eliminationLog,
    overrideRecordsByOptionId,
    hasStaleOverrides,
    hasMissingEvidence,
    applyOverride,
    confirmScreeningV2,
  } = useScreeningGate({ options, existing: value, customCriteria, onChange, evidenceByOptionId });

  const locked = confirmed;

  // ── Confirm gate logic ──────────────────────────────────────────────────────
  // Pass-1 path: use confirmScreeningV2 + Pass-1 blocking conditions
  // Legacy path: use confirmScreening + legacy errors array
  const usePass1Confirm = !!methodologySnapshot;

  async function handleDraftNarrative() {
    if (!onDraftNarrative) return;
    setIsDrafting(true);
    try {
      const text = await onDraftNarrative();
      if (typeof text === "string" && text.trim()) {
        setNarrative(text);
      }
    } catch (err) {
      console.error("[ScreeningGateTable] Draft narrative failed:", err);
    } finally {
      setIsDrafting(false);
    }
  }

  const confirmBlockReasons = useMemo(() => {
    const reasons = [];
    if (!narrative?.trim()) {
      reasons.push("Screening narrative is required before confirming.");
    }
    if (usePass1Confirm) {
      if (hasMissingEvidence) {
        reasons.push("Fill screening evidence in S2.2 to compute verdicts.");
      }
      if (hasStaleOverrides) {
        reasons.push("Stale override detected — re-apply all overrides after methodology change.");
      }
    } else {
      // Legacy path: show validation errors
      reasons.push(...errors);
    }
    return reasons;
  }, [narrative, usePass1Confirm, hasMissingEvidence, hasStaleOverrides, errors]);

  const isConfirmBlocked = confirmBlockReasons.length > 0;

  function handleConfirm() {
    if (isConfirmBlocked) return;
    if (usePass1Confirm) {
      confirmScreeningV2(narrative);
    } else {
      confirmScreening(narrative);
    }
  }

  // ── Derived actor (best-effort from snapshot or fallback) ──────────────────
  // Used as default actor string for applyOverride calls.
  const defaultActor = methodologySnapshot?.lockedBy ?? "analyst";

  // ── Option lookup map (O(n) once) ──────────────────────────────────────────
  const optionsById = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options]
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Info banner ──────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        <strong>Screening Gate — Section 2.3</strong>
        <ul className="mt-1 space-y-0.5 list-none text-xs">
          <li>
            <span className="font-semibold">Deal-breaker criteria</span> — a single fail immediately discards the option.
          </li>
          <li>
            <span className="font-semibold">Viability threshold</span> — all deal-breakers passed and sufficient criteria met.
          </li>
          <li>
            <span className="font-semibold">Baseline (Status Quo)</span> — immutable reference, not forwarded to Step 3.
          </li>
          <li className="text-indigo-600">
            Results are computed automatically — no manual Yes/No input.
          </li>
        </ul>
      </div>

      {/* ── Methodology snapshot indicator ───────────────────────────────────── */}
      {methodologySnapshot && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          <span>🔒</span>
          <span>
            Methodology locked — hash{" "}
            <abbr
              title={`Full hash: ${methodologySnapshot.hash}`}
              className="font-mono border-b border-dotted border-green-500 cursor-help"
            >
              {methodologySnapshot.hash.slice(0, 8)}…
            </abbr>
            {" "}by <strong>{methodologySnapshot.lockedBy}</strong>
          </span>
        </div>
      )}

      {/* ── Confirmed banner ──────────────────────────────────────────────────── */}
      {locked && (
        <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-4 py-3">
          <span className="text-sm font-medium text-green-800">
            ✅ Screening confirmed — {viableOptionIds.length} viable option(s) forwarded to Step 3.
          </span>
          <button
            type="button"
            onClick={unlock}
            className="text-xs text-green-700 underline hover:text-green-900 transition-colors"
          >
            Unlock to edit
          </button>
        </div>
      )}

      {/* ── Blocking reasons (non-error, informational) ───────────────────────── */}
      {!locked && confirmBlockReasons.length > 0 && (
        <ul className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
          {confirmBlockReasons.map((msg, i) => (
            <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Option cards ──────────────────────────────────────────────────────── */}
      {decisions.map((d) => {
        const opt = optionsById.get(d.optionId);
        // Fix A: always prefer opt.name (set by AlternativesManager); fall back
        // only to legacy fields. Never use shortDescription as the title — that
        // field mirrors the long description textarea, not the option name.
        const optLabel = opt?.name || opt?.label || opt?.shortDescription || d.optionId;

        // Fix C (display side): widen the baseline detection to include the
        // lowercase/underscore variant stored by AlternativesManager ("status_quo")
        // and the canonical id, so the criteria rows are hidden for Status Quo
        // even before the engine verdict arrives.
        const isBaseline =
          opt?.type === "StatusQuo" ||
          opt?.type === "status_quo" ||
          opt?.id   === "status_quo" ||
          opt?.isStatusQuo === true ||
          d.computedVerdict === "BASELINE" ||
          d.finalVerdict === "BASELINE";

        // Pass-1 data
        const criterionResults = criterionResultsByOptionId[d.optionId] ?? [];
        const computedFlags    = computedFlagsByOptionId[d.optionId] ?? [];
        const overrideRecord   = overrideRecordsByOptionId[d.optionId];
        const hasOverride      = !!overrideRecord && !overrideRecord.stale;
        const isStaleOverride  = overrideRecord?.stale === true;

        // Verdict to display: use Pass-1 overrideRecord when available, else legacy finalVerdict
        const displayVerdict = overrideRecord?.finalVerdict ?? d.finalVerdict;

        // Index criterionResults for O(1) lookup
        const resultByCriterionId = new Map(
          criterionResults.map((r) => [r.criterionId, r])
        );

        return (
          <div
            key={d.optionId}
            className="rounded-lg border border-gray-200 overflow-hidden shadow-sm"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-gray-800 truncate">{optLabel}</span>
                {isBaseline && (
                  <span className="text-xs text-blue-600 font-medium shrink-0">(Status Quo)</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <VerdictPill
                  verdict={displayVerdict}
                  computedFlags={computedFlags}
                  hasOverride={hasOverride}
                  isStaleOverride={isStaleOverride}
                />
                {isStaleOverride && (
                  <span
                    className="text-xs text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded"
                    title="Override is stale — re-apply required"
                  >
                    STALE
                  </span>
                )}
              </div>
            </div>

            {/* Criteria rows — hidden for baseline */}
            {!isBaseline && (
              <div className="divide-y divide-gray-100">
                {criteriaDefs.map((c) => (
                  <CriterionRow
                    key={c.id}
                    criterion={c}
                    criterionResult={resultByCriterionId.get(c.id) ?? null}
                    legacyCell={d.criteriaById?.[c.id] ?? null}
                  />
                ))}
              </div>
            )}

            {/* INDETERMINATE: contextual guidance — evidence required */}
            {!isBaseline && displayVerdict === "INDETERMINATE" && (
              <div className="px-4 py-2.5 flex items-center gap-2 bg-yellow-50 border-t border-yellow-200">
                <span className="text-yellow-500 shrink-0">🟡</span>
                <span className="text-xs text-yellow-800">
                  Fill screening evidence in S2.2 to compute verdicts.
                </span>
              </div>
            )}

            {/* Computed flags (warnings / critical) */}
            {!isBaseline && <FlagsDisplay flags={computedFlags} />}

            {/* Override panel — non-baseline only */}
            {!isBaseline && (
              <OverridePanel
                optionId={d.optionId}
                computedVerdict={d.computedVerdict}
                overrideRecord={overrideRecord}
                isLocked={locked}
                onApplyOverride={applyOverride}
                actor={defaultActor}
              />
            )}
          </div>
        );
      })}

      {/* ── Screening narrative ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Screening narrative{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          {onDraftNarrative && !locked && (
            <button
              type="button"
              disabled={isDrafting}
              onClick={handleDraftNarrative}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDrafting ? "✨ Drafting…" : "✨ Draft with AI"}
            </button>
          )}
        </div>
        <textarea
          rows={4}
          disabled={locked}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Summarize the overall rationale for the screening results…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      {/* ── Confirm Screening button ───────────────────────────────────────────── */}
      {!locked && (
        <div className="flex items-center justify-between gap-4">
          {viableOptionIds.length > 0 && (
            <p className="text-sm text-gray-500">
              {viableOptionIds.length} viable option(s) identified.
            </p>
          )}
          <button
            type="button"
            disabled={isConfirmBlocked}
            onClick={handleConfirm}
            title={
              isConfirmBlocked
                ? confirmBlockReasons[0] ?? "Fix blocking issues above"
                : "Confirm and forward viable options to Step 3"
            }
            className="ml-auto px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm screening
          </button>
        </div>
      )}

      {/* ── Elimination Log (Appendix C) ───────────────────────────────────────── */}
      {eliminationLog.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Elimination Log{" "}
              <span className="text-xs font-normal text-gray-400 ml-1">
                Level 5 Appendix C
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Append-only audit trail of deal-breaker eliminations. Entries are preserved even after
              methodology changes (SUPERSEDED).
            </p>
          </div>
          <EliminationLogTable entries={eliminationLog} />
        </div>
      )}
    </div>
  );
}
