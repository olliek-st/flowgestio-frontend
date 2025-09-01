import React from "react";
import { exportService } from "../../../services/exportService";
import { validateBusinessCase as _validate } from "../../../services/validation";

/** Optional adapter in case your validator's shape differs */
function normalizeValidation(result) {
  if (!result) return { ok: false, errors: ["Unknown validation result"], warnings: [] };
  // Accept either {ok, errors, warnings} or {errors, warnings} with ok inferred
  const errors = Array.isArray(result.errors) ? result.errors : [];
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const ok = typeof result.ok === "boolean" ? result.ok : errors.length === 0;
  return { ok, errors, warnings };
}

export default function Step4Export({
  // UPDATED: Handle new data structure from Step 3
  data, // This now contains: { analyzedModel?, builtDoc, docType }
  onBack,
}) {
  // Extract the document for validation and export
  const builtDoc = data?.builtDoc || data; // Fallback for legacy data structure
  const analyzedModel = data?.analyzedModel; // P1 model with _calc objects
  const docType = data?.docType;

  const { ok, errors, warnings } = normalizeValidation(_validate(builtDoc));

  async function onExport(fmt) {
    if (!ok) {
      alert("Fix these before export:\n" + errors.join("\n"));
      return;
    }
    try {
      // For business cases, pass both the document AND the analyzed model
      // This gives exportService access to financial calculations if needed
      const exportData = docType === "business-case" && analyzedModel 
        ? { document: builtDoc, analyzedModel, docType }
        : builtDoc;

      const { url, filename, warnings: exportWarnings } = await exportService.exportDocument(
        exportData,
        {
          format: fmt,               // "pdf" | "docx" | "html" | "txt" | "json"
          citationStyle: "APA7",
          includeMetadata: true,
          includeDiagnostics: false, // flip on when debugging
          verifyCitations: false,    // set true after verifyAll() is real
        }
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (exportWarnings?.length) {
        // non-blocking: show in console or toast
        console.warn("Export warnings:", exportWarnings);
      }
    } catch (e) {
      console.error(e);
      alert("Export failed: " + (e?.message || "Unknown error"));
    }
  }

  // Show financial metrics if we have the analyzed model
  const showFinancialSummary = () => {
    if (docType !== "business-case" || !analyzedModel?.options) return null;
    
    const proposedOption = analyzedModel.options.find(o => !o.isBaseline);
    const calc = proposedOption?._calc;
    
    if (!calc) return null;
    
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="font-semibold mb-2 text-green-800">Financial Analysis Summary</div>
        <div className="text-sm text-green-700 space-y-1">
          {calc.roiPct !== undefined && (
            <div><span className="font-medium">ROI:</span> {calc.roiPct.toFixed(1)}%</div>
          )}
          {calc.npv !== undefined && (
            <div><span className="font-medium">NPV:</span> {calc.currency || '$'}{calc.npv.toLocaleString()}</div>
          )}
          {calc.paybackMonths !== undefined && (
            <div><span className="font-medium">Payback:</span> {calc.paybackMonths} months</div>
          )}
          {calc.mirrPct !== undefined && (
            <div><span className="font-medium">MIRR:</span> {calc.mirrPct.toFixed(1)}%</div>
          )}
          <div><span className="font-medium">Analysis Period:</span> {calc.horizonMonths} months</div>
        </div>
      </div>
    );
  };

  // Show validation insights from the analyzed model
  const showValidationInsights = () => {
    if (docType !== "business-case" || !analyzedModel) return null;
    
    const insights = [];
    
    // Check if we have proper baseline vs proposed comparison
    const baseline = analyzedModel.options?.find(o => o.isBaseline);
    const proposed = analyzedModel.options?.find(o => !o.isBaseline);
    
    if (baseline && proposed) {
      const baselineCalc = baseline._calc;
      const proposedCalc = proposed._calc;
      
      if (baselineCalc && proposedCalc) {
        const netBenefit = (proposedCalc.npv || 0) - (baselineCalc.npv || 0);
        if (netBenefit > 0) {
          insights.push(`Net benefit over baseline: ${analyzedModel.financial?.currency || '$'}${netBenefit.toLocaleString()}`);
        }
      }
    }
    
    // Check risk coverage
    const riskCount = analyzedModel.projectRisks?.length || 0;
    if (riskCount > 0) {
      insights.push(`${riskCount} project risks identified and assessed`);
    }
    
    // Check KPI coverage
    const kpiCount = analyzedModel.strategic?.successKPIs?.length || 0;
    if (kpiCount > 0) {
      insights.push(`${kpiCount} success KPIs defined`);
    }
    
    if (insights.length === 0) return null;
    
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="font-semibold mb-2 text-blue-800">Analysis Insights</div>
        <ul className="text-sm text-blue-700 space-y-1">
          {insights.map((insight, i) => (
            <li key={i}>• {insight}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Step 4 — Review & Export</h2>
          <p className="text-sm text-slate-600">
            Review your {docType === "business-case" ? "business case" : "document"}, fix any blocking issues, then export in your preferred format.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      {/* Errors (blocking) */}
      {!ok && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-red-500">⚠</span>
            Please fix before export:
          </div>
          <ul className="list-disc ml-5 text-sm space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings (non-blocking) */}
      {warnings?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-amber-500">💡</span>
            Suggestions for improvement:
          </div>
          <ul className="list-disc ml-5 text-sm space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Financial Summary (for business cases) */}
      {showFinancialSummary()}

      {/* Validation Insights */}
      {showValidationInsights()}

      {/* Export buttons */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="font-semibold mb-2">Export Options</div>
        <div className="text-sm text-slate-600 mb-3">
          {ok ? "Your document is ready to export in multiple formats." : "Export will be enabled once errors are resolved."}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { fmt: "pdf", label: "PDF", desc: "Best for sharing and presentations" },
            { fmt: "docx", label: "Word", desc: "Editable Microsoft Word document" },
            { fmt: "html", label: "HTML", desc: "Web page format" },
            { fmt: "txt", label: "Text", desc: "Plain text format" },
            { fmt: "json", label: "JSON", desc: "Structured data format" }
          ].map(({ fmt, label, desc }) => (
            <button
              key={fmt}
              onClick={() => onExport(fmt)}
              disabled={!ok}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm font-medium"
              title={!ok ? "Resolve errors to enable export" : desc}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Document preview */}
      <div className="rounded-xl border p-4 bg-slate-50">
        <div className="font-semibold mb-3">Document Preview</div>
        
        {/* Document metadata */}
        <div className="text-xs text-slate-600 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="font-medium">Title:</span>
            <div className="mt-1">{builtDoc?.meta?.title || builtDoc?.title || "Untitled"}</div>
          </div>
          <div>
            <span className="font-medium">Type:</span>
            <div className="mt-1 capitalize">{docType?.replace('-', ' ') || "Document"}</div>
          </div>
          <div>
            <span className="font-medium">Sections:</span>
            <div className="mt-1">{builtDoc?.sections?.length || 0}</div>
          </div>
          <div>
            <span className="font-medium">Status:</span>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {ok ? 'Ready' : 'Has Issues'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Document content preview */}
        {builtDoc?.sections && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Content Preview</div>
            <div className="max-h-96 overflow-y-auto border rounded-lg bg-white p-3">
              <div className="text-sm">
                <h4 className="font-semibold mb-3 text-lg">
                  {builtDoc.title || builtDoc.meta?.title || "Document"}
                </h4>
                {builtDoc.sections.map((section, i) => (
                  <div key={i} className="mb-4 pb-3 border-b border-slate-100 last:border-b-0">
                    <div className="font-medium text-slate-900 mb-2">{section.title}</div>
                    <div className="text-slate-700 text-sm leading-relaxed">
                      {section.content?.length > 300 
                        ? `${section.content.substring(0, 300)}...` 
                        : section.content || "No content"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Additional metadata for business cases */}
        {docType === "business-case" && analyzedModel && (
          <div className="mt-4 pt-3 border-t">
            <div className="text-xs text-slate-500">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="font-medium">Project Type:</span>
                  <div className="mt-1 capitalize">{analyzedModel.projectType?.replace('_', ' ')}</div>
                </div>
                <div>
                  <span className="font-medium">Analysis Period:</span>
                  <div className="mt-1">{analyzedModel.financial?.horizonMonths} months</div>
                </div>
                <div>
                  <span className="font-medium">Currency:</span>
                  <div className="mt-1">{analyzedModel.financial?.currency}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}