// src/components/bc01/s2_1/S2_1Section.tsx
//
// Level 5 — S2.1 Evaluation Criteria & Methodology — full redesign.
//
// 7 collapsible sub-sections:
//   2.1.1  Financial & Economic Parameters
//   2.1.2  Evaluation Profile & Weights
//   2.1.3  Screening Gate Criteria          → ScreeningGateCriteriaTable
//   2.1.4  Strategic Criteria for Scoring   → ScoringCriteriaTable
//   2.1.5  Feasibility Criteria for Scoring → ScoringCriteriaTable
//   2.1.6  Methodology Narrative
//   2.1.7  Methodology Lock
//
// Level 5 invariants:
//   - All schema field KEYS unchanged (discountRate, weight_financial, etc.)
//   - No modification of S3 engine or S2.3 engine
//   - Single source of truth for gate criteria: screeningGateCriteriaJson
//   - Scoring criteria in/out as fraction; displayed as %
//   - methodologyLocked gates all sub-section inputs

import React, { useState, useCallback, useMemo } from "react";
import ScreeningGateCriteriaTable from "./ScreeningGateCriteriaTable";
import ScoringCriteriaTable from "./ScoringCriteriaTable";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface S2_1SectionProps {
  /** Full S2_1_EVAL_CRITERIA data object */
  data: Record<string, unknown>;
  /** Called with the merged-update whenever any field changes */
  onChange: (updated: Record<string, unknown>) => void;
  /** Forwarded to "Draft with AI" button in 2.1.6 */
  onAIDraft?: (payload: unknown) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_OPTIONS = ["CAD", "USD", "EUR", "GBP"];
const PROFILE_OPTIONS = [
  { value: "balanced",       label: "Balanced (TBS Default)" },
  { value: "transformation", label: "Transformation" },
  { value: "efficiency",     label: "Efficiency / Cost Reduction" },
  { value: "compliance",     label: "Mandatory / Compliance" },
];
const WEIGHT_TOLERANCE = 0.01;

// ─── Sub-section wrapper ──────────────────────────────────────────────────────

interface SubSectionProps {
  num: string;
  title: string;
  isComplete: boolean;
  isLocked?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function SubSection({ num, title, isComplete, defaultOpen = false, children }: SubSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-inset focus:ring-1 focus:ring-blue-300"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-slate-500 bg-slate-100">
            {num}
          </span>
          <span className="font-semibold text-sm text-slate-800 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Completion badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isComplete
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}
          >
            {isComplete ? "✓ Complete" : "Incomplete"}
          </span>
          {/* Chevron */}
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {/* Content */}
      {open && (
        <div className="border-t border-slate-100 px-5 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Completion tracker ───────────────────────────────────────────────────────

interface CompletionTrackerProps {
  completed: boolean[];
}

function CompletionTracker({ completed }: CompletionTrackerProps) {
  const total = completed.length;
  const done = completed.filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold text-slate-600">
          Section 2.1 Progress
        </span>
        <span className="text-xs font-bold text-slate-700 tabular-nums">
          {done}/{total} complete
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Numbered dots */}
      <div className="flex items-center gap-1.5 mt-2.5">
        {completed.map((done, i) => (
          <div
            key={i}
            title={`2.1.${i + 1}`}
            className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors ${
              done
                ? "bg-emerald-500 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── S2.2 Warning (shown at the top when criteria are not locked) ─────────────

interface UnlockedWarningProps {
  methodologyLocked: boolean;
  hasCriteria: boolean;
}

function UnlockedWarning({ methodologyLocked, hasCriteria }: UnlockedWarningProps) {
  if (methodologyLocked || !hasCriteria) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
      <span className="text-sm text-amber-800">
        Screening criteria not locked — captured evidence in S2.2 may require revalidation once methodology is locked.
      </span>
    </div>
  );
}

// ─── Helper: get string field value ──────────────────────────────────────────
function str(data: Record<string, unknown>, key: string, def = ""): string {
  const v = data[key];
  return typeof v === "string" ? v : v == null ? def : String(v);
}

function bool(data: Record<string, unknown>, key: string): boolean {
  return !!data[key];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function S2_1Section({ data, onChange, onAIDraft }: S2_1SectionProps) {
  // ── Derived locked state ────────────────────────────────────────────────────
  const locked = bool(data, "methodologyLocked");

  // ── Patch helper — immutably merge one or more fields ──────────────────────
  const patch = useCallback(
    (fields: Record<string, unknown>) => {
      onChange({ ...data, ...fields });
    },
    [data, onChange]
  );

  // ── 2.1.1 Completion ───────────────────────────────────────────────────────
  const discountRate = str(data, "discountRate");
  const timeHorizonYears = str(data, "timeHorizonYears");
  const complete_211 =
    discountRate.trim() !== "" && timeHorizonYears.trim() !== "";

  // ── 2.1.2 Weights validation ───────────────────────────────────────────────
  const wFinancial = parseFloat(str(data, "weight_financial")) || 0;
  const wStrategic = parseFloat(str(data, "weight_strategic")) || 0;
  const wFeasibility = parseFloat(str(data, "weight_feasibility")) || 0;
  const weightSum = wFinancial + wStrategic + wFeasibility;
  const weightsValid = Math.abs(weightSum - 1) <= WEIGHT_TOLERANCE;
  const complete_212 = str(data, "profileType").trim() !== "" && weightsValid;

  // ── 2.1.3 Gate criteria ────────────────────────────────────────────────────
  const gateJson = str(data, "screeningGateCriteriaJson");
  const complete_213 = gateJson.trim() !== "";

  // ── 2.1.4 Strategic criteria ───────────────────────────────────────────────
  const strategicJson = str(data, "strategicCriteriaJson");
  const complete_214 = useMemo(() => {
    if (!strategicJson.trim()) return false;
    try {
      const arr = JSON.parse(strategicJson);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  }, [strategicJson]);

  // ── 2.1.5 Feasibility criteria ─────────────────────────────────────────────
  const feasibilityJson = str(data, "feasibilityCriteriaJson");
  const complete_215 = useMemo(() => {
    if (!feasibilityJson.trim()) return false;
    try {
      const arr = JSON.parse(feasibilityJson);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  }, [feasibilityJson]);

  // ── 2.1.6 Narrative ───────────────────────────────────────────────────────
  const narrative = str(data, "methodologyNarrative");
  const complete_216 = narrative.trim().length > 20;

  // ── 2.1.7 Lock ────────────────────────────────────────────────────────────
  const complete_217 = locked;

  const completionFlags = [
    complete_211, complete_212, complete_213,
    complete_214, complete_215, complete_216, complete_217,
  ];

  // ── Lock date for display ──────────────────────────────────────────────────
  const lockedAt = str(data, "methodologyLockedAt") || str(data, "criteriaLockedAt");
  const formattedLockDate = lockedAt
    ? (() => {
        try {
          return new Date(lockedAt).toLocaleDateString("en-CA", {
            year: "numeric", month: "short", day: "numeric",
          });
        } catch { return null; }
      })()
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Completion tracker */}
      <CompletionTracker completed={completionFlags} />

      {/* S2.2 unlocked warning */}
      <UnlockedWarning methodologyLocked={locked} hasCriteria={gateJson.trim() !== "" || true} />

      {/* ── 2.1.1 Financial & Economic Parameters ──────────────────────────── */}
      <SubSection num="1" title="Financial & Economic Parameters" isComplete={complete_211} defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Discount Rate */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Discount Rate
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                disabled={locked}
                value={discountRate}
                onChange={(e) => patch({ discountRate: e.target.value })}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder="e.g. 0.05"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Used for NPV calculations</p>
          </div>

          {/* Time Horizon */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Time Horizon (years)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={locked}
              value={timeHorizonYears}
              onChange={(e) => patch({ timeHorizonYears: e.target.value })}
              className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              placeholder="e.g. 5"
            />
            <p className="mt-1 text-xs text-slate-400">Years for financial analysis</p>
          </div>

          {/* Inflation Rate */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Inflation Rate <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.]?[0-9]*"
              disabled={locked}
              value={str(data, "inflationRate")}
              onChange={(e) => patch({ inflationRate: e.target.value })}
              className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              placeholder="Leave blank"
            />
            <p className="mt-1 text-xs text-slate-400">Blank = constant dollars</p>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Currency
            </label>
            <select
              disabled={locked}
              value={str(data, "currencyUnit", "CAD")}
              onChange={(e) => patch({ currencyUnit: e.target.value })}
              className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </SubSection>

      {/* ── 2.1.2 Evaluation Profile & Weights ─────────────────────────────── */}
      <SubSection num="2" title="Evaluation Profile & Weights" isComplete={complete_212} defaultOpen={false}>
        <div className="space-y-5">
          {/* Profile */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Evaluation Profile
            </label>
            <select
              disabled={locked}
              value={str(data, "profileType", "balanced")}
              onChange={(e) => patch({ profileType: e.target.value })}
              className="w-full max-w-xs rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {PROFILE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Weights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Section Weights
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  weightsValid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                }`}
              >
                {weightsValid ? "✓" : "⚠"} Total:{" "}
                {(weightSum * 100).toFixed(1)}%{" "}
                {weightsValid ? "" : "(should be 100%)"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: "weight_financial",   label: "Financial",   value: wFinancial },
                { key: "weight_strategic",   label: "Strategic",   value: wStrategic },
                { key: "weight_feasibility", label: "Feasibility", value: wFeasibility },
              ].map((w) => (
                <div key={w.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {w.label}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      disabled={locked}
                      value={str(data, w.key)}
                      onChange={(e) => patch({ [w.key]: e.target.value })}
                      className="w-24 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-slate-400 tabular-nums">
                      = {(w.value * 100).toFixed(0)}%
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 transition-all"
                      style={{ width: `${Math.min(w.value * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SubSection>

      {/* ── 2.1.3 Screening Gate Criteria ──────────────────────────────────── */}
      <SubSection num="3" title="Screening Gate Criteria" isComplete={complete_213} defaultOpen={false}>
        <ScreeningGateCriteriaTable
          value={gateJson}
          methodologyLocked={locked}
          lockedAt={lockedAt || undefined}
          onChangeJson={(nextJson) => patch({ screeningGateCriteriaJson: nextJson })}
        />
      </SubSection>

      {/* ── 2.1.4 Strategic Criteria for Scoring ───────────────────────────── */}
      <SubSection num="4" title="Strategic Criteria for Scoring" isComplete={complete_214} defaultOpen={false}>
        <p className="mb-3 text-xs text-slate-500">
          Weights saisis en % (ex: 40) · stockés en fraction (0.40) · somme = 100%.
          Ces critères alimentent la matrice de notation S3.
        </p>
        <ScoringCriteriaTable
          value={strategicJson}
          methodologyLocked={locked}
          criteriaLabel="Strategic Scoring Criteria"
          onChangeJson={(nextJson) => patch({ strategicCriteriaJson: nextJson })}
        />
      </SubSection>

      {/* ── 2.1.5 Feasibility Criteria for Scoring ─────────────────────────── */}
      <SubSection num="5" title="Feasibility Criteria for Scoring" isComplete={complete_215} defaultOpen={false}>
        <p className="mb-3 text-xs text-slate-500">
          Même convention que 2.1.4 · somme des poids = 100%.
          Ces critères alimentent la dimension faisabilité en S3.
        </p>
        <ScoringCriteriaTable
          value={feasibilityJson}
          methodologyLocked={locked}
          criteriaLabel="Feasibility Scoring Criteria"
          onChangeJson={(nextJson) => patch({ feasibilityCriteriaJson: nextJson })}
        />
      </SubSection>

      {/* ── 2.1.6 Methodology Narrative ────────────────────────────────────── */}
      <SubSection num="6" title="Methodology Narrative" isComplete={complete_216} defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Narrative describing the evaluation approach. Can be drafted by AI and edited by the user.
            </p>
            {onAIDraft && (
              <button
                type="button"
                onClick={() =>
                  onAIDraft({
                    fieldKey: "methodologyNarrative",
                    field: {
                      key: "methodologyNarrative",
                      type: "textarea",
                      label: "Methodology narrative (AI may draft)",
                      helpText: "AI-generated text is editable by the user.",
                    },
                  })
                }
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Draft with AI
              </button>
            )}
          </div>
          <textarea
            rows={6}
            disabled={locked}
            value={narrative}
            onChange={(e) => patch({ methodologyNarrative: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed resize-y"
            placeholder="Describe the evaluation methodology, rationale for weights, and criteria selection…"
          />
          <p className="text-xs text-slate-400">
            {narrative.length} characters · AI-generated text is editable by the user.
          </p>
        </div>
      </SubSection>

      {/* ── 2.1.7 Methodology Lock ──────────────────────────────────────────── */}
      <SubSection num="7" title="Methodology Lock" isComplete={complete_217} defaultOpen={false}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            When locked, all parameters (weights, criteria, profile) become read-only.
            The SHA-256 hash is computed and stored for audit trail.
          </p>

          {/* Lock toggle */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {locked ? "Methodology locked" : "Methodology unlocked"}
              </div>
              {locked && formattedLockDate && (
                <div className="mt-0.5 text-xs text-slate-500">
                  Locked on {formattedLockDate}
                </div>
              )}
              {!locked && (
                <div className="mt-0.5 text-xs text-slate-500">
                  Lock to freeze all parameters and generate audit hash
                </div>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={locked}
              onClick={() => patch({ methodologyLocked: !locked })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
                locked ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  locked ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Lock status badge */}
          {locked && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <svg className="h-4 w-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  Methodology locked{formattedLockDate ? ` on ${formattedLockDate}` : ""}
                </div>
                <div className="text-xs text-amber-700 mt-0.5">
                  All criteria, weights, and parameters are read-only. Reset A will trigger if you unlock and change inputs.
                </div>
              </div>
            </div>
          )}

          {/* Hash display (audit) */}
          {str(data, "methodologyInputsHash").trim() && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Inputs Hash (SHA-256, audit-only)
              </label>
              <code className="block rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500 break-all select-all">
                {str(data, "methodologyInputsHash")}
              </code>
            </div>
          )}
        </div>
      </SubSection>
    </div>
  );
}
