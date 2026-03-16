// src/components/bc01/s2_3/OverridePanel.jsx
// Pass 2 — Override UX for a single option.
//
// Behaviour:
//  - Justification is MANDATORY before Apply is enabled
//  - When overrideRecord.stale === true: shows STALE warning, preserves previous
//    justification in read-only audit display, forces re-entry of new justification
//  - While locked (screening confirmed): entire panel is read-only
//  - Dispatches via onApplyOverride — engine creates the OverrideRecord

import React, { useState, useEffect } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * OverridePanel — allows a reviewer to set finalVerdict ≠ computedVerdict.
 *
 * @param {string}        optionId         - Option being overridden
 * @param {string}        computedVerdict  - Engine-derived verdict (read-only reference)
 * @param {OverrideRecord|undefined} overrideRecord - Current override from Pass-1 state
 * @param {boolean}       isLocked         - True when screening is confirmed
 * @param {Function}      onApplyOverride  - (optionId, finalVerdict, justification, actor) => void
 * @param {string}        actor            - Actor string (user id or role)
 */
export default function OverridePanel({
  optionId,
  computedVerdict,
  overrideRecord,
  isLocked,
  onApplyOverride,
  actor = "analyst",
}) {
  const isStale = overrideRecord?.stale === true;
  const hasActiveOverride = !!overrideRecord && !isStale;

  // Expanded: show form if there's an existing override (stale or not), or user opens it
  const [expanded, setExpanded] = useState(!!overrideRecord);

  // Local form state — reset when overrideRecord changes from outside
  const [selectedVerdict, setSelectedVerdict] = useState(
    overrideRecord?.finalVerdict ?? (computedVerdict === "BASELINE" ? "VIABLE" : computedVerdict ?? "VIABLE")
  );
  const [justification, setJustification] = useState(
    // Stale: start blank to force re-entry (previous justification shown as audit trail below)
    isStale ? "" : (overrideRecord?.overrideReason ?? "")
  );

  // Sync when overrideRecord arrives/changes from engine
  useEffect(() => {
    setExpanded(!!overrideRecord);
    if (overrideRecord) {
      setSelectedVerdict(overrideRecord.finalVerdict);
      // Stale: blank justification field to force re-confirmation
      setJustification(overrideRecord.stale ? "" : (overrideRecord.overrideReason ?? ""));
    }
  }, [
    overrideRecord?.finalVerdict,
    overrideRecord?.overrideReason,
    overrideRecord?.stale,
  ]);

  const justificationTrimmed = justification.trim();
  const canApply = justificationTrimmed.length > 0 && !isLocked;

  function handleApply() {
    if (!canApply) return;
    onApplyOverride(optionId, selectedVerdict, justificationTrimmed, actor);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">

      {/* Header row: checkbox + computed→final summary */}
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isLocked}
            checked={expanded}
            onChange={(e) => setExpanded(e.target.checked)}
            className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
          />
          <span className="text-xs font-medium text-gray-600">
            Override calculated verdict
          </span>
        </label>

        {/* Show computed → final when an override exists */}
        {overrideRecord && (
          <span className="text-xs text-gray-500">
            Computed:{" "}
            <strong className="text-gray-700">{computedVerdict}</strong>
            <span className="mx-1 text-gray-400">→</span>
            Final:{" "}
            <strong className={isStale ? "text-amber-500" : "text-amber-700"}>
              {overrideRecord.finalVerdict}
              {isStale && " (stale)"}
            </strong>
          </span>
        )}
      </div>

      {/* ── STALE WARNING ──────────────────────────────────────────────────── */}
      {isStale && (
        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">
            ⚠️ This override is STALE
            {overrideRecord.staleAt && (
              <> — methodology changed {formatDate(overrideRecord.staleAt)}</>
            )}
          </p>
          {overrideRecord.staleReason && (
            <p className="text-amber-700">{overrideRecord.staleReason}</p>
          )}
          <p>Re-confirmation required. Confirm Screening is blocked until this override is re-applied.</p>

          {/* Audit trail: preserve previous justification, read-only */}
          {overrideRecord.overrideReason && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <p className="text-amber-600 font-medium">Previous justification (audit trail):</p>
              <p className="italic text-amber-600 mt-0.5">
                "{overrideRecord.overrideReason}"
              </p>
              {overrideRecord.overriddenBy && overrideRecord.overriddenAt && (
                <p className="text-amber-500 mt-0.5">
                  — {overrideRecord.overriddenBy}, {formatDate(overrideRecord.overriddenAt)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVE OVERRIDE AUDIT TRAIL (non-stale) ───────────────────────── */}
      {hasActiveOverride && !expanded && (
        <div className="mt-2 pl-5 text-xs text-gray-500 space-y-0.5">
          <p>
            By <strong>{overrideRecord.overriddenBy}</strong>{" "}
            at {formatDate(overrideRecord.overriddenAt)}
          </p>
          <p className="italic">"{overrideRecord.overrideReason}"</p>
        </div>
      )}

      {/* ── OVERRIDE FORM ─────────────────────────────────────────────────── */}
      {(expanded || isStale) && (
        <div className="mt-3 pl-5 space-y-2">

          {/* Final verdict selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 shrink-0 font-medium">
              Final verdict:
            </label>
            <select
              disabled={isLocked}
              value={selectedVerdict}
              onChange={(e) => setSelectedVerdict(e.target.value)}
              className="text-xs border border-amber-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
            >
              <option value="VIABLE">VIABLE</option>
              <option value="DISCOUNTED">DISCOUNTED</option>
              <option value="BASELINE">BASELINE</option>
            </select>
          </div>

          {/* Justification textarea — required */}
          <div>
            <textarea
              rows={2}
              disabled={isLocked}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                isStale
                  ? "New justification required to re-confirm this override…"
                  : "Justification required — explain the rationale for this override…"
              }
              required
              aria-label="Override justification"
              className={[
                "w-full text-xs border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors",
                !justificationTrimmed
                  ? "border-red-300 bg-red-50 placeholder-red-400"
                  : "border-amber-300 bg-white",
                isLocked ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            />
            {!justificationTrimmed && !isLocked && (
              <p className="mt-0.5 text-xs text-red-600">
                Justification is required to apply override.
              </p>
            )}
          </div>

          {/* Apply button */}
          <button
            type="button"
            disabled={!canApply}
            onClick={handleApply}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isStale ? "Re-confirm Override" : hasActiveOverride ? "Update Override" : "Apply Override"}
          </button>
        </div>
      )}
    </div>
  );
}
