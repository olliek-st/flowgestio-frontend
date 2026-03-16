// src/components/wizard/steps/Step2Documents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { runResearch } from "../../../services/researchClient";
import TestPipelineButton from "../../../dev/TestPipelineButton";
import { getPmiDocsForProjectType } from "../../../data/pmiRecommendations";

export default function Step2Documents({ data, onContinue, onBack }) {
  const context = useMemo(
    () => ({
      industry: data?.industry || "",
      region: data?.region || "",
      topic: data?.topic || "",
      projectType: data?.projectType || "default",
    }),
    [data?.industry, data?.region, data?.topic, data?.projectType]
  );

  // PMI recommendations (always available)
  const pmiDocs = useMemo(() => getPmiDocsForProjectType(context.projectType), [context.projectType]);

  // Multi-select (pre-select required docs)
  const [selectedDocs, setSelectedDocs] = useState(() =>
    pmiDocs.filter((d) => d.required).map((d) => d.id)
  );

  // If projectType changes and the list differs, ensure required docs are at least selected
  useEffect(() => {
    setSelectedDocs((prev) => {
      const required = pmiDocs.filter((d) => d.required).map((d) => d.id);
      const merged = Array.from(new Set([...required, ...prev]));
      // Keep only docs that exist in current pmiDocs
      const validIds = new Set(pmiDocs.map((d) => d.id));
      return merged.filter((id) => validIds.has(id));
    });
  }, [pmiDocs]);

  const [aiContext, setAiContext] = useState({
    loading: false,
    message: "",
    summary: "",
  });

  function toggleDoc(docId) {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }

  function handleContinue() {
    if (!selectedDocs.length) {
      alert("Please select at least one document.");
      return;
    }
    onContinue?.({ selectedDocuments: selectedDocs });
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchOptionalContext() {
      if (!context.industry || !context.region) {
        setAiContext({
          loading: false,
          message: "Tip: Add Industry + Region in Step 1 to get optional AI context here.",
          summary: "",
        });
        return;
      }

      setAiContext({ loading: true, message: "", summary: "" });

      try {
        const json = await runResearch({
          topic: `PMI/PMBOK recommended project documents for a ${
            context.topic ? `${context.topic} ` : ""
          }project in the ${context.industry} industry (${context.region}). Provide short practical guidance.`,
          industry: context.industry,
          region: context.region,
          documentType: "document-selection",
          researchFocus: "pmi-recommendations",
        });

        if (cancelled) return;

        setAiContext({
          loading: false,
          message: "",
          summary: json?.summary || "",
        });
      } catch (e) {
        if (cancelled) return;
        setAiContext({
          loading: false,
          message: "AI context unavailable (using PMI recommendations).",
          summary: "",
        });
      }
    }

    fetchOptionalContext();
    return () => {
      cancelled = true;
    };
  }, [context.industry, context.region, context.topic]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-800">Select Governance Documents</div>
        <div className="mt-1 text-sm text-slate-600">
          PMI-guided defaults are always available. AI context is optional and never blocks the flow.
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pmiDocs.map((doc) => {
          const isSelected = selectedDocs.includes(doc.id);

          return (
            <div
              key={doc.id}
              onClick={() => toggleDoc(doc.id)}
              className={[
                "border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer",
                isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{doc.label}</div>
                    <div className="mt-1 text-sm text-slate-600">{doc.description}</div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "text-xs px-2 py-0.5 rounded-full border",
                          doc.required
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-600",
                        ].join(" ")}
                      >
                        {doc.required ? "PMI • Required" : "PMI • Optional"}
                      </span>

                      {isSelected && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                          ✓ Selected
                        </span>
                      )}

                      {doc.estimatedTime && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                          {doc.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Why PMI? */}
              <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-800">
                  Why PMI recommends this
                </summary>

                {doc.rationale && <div className="mt-2 text-sm text-slate-700">{doc.rationale}</div>}

                {doc.useCases?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-slate-700">Common use cases</div>
                    <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                      {doc.useCases.map((useCase) => (
                        <li key={useCase}>{useCase}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {doc.pmbokReference && (
                  <div className="mt-2 text-xs text-slate-500">
                    Reference: <span className="text-slate-600">{doc.pmbokReference}</span>
                  </div>
                )}
              </details>
            </div>
          );
        })}
      </div>

      {/* AI Context */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-800">💡 AI Context (optional)</div>
          {aiContext.loading && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full" />
              Loading...
            </div>
          )}
        </div>

        {aiContext.summary ? (
          <div className="mt-2 text-sm text-slate-700">{aiContext.summary}</div>
        ) : (
          <div className="mt-2 text-sm text-slate-600">
            {aiContext.message || "AI context unavailable (using PMI recommendations)."}
            {aiContext.message && !aiContext.summary && (
              <>
                {" "}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onBack?.();
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Edit Step 1
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
        >
          ← Back
        </button>

        <div className="text-sm text-slate-600">
          {selectedDocs.length} document{selectedDocs.length !== 1 ? "s" : ""} selected
        </div>

        <button
          onClick={handleContinue}
          disabled={selectedDocs.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Builder →
        </button>
      </div>

      {/* Dev Helper */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-6">
          <TestPipelineButton />
        </div>
      )}
    </div>
  );
}
