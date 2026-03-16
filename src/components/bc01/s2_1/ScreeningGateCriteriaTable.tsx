// src/components/bc01/s2_1/ScreeningGateCriteriaTable.tsx
//
// Level 5 — Production-ready screening gate criteria table editor.
//
// Responsibilities:
//   - Parse `screeningGateCriteriaJson` into ScreeningCriterion[]
//   - Fall back to DEFAULT_GATE_CRITERIA when JSON is absent or invalid
//   - Allow add / edit / reorder / delete (unless locked)
//   - Emit updated JSON via `onChangeJson`
//   - Expose readonly JSON audit accordion
//   - Lock: all controls disabled when `methodologyLocked === true`
//
// Level 5 invariants:
//   - IDs generated ONCE at creation — never recalculated on label change
//   - No merge with any hardcoded list
//   - evaluationType "count" stored as "keyword" for engine compatibility

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { ScreeningCriterion } from "../../../engine/bc01/s2_3/screeningTypes";
import { DEFAULT_GATE_CRITERIA } from "../../../engine/bc01/shared/defaultGateCriteria";

// ─── ID generation ───────────────────────────────────────────────────────────
function generateCriterionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `crit_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `crit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── JSON helpers ────────────────────────────────────────────────────────────
function safeParseJson(raw: string): ScreeningCriterion[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ScreeningCriterion[];
    return null;
  } catch {
    return null;
  }
}

function initCriteriaFromJson(value: string): ScreeningCriterion[] {
  const trimmed = (value ?? "").trim();
  if (trimmed) {
    const parsed = safeParseJson(trimmed);
    if (parsed) {
      return parsed.map((c) => ({ ...c, id: c.id || generateCriterionId() }));
    }
  }
  return DEFAULT_GATE_CRITERIA;
}

/**
 * Normalize a single criterion before JSON persistence.
 *
 * Issue 3: Forces `dealBreaker` to an explicit boolean — never undefined in persisted JSON.
 * Issue 4: Bridges `operator/value` → `min/max` so screeningEngine.ts reads correct values.
 *   - operator "lte" + value N  →  max = N   (engine reads thresholdConfig.max)
 *   - operator "gte" + value N  →  min = N   (engine reads thresholdConfig.min)
 *   operator, value, unit are preserved (full backward compat).
 *   screeningEngine.ts is NOT touched.
 */
function normalizeCriterion(c: ScreeningCriterion): ScreeningCriterion {
  const normalized: ScreeningCriterion = {
    ...c,
    // Issue 3: explicit boolean — never undefined in persisted JSON
    dealBreaker: !!c.dealBreaker,
  };

  // Issue 4: bridge operator/value → min/max for engine reads
  const et = c.evaluationType;
  const cfg = c.thresholdConfig;
  if (
    (et === "threshold" || et === "keyword" || et === "count") &&
    cfg?.value != null
  ) {
    const bridged = { ...cfg };
    if (cfg.operator === "lte") {
      bridged.max = cfg.value;
    } else if (cfg.operator === "gte") {
      bridged.min = cfg.value;
    }
    normalized.thresholdConfig = bridged;
  }

  return normalized;
}

function serializeCriteria(criteria: ScreeningCriterion[]): string {
  return JSON.stringify(criteria.map(normalizeCriterion), null, 2);
}

// ─── ThresholdConfigEditor (operator / value / unit) ─────────────────────────
type ThresholdCfg = ScreeningCriterion["thresholdConfig"];

interface ThresholdConfigEditorProps {
  config: ThresholdCfg;
  disabled: boolean;
  onChange: (next: ThresholdCfg) => void;
}

function ThresholdConfigEditor({ config, disabled, onChange }: ThresholdConfigEditorProps) {
  const base: NonNullable<ThresholdCfg> = config ?? {};
  return (
    <div className="flex flex-wrap items-center gap-2 mt-0.5">
      {/* Operator */}
      <select
        disabled={disabled}
        value={base.operator ?? "lte"}
        onChange={(e) =>
          onChange({ ...base, operator: e.target.value as "lte" | "gte" })
        }
        aria-label="Threshold operator"
        className="rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <option value="lte">≤ (at most)</option>
        <option value="gte">≥ (at least)</option>
      </select>

      {/* Value */}
      <input
        type="number"
        disabled={disabled}
        value={base.value ?? ""}
        placeholder="Value"
        onChange={(e) =>
          onChange({
            ...base,
            value: e.target.value === "" ? undefined : Number(e.target.value),
          })
        }
        className="w-24 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      />

      {/* Unit */}
      <input
        type="text"
        disabled={disabled}
        value={base.unit ?? ""}
        placeholder="Unit (%, $M…)"
        onChange={(e) => onChange({ ...base, unit: e.target.value || undefined })}
        className="w-24 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconUp = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);
const IconDown = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const IconTrash = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconPlus = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const IconLock = () => (
  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ScreeningGateCriteriaTableProps {
  value: string;
  methodologyLocked: boolean;
  lockedAt?: string;
  onChangeJson: (nextJson: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScreeningGateCriteriaTable({
  value,
  methodologyLocked,
  lockedAt,
  onChangeJson,
}: ScreeningGateCriteriaTableProps) {
  const [criteria, setCriteria] = useState<ScreeningCriterion[]>(() =>
    initCriteriaFromJson(value)
  );
  const [auditOpen, setAuditOpen] = useState(false);
  const prevValueRef = useRef<string>(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setCriteria(initCriteriaFromJson(value));
    }
  }, [value]);

  const commitCriteria = useCallback(
    (next: ScreeningCriterion[]) => {
      setCriteria(next);
      onChangeJson(serializeCriteria(next));
    },
    [onChangeJson]
  );

  const updateCriterion = useCallback(
    (idx: number, patch: Partial<ScreeningCriterion>) => {
      commitCriteria(criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    },
    [criteria, commitCriteria]
  );

  const moveUp = useCallback(
    (idx: number) => {
      if (idx === 0) return;
      const next = [...criteria];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      commitCriteria(next);
    },
    [criteria, commitCriteria]
  );

  const moveDown = useCallback(
    (idx: number) => {
      if (idx >= criteria.length - 1) return;
      const next = [...criteria];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      commitCriteria(next);
    },
    [criteria, commitCriteria]
  );

  const deleteCriterion = useCallback(
    (idx: number) => {
      commitCriteria(criteria.filter((_, i) => i !== idx));
    },
    [criteria, commitCriteria]
  );

  const addCriterion = useCallback(() => {
    commitCriteria([
      ...criteria,
      {
        id: generateCriterionId(),
        label: "",
        dealBreaker: false,
        evaluationType: "binary",
      },
    ]);
  }, [criteria, commitCriteria]);

  const formattedLockedAt = lockedAt
    ? (() => {
        try {
          return new Date(lockedAt).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          return null;
        }
      })()
    : null;

  const dealBreakerCount = criteria.filter((c) => c.dealBreaker).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-700">Screening Gate Criteria</span>
          <span className="text-xs text-slate-400">
            Source of truth for S2.2 evidence &amp; S2.3 gate — <code className="font-mono">screeningGateCriteriaJson</code>
          </span>
        </div>
        {methodologyLocked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 border border-amber-200">
            <IconLock />
            Locked{formattedLockedAt ? ` on ${formattedLockedAt}` : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 border border-blue-200">
            Editable
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-8 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</th>
              <th className="w-28 px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Deal-breaker</th>
              <th className="w-40 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Eval Type</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Threshold</th>
              <th className="w-24 px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {criteria.map((c, idx) => (
              <tr
                key={c.id}
                className={idx % 2 === 0 ? "bg-white hover:bg-slate-50/60 transition-colors" : "bg-slate-50/40 hover:bg-slate-50/80 transition-colors"}
              >
                <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums select-none">{idx + 1}</td>

                <td className="px-3 py-2.5">
                  <input
                    type="text"
                    disabled={methodologyLocked}
                    value={c.label}
                    onChange={(e) => updateCriterion(idx, { label: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    placeholder="Criterion name…"
                  />
                </td>

                <td className="px-3 py-2.5 text-center">
                  <button
                    type="button"
                    disabled={methodologyLocked}
                    onClick={() => updateCriterion(idx, { dealBreaker: !c.dealBreaker })}
                    aria-pressed={c.dealBreaker}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      c.dealBreaker
                        ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {c.dealBreaker ? (
                      <>
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Yes
                      </>
                    ) : "No"}
                  </button>
                </td>

                <td className="px-3 py-2.5">
                  <select
                    disabled={methodologyLocked}
                    value={c.evaluationType ?? "binary"}
                    onChange={(e) => {
                      const next = e.target.value as ScreeningCriterion["evaluationType"];
                      updateCriterion(idx, {
                        evaluationType: next,
                        thresholdConfig: next === "binary" ? undefined : c.thresholdConfig,
                      });
                    }}
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="binary">Binary (Yes / No)</option>
                    <option value="threshold">Threshold</option>
                    <option value="keyword">Count / Keyword</option>
                  </select>
                </td>

                <td className="px-3 py-2.5">
                  {c.evaluationType === "binary" ? (
                    <span className="text-xs text-slate-300">—</span>
                  ) : c.evaluationType === "keyword" ? (
                    // Issue 2: keyword is a legacy type — render read-only badge,
                    // never render ThresholdConfigEditor, never mutate thresholdConfig.
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200">
                      Keyword (legacy)
                    </span>
                  ) : (
                    <ThresholdConfigEditor
                      config={c.thresholdConfig}
                      disabled={methodologyLocked}
                      onChange={(next) => updateCriterion(idx, { thresholdConfig: next })}
                    />
                  )}
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      type="button"
                      disabled={methodologyLocked || idx === 0}
                      onClick={() => moveUp(idx)}
                      title="Move up"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      <IconUp />
                    </button>
                    <button
                      type="button"
                      disabled={methodologyLocked || idx >= criteria.length - 1}
                      onClick={() => moveDown(idx)}
                      title="Move down"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      <IconDown />
                    </button>
                    <button
                      type="button"
                      disabled={methodologyLocked}
                      onClick={() => deleteCriterion(idx)}
                      title="Delete"
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {criteria.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No criteria. Add one or reset to TBS defaults.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2">
        {!methodologyLocked && (
          <>
            <button
              type="button"
              onClick={addCriterion}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50 transition-colors"
            >
              <IconPlus />
              Add criterion
            </button>
            <button
              type="button"
              onClick={() => commitCriteria(DEFAULT_GATE_CRITERIA)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              Reset to TBS defaults
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-slate-400 tabular-nums">
          {criteria.length} {criteria.length === 1 ? "criterion" : "criteria"} · {dealBreakerCount} deal-breaker{dealBreakerCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Audit accordion */}
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setAuditOpen((v) => !v)}
          aria-expanded={auditOpen}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View JSON (audit)
          </span>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${auditOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {auditOpen && (
          <div className="border-t border-slate-200 bg-slate-50 p-3">
            <p className="mb-1.5 text-xs text-slate-400">
              Read-only — exact value of <code className="font-mono text-slate-500">screeningGateCriteriaJson</code>
            </p>
            <textarea
              readOnly
              rows={Math.min(Math.max(criteria.length * 9 + 4, 8), 28)}
              value={serializeCriteria(criteria)}
              className="w-full rounded border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-600 focus:outline-none resize-y"
              aria-label="screeningGateCriteriaJson — read-only audit"
            />
          </div>
        )}
      </div>
    </div>
  );
}
