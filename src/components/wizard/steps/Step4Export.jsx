// src/components/wizard/steps/Step4Export.jsx
import React, { useState, useMemo, useRef } from "react";
import { exportService } from "../../../services/exportService";
import { validateBusinessCase as _validate } from "../../../services/validation";

/* -----------------------------------------------------
   Input adapters & normalization
----------------------------------------------------- */

function pickBuiltDocAndMetaProps(props) {
  // Accepts multiple shapes: {doc}, {data.builtDoc}, or {data}
  const builtDoc = props.doc || props.data?.builtDoc || props.data || null;
  const analyzedModel = props.data?.analyzedModel || null;
  const docType = props.data?.docType || "business-case";
  return { builtDoc, analyzedModel, docType };
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((s, idx) => {
    const content_md = (s.content_md ?? s.content ?? "").toString();
    return {
      id: s.id || `sec_${idx + 1}`,
      title: (s.title || "").trim() || `Section ${idx + 1}`,
      content_md,           // keep markdown explicitly
      content: content_md,  // maintain backward-compat with callers using `content`
    };
  });
}


function toValidationShape(builtDoc) {
  if (!builtDoc) return { meta: { title: "" }, sections: [] };

  const title = (builtDoc.meta?.title || builtDoc.title || "").trim();
  const sections = normalizeSections(builtDoc.sections);

  return {
    ...builtDoc,
    title: title || builtDoc.title || "",
    meta: { ...(builtDoc.meta || {}), title },
    sections,
  };
}

function enhancedPreflightChecks(doc) {
  const errs = [];
  const warns = [];

  const title = (doc.meta?.title || "").trim();
  if (!title) errs.push("Document title is required for export.");

  const nonEmptySections = (doc.sections || []).filter((s) => (s.content || "").trim());
  if (nonEmptySections.length === 0) errs.push("At least one section with content is required.");

  return { errs, warns };
}

function normalizeValidation(result) {
  if (!result) return { ok: false, errors: ["Validation service unavailable."], warnings: [] };
  const errors = Array.isArray(result.errors) ? result.errors : [];
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const ok = typeof result.ok === "boolean" ? result.ok : errors.length === 0;
  return { ok, errors, warnings };
}

/* -----------------------------------------------------
   Component
----------------------------------------------------- */

export default function Step4Export(props) {
  const { builtDoc: rawBuiltDoc, analyzedModel, docType } = pickBuiltDocAndMetaProps(props);
  const builtDoc = toValidationShape(rawBuiltDoc);

  const validation = useMemo(() => {
    const { errs, warns } = enhancedPreflightChecks(builtDoc);
    const serviceValidation = normalizeValidation(_validate(builtDoc));
    const errors = [...errs, ...serviceValidation.errors];
    const warnings = [...warns, ...serviceValidation.warnings];
    const ok = errors.length === 0;
    return { ok, errors, warnings };
  }, [builtDoc]);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const abortRef = useRef(null);

  async function onExport(fmt) {
    if (exporting) return; // guard
    setExportError("");

    if (!validation.ok) {
      const msg =
        "Please resolve the following issues before exporting:\n\n" + validation.errors.join("\n");
      alert(msg);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setExporting(true);

      const exportData =
        docType === "business-case" && analyzedModel
          ? { document: builtDoc, analyzedModel, docType }
          : builtDoc;

      // The export service may return { url, filename } OR { blob, filename }.
      const result = await exportService.exportDocument(
        exportData,
        {
          format: fmt,
          citationStyle: "APA7",
          includeMetadata: true,
          includeDiagnostics: false,
          verifyCitations: false,
        },
        { signal: controller.signal } // allow service to pass through AbortSignal if it supports it
      );

      const filename =
        (result && result.filename) ||
        `${(builtDoc.meta?.title || "document").replace(/[^\w\d-_]+/g, "_")}.${fmt}`;

      let objectUrl = null;

      if (result?.blob instanceof Blob) {
        objectUrl = URL.createObjectURL(result.blob);
      }

      const href = objectUrl || result?.url;
      if (!href) throw new Error("Export failed: no file URL returned.");

      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoke object URL if we created one
      setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 150);
    } catch (e) {
      if (e?.name === "AbortError") return; // silently ignore cancel
      console.error("Export error:", e);
      setExportError(e?.message || "Unknown export error.");
      alert("Export failed: " + (e?.message || "Unknown error"));
    } finally {
      setExporting(false);
      abortRef.current = null;
    }
  }

  function cancelExport() {
    try {
      abortRef.current?.abort();
    } catch {}
  }

  const titleForDisplay = builtDoc?.meta?.title || builtDoc?.title || "Untitled Document";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Step 4 — Review &amp; Export</h2>
          <p className="text-sm text-slate-600">
            Review your {docType === "business-case" ? "business case" : "document"}, fix any issues, then export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={props.onBack}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      {/* Validation Errors */}
      {!validation.ok && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-red-500" aria-hidden>⚠</span>
            Please resolve these issues before export:
          </div>
          <ul className="list-disc ml-5 text-sm space-y-1">
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Options */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="font-semibold mb-2">Export Options</div>
        <div className="text-sm text-slate-600 mb-4">
          {validation.ok
            ? exporting
              ? "Preparing your file…"
              : "Your document is ready to export in multiple formats."
            : "Export will be enabled once all errors are resolved."}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { fmt: "pdf", label: "PDF", desc: "Best for sharing and presentations" },
            { fmt: "docx", label: "Word", desc: "Editable Microsoft Word document" },
            { fmt: "html", label: "HTML", desc: "Web page format" },
            { fmt: "txt", label: "Text", desc: "Plain text format" },
            { fmt: "json", label: "JSON", desc: "Structured data format" },
          ].map(({ fmt, label, desc }) => (
            <button
              key={fmt}
              onClick={() => onExport(fmt)}
              disabled={!validation.ok || exporting}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !validation.ok || exporting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
              title={!validation.ok ? "Resolve errors to enable export" : desc}
            >
              {exporting ? "Exporting…" : label}
            </button>
          ))}

          {exporting && (
            <button
              onClick={cancelExport}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 text-slate-800 hover:bg-gray-300"
              title="Cancel in-progress export"
            >
              Cancel
            </button>
          )}
        </div>

        {!!exportError && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm" role="alert">
            {exportError}
          </div>
        )}
      </div>

      {/* Document Preview */}
      <div className="rounded-xl border p-4 bg-slate-50">
        <div className="font-semibold mb-3">Document Preview</div>
        <div className="text-xs text-slate-600 mb-4">
          <strong>Title:</strong> {titleForDisplay}
        </div>

        {Array.isArray(builtDoc?.sections) && builtDoc.sections.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Content Preview</div>
            <div className="max-h-96 overflow-y-auto border rounded-lg bg-white p-3">
              <div className="text-sm">
                <h4 className="font-semibold mb-3 text-lg">{titleForDisplay}</h4>
                {builtDoc.sections.map((section, i) => {
                  const text = (section.content || "").toString();
                  const snippet =
                    text.length > 600 ? text.slice(0, 600).replace(/\s+\S*$/, "") + "…" : text || "No content";
                  return (
                    <div key={section.id || i} className="mb-4 pb-3 border-b border-slate-100 last:border-b-0">
                      <div className="font-medium text-slate-900 mb-2">{section.title}</div>
                      <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{snippet}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {validation.warnings?.length > 0 && (
          <div className="mt-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 text-sm">
            <div className="font-medium mb-1">Warnings</div>
            <ul className="list-disc ml-5">
              {validation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
