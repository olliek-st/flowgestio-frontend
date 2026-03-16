// src/components/wizard/PMIReferenceModal.jsx
// (Peut être renommé PMIReferenceModal plus tard)

import React from "react";

/**
 * ReferenceModal (PMI-compatible)
 * Displays internal PMI knowledge entries (principles, domains, practices)
 */
export default function PMIReferenceModal({ reference, onClose }) {
  if (!reference) return null;

  // Close on outside click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const {
    id,
    title,
    summary,
    whyItMatters = [],
    howToApply = [],
    kind,
  } = reference;

  const kindLabel =
    kind === "principle"
      ? "PMBOK 7 — Principle"
      : kind === "performanceDomain"
      ? "PMBOK 7 — Performance Domain"
      : "PMI Practice";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b bg-blue-50 px-6 py-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                {id}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-600">{kindLabel}</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: "calc(80vh - 180px)" }}>
          {/* Summary */}
          {summary && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                What this means
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* Why it matters */}
          {whyItMatters.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Why it matters
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {whyItMatters.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* How to apply */}
          {howToApply.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                How to apply this in your Business Case
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {howToApply.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              FlowGestio Knowledge Base • Inspired by PMI (PMBOK® Guide)
            </p>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
