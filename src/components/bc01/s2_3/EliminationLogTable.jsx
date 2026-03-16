// src/components/bc01/s2_3/EliminationLogTable.jsx
// Pass 2 — Elimination Log viewer (Level 5 Appendix C).
//
// Design invariants (mirroring screeningLog.ts):
//  - Read-only: no mutations — the log is append-only at the engine level
//  - Displays both ACTIVE and SUPERSEDED entries (user can toggle SUPERSEDED)
//  - criterionLabelSnapshot: label captured at evaluation time (may differ from live label)
//  - methodologyHash: first 8 chars visible, full hash in tooltip

import React, { useState } from "react";

// ── Sub-components ────────────────────────────────────────────────────────────

function EntryStatusBadge({ status }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
        ACTIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400 line-through">
      SUPERSEDED
    </span>
  );
}

function HashDisplay({ hash }) {
  if (!hash) return <span className="text-gray-300 italic">—</span>;
  const short = hash.slice(0, 8) + "…";
  return (
    <abbr
      title={`Full hash: ${hash}`}
      className="font-mono text-xs text-gray-500 no-underline border-b border-dotted border-gray-400 cursor-help"
    >
      {short}
    </abbr>
  );
}

function EvidenceRefs({ refs }) {
  if (!refs?.length) return <span className="text-gray-300">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {refs.map((ref, i) => (
        <span
          key={i}
          className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-xs"
        >
          {ref}
        </span>
      ))}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * EliminationLogTable — Appendix C audit log display.
 *
 * @param {Object[]} entries  - EliminationLogEntry[] from state.eliminationLog
 */
export default function EliminationLogTable({ entries = [] }) {
  const [showSuperseded, setShowSuperseded] = useState(false);

  const activeEntries = entries.filter((e) => e.status === "ACTIVE");
  const supersededEntries = entries.filter((e) => e.status === "SUPERSEDED");
  const displayed = showSuperseded ? entries : activeEntries;

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
        <p className="text-sm text-gray-500">No elimination entries yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Options eliminated by deal-breaker failures will appear here once evaluated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          <span className="font-medium text-red-700">{activeEntries.length} active</span>
          {supersededEntries.length > 0 && (
            <span className="ml-2 text-gray-400">{supersededEntries.length} superseded</span>
          )}
        </p>
        {supersededEntries.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSuperseded((v) => !v)}
            className="text-xs text-indigo-600 underline hover:text-indigo-800 transition-colors"
          >
            {showSuperseded ? "Hide superseded" : "Show all including superseded"}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-xs divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Date
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Option
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Criterion
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rationale
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Evidence refs
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actor
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Methodology hash
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {displayed.map((entry) => (
              <tr
                key={entry.id}
                className={[
                  "transition-opacity",
                  entry.status === "SUPERSEDED" ? "opacity-45 bg-gray-50" : "",
                ].join(" ")}
              >
                {/* Date */}
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                  {entry.createdAt
                    ? new Date(entry.createdAt).toLocaleDateString("en-CA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>

                {/* Option name snapshot */}
                <td
                  className="px-3 py-2.5 font-medium text-gray-800 max-w-[140px] truncate"
                  title={entry.optionNameSnapshot}
                >
                  {entry.optionNameSnapshot ?? entry.optionId}
                </td>

                {/* Criterion — label snapshot + ID */}
                <td className="px-3 py-2.5 text-gray-700 max-w-[180px]">
                  <span className="block font-medium leading-tight">
                    {entry.criterionLabelSnapshot ?? entry.failedCriterionId}
                  </span>
                  {entry.criterionLabelSnapshot && entry.criterionLabelSnapshot !== entry.failedCriterionId && (
                    <span className="text-gray-400 font-mono">{entry.failedCriterionId}</span>
                  )}
                </td>

                {/* Rationale */}
                <td className="px-3 py-2.5 text-gray-600 max-w-[200px]">
                  <span
                    className="block overflow-hidden"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                    title={entry.reason}
                  >
                    {entry.reason ?? "—"}
                  </span>
                </td>

                {/* Evidence refs */}
                <td className="px-3 py-2.5">
                  <EvidenceRefs refs={entry.evidenceRefs} />
                </td>

                {/* Actor */}
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                  {entry.actor ?? "—"}
                </td>

                {/* Methodology hash */}
                <td className="px-3 py-2.5">
                  <HashDisplay hash={entry.methodologyHash} />
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <EntryStatusBadge status={entry.status} />
                  {entry.status === "SUPERSEDED" && entry.supersededAt && (
                    <span className="block text-gray-400 mt-0.5 text-xs">
                      {new Date(entry.supersededAt).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
