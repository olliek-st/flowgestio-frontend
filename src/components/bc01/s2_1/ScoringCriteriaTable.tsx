// src/components/bc01/s2_1/ScoringCriteriaTable.tsx
//
// Level 5 — Production-ready scoring criteria table editor.
// Used for S2.1.4 (Strategic) and S2.1.5 (Feasibility) criteria.
//
// Data contract:
//   - Reads/writes `strategicCriteriaJson` or `feasibilityCriteriaJson`
//   - Stored weight = fraction (0..1). Displayed weight = % (0..100).
//   - `label` is the canonical display field; `name` preserved for S3 engine compat.
//   - ID generated once at creation; never recalculated.
//   - Validation: sum of fractions must be 1.00 ±0.001
//
// Level 5 invariants:
//   - No merge with any hardcoded list
//   - Extra fields on existing criteria are preserved (not stripped)
//   - No S3 engine modification

import React, { useState, useCallback, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** The minimal contract written back to JSON */
export interface ScoringCriterion {
  id: string;
  label: string;
  weight: number; // fraction 0..1
  // Extra fields from existing S3 defaults are spread-preserved
  [key: string]: unknown;
}

/** Internal display row (weight in %, for editing) */
interface CriterionRow {
  id: string;
  label: string;
  weightPct: string; // string so the input is always controlled cleanly
  _extra: Record<string, unknown>; // all other fields from original JSON
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `sc_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  }
  return `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeParseJson(raw: string): ScoringCriterion[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ScoringCriterion[];
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert raw JSON (which may use `name` or `label`) into display rows.
 * `name` → `label` mapping preserves S3 engine compat.
 */
function jsonToRows(value: string): CriterionRow[] {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return [];
  const parsed = safeParseJson(trimmed);
  if (!parsed) return [];
  return parsed.map((c) => {
    const { id, label, name, weight, ...rest } = c as Record<string, unknown>;
    const displayLabel = (label as string) || (name as string) || "";
    const weightFraction = typeof weight === "number" ? weight : 0;
    return {
      id: (id as string) || generateId(),
      label: displayLabel,
      weightPct: (weightFraction * 100).toFixed(1),
      _extra: rest,
    };
  });
}

/**
 * Serialize display rows back to JSON.
 * Writes both `label` and `name` for S3 engine backward compat.
 */
function rowsToJson(rows: CriterionRow[]): string {
  const criteria: ScoringCriterion[] = rows.map((r) => ({
    ...r._extra,
    id: r.id,
    label: r.label,
    name: r.label, // preserve for S3 engine backward compat
    weight: Math.round((parseFloat(r.weightPct) || 0) / 100 * 10000) / 10000,
  }));
  return JSON.stringify(criteria, null, 2);
}

/** Sum of weight fractions from display rows */
function computeWeightSum(rows: CriterionRow[]): number {
  return rows.reduce((sum, r) => sum + (parseFloat(r.weightPct) || 0) / 100, 0);
}

const WEIGHT_TOLERANCE = 0.001;

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

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ScoringCriteriaTableProps {
  /** JSON string — strategicCriteriaJson or feasibilityCriteriaJson */
  value: string;
  methodologyLocked: boolean;
  /** Displayed above the table for context */
  criteriaLabel?: string;
  onChangeJson: (nextJson: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScoringCriteriaTable({
  value,
  methodologyLocked,
  criteriaLabel,
  onChangeJson,
}: ScoringCriteriaTableProps) {
  const [rows, setRows] = useState<CriterionRow[]>(() => jsonToRows(value));
  const [auditOpen, setAuditOpen] = useState(false);
  const prevValueRef = useRef<string>(value);

  // Sync external value changes (form reset, AI prefill)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setRows(jsonToRows(value));
    }
  }, [value]);

  const commitRows = useCallback(
    (next: CriterionRow[]) => {
      setRows(next);
      onChangeJson(rowsToJson(next));
    },
    [onChangeJson]
  );

  const updateRow = useCallback(
    (idx: number, patch: Partial<CriterionRow>) => {
      commitRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    },
    [rows, commitRows]
  );

  const moveUp = useCallback(
    (idx: number) => {
      if (idx === 0) return;
      const next = [...rows];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      commitRows(next);
    },
    [rows, commitRows]
  );

  const moveDown = useCallback(
    (idx: number) => {
      if (idx >= rows.length - 1) return;
      const next = [...rows];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      commitRows(next);
    },
    [rows, commitRows]
  );

  const deleteRow = useCallback(
    (idx: number) => {
      commitRows(rows.filter((_, i) => i !== idx));
    },
    [rows, commitRows]
  );

  const addRow = useCallback(() => {
    commitRows([
      ...rows,
      { id: generateId(), label: "", weightPct: "0", _extra: {} },
    ]);
  }, [rows, commitRows]);

  const weightSum = computeWeightSum(rows);
  const weightsValid = Math.abs(weightSum - 1) <= WEIGHT_TOLERANCE;
  const weightSumPct = (weightSum * 100).toFixed(1);

  // Distribution bar — proportional widths per criterion
  const totalPct = rows.reduce((s, r) => s + (parseFloat(r.weightPct) || 0), 0);

  // Accessible bar colours cycling
  const BAR_COLORS = [
    "bg-indigo-400",
    "bg-blue-400",
    "bg-cyan-400",
    "bg-teal-400",
    "bg-emerald-400",
    "bg-violet-400",
    "bg-sky-400",
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {criteriaLabel && (
            <span className="text-sm font-semibold text-slate-700">{criteriaLabel}</span>
          )}
          <span className="text-xs text-slate-400">
            Weight stored as fraction (0–1) · Displayed as % (0–100)
          </span>
        </div>
        {/* Weight validation badge */}
        {rows.length > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              weightsValid
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-800 border-amber-200"
            }`}
          >
            {weightsValid ? "✓" : "⚠"} Total: {weightSumPct}%{" "}
            {weightsValid ? "" : "(should be 100%)"}
          </span>
        )}
      </div>

      {/* Distribution bar */}
      {rows.length > 0 && totalPct > 0 && (
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
          {rows.map((r, idx) => {
            const pct = parseFloat(r.weightPct) || 0;
            const width = totalPct > 0 ? (pct / totalPct) * 100 : 0;
            return (
              <div
                key={r.id}
                className={`${BAR_COLORS[idx % BAR_COLORS.length]} transition-all`}
                style={{ width: `${width}%` }}
                title={`${r.label || "—"}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-8 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Criterion Label</th>
              <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Weight %</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Distribution</th>
              <th className="w-24 px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, idx) => {
              const pct = parseFloat(r.weightPct) || 0;
              const barWidth = totalPct > 0 ? (pct / totalPct) * 100 : 0;
              return (
                <tr
                  key={r.id}
                  className={idx % 2 === 0 ? "bg-white hover:bg-slate-50/60 transition-colors" : "bg-slate-50/40 hover:bg-slate-50/80 transition-colors"}
                >
                  <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums select-none">{idx + 1}</td>

                  {/* Label */}
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      disabled={methodologyLocked}
                      value={r.label}
                      onChange={(e) => updateRow(idx, { label: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      placeholder="Criterion name…"
                    />
                  </td>

                  {/* Weight % */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={methodologyLocked}
                        value={r.weightPct}
                        onChange={(e) => updateRow(idx, { weightPct: e.target.value })}
                        className="w-20 rounded border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  </td>

                  {/* Distribution bar */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]} transition-all`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-slate-400 tabular-nums">
                        {barWidth.toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
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
                        disabled={methodologyLocked || idx >= rows.length - 1}
                        onClick={() => moveDown(idx)}
                        title="Move down"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <IconDown />
                      </button>
                      <button
                        type="button"
                        disabled={methodologyLocked}
                        onClick={() => deleteRow(idx)}
                        title="Delete"
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No criteria defined.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2">
        {!methodologyLocked && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50 transition-colors"
          >
            <IconPlus />
            Add criterion
          </button>
        )}
        {rows.length > 0 && (
          <span className={`ml-auto text-xs tabular-nums font-medium ${weightsValid ? "text-emerald-600" : "text-amber-600"}`}>
            {weightsValid ? "✓" : "⚠"} {weightSumPct}% / 100%
          </span>
        )}
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
            <p className="mb-1.5 text-xs text-slate-400">Read-only — exact value stored in JSON</p>
            <textarea
              readOnly
              rows={Math.min(Math.max(rows.length * 9 + 4, 6), 24)}
              value={rowsToJson(rows)}
              className="w-full rounded border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-600 focus:outline-none resize-y"
              aria-label="Scoring criteria JSON — read-only audit"
            />
          </div>
        )}
      </div>
    </div>
  );
}
