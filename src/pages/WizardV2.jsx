// src/pages/WizardV2.jsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import Step3Section from "../components/wizard/Step3Section.jsx";
import Step1Universal from "../components/wizard/steps/Step1Universal.jsx";
import Step2Documents from "../components/wizard/steps/Step2Documents.jsx";
import Step3DocumentWizard from "../components/wizard/steps/Step3DocumentWizard.jsx";
import Step4Export from "../components/wizard/steps/Step4Export.jsx";

/**
 * WizardV2 (corrected / hardened)
 * Goals:
 * - No demo defaults injected into meta or export.
 * - Versioned localStorage keys to prevent old demo runs from sticking.
 * - Safe meta passed to Step3Section to prevent prompt contamination.
 * - Ticket 2: Step2 multi-select (PMI-first + AI bonus) + Continue button.
 * - Backward compatibility: Step3Generate currently uses a single selectedDocId
 *   (we pick the first from selectedDocIds, typically "BC-01").
 *
 * Added now (prep for future coexistence):
 * - builderKind = "governance" (Phase 1)
 * - propagate builderKind to steps + include in export payload
 */

const WIZARD_STORAGE_VERSION = "v4"; // bump because we changed selection data shape (selectedDocIds)
const KEY_CONTEXT = `wizard_context_${WIZARD_STORAGE_VERSION}`;
const KEY_SECTIONS = `wizard_sections_${WIZARD_STORAGE_VERSION}`;
const KEY_SELECTED_DOCS = `wizard_selected_docs_${WIZARD_STORAGE_VERSION}`;
const KEY_ACTIVE_DOC = `wizard_active_doc_${WIZARD_STORAGE_VERSION}`;

/* ---------------- Markdown → HTML (lightweight) ---------------- */
// Note: lightweight renderer for controlled inputs; if accepting arbitrary user HTML,
// consider a sanitizer. This groups consecutive <li> into a single <ul>.
function mdToHtml(markdown = "") {
  if (!markdown) return "";
  let html = markdown
    .replace(/^\s*#{1,6}\s*(.+)$/gm, '<h3 class="font-semibold text-lg mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /^\s*>\s?(.+)$/gm,
      '<blockquote class="border-l-4 border-gray-300 pl-4 italic">$1</blockquote>'
    )
    .replace(/^- (.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> blocks with a single <ul>
  html = html.replace(
    /(?:\s*<li>.*?<\/li>)+/gs,
    (m) => `<ul class="list-disc ml-6 mb-2">${m}</ul>`
  );

  // Paragraphs: convert blank lines to paragraph breaks
  html = html.replace(/\r\n/g, "\n").replace(/\n{2,}/g, '</p><p class="mb-2">');

  // Ensure top-level text nodes are wrapped
  if (!/^<p|<h|<ul|<blockquote/.test(html)) {
    html = `<p class="mb-2">${html}</p>`;
  } else {
    // Wrap any stray lines that are not already block elements
    html = html.replace(
      /(^|>)(?!\s*<\/?)(?!\s*<(?:p|h[1-6]|ul|ol|li|blockquote|strong|em|code|pre)\b)([^\n<][^\n]*)/gm,
      (_m, pre, text) => `${pre}<p class="mb-2">${text}</p>`
    );
  }

  return html.trim();
}

/* ---------------- Local storage helpers (no hooks) ---------------- */
function loadSaved(key, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function useAutoSave(key, data, delay = 2000) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn("Failed to auto-save:", e);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [key, data, delay]);
}

/* ---------------- Prompt-safe meta (no demo fallbacks) ---------------- */
function toPromptSafeMeta(meta) {
  return {
    title: meta?.title?.trim() || "Business Case",
    org: meta?.org?.trim() || "Organization",
    author: meta?.author?.trim() || "Project Team",
    date: meta?.date || new Date().toISOString().slice(0, 10),
    goals: Array.isArray(meta?.goals) ? meta.goals : [],
    industry: meta?.industry || "",
    region: meta?.region || "",
    topic: meta?.topic || "",
  };
}

export default function WizardV2() {
  const [step, setStep] = useState(1);

  // Ticket 3: Advanced mode toggle (hide Section Builder by default)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Wizard builder kind (Phase 1 = governance docs)
  const builderKind = "Governance";

  // Context holds meta + inputs (Step 1)
  const [context, setContext] = useState(() =>
    loadSaved(KEY_CONTEXT, { industry: "", region: "", topic: "", projectType: "default" })
  );

  // Sections saved across refreshes
  const [finalSections, setFinalSections] = useState(() => loadSaved(KEY_SECTIONS, []));

  // ✅ Ticket 2: multi-select doc IDs (persisted)
  const [selectedDocIds, setSelectedDocIds] = useState(() =>
    loadSaved(KEY_SELECTED_DOCS, ["BC-01"]) // sensible default for MVP
  );

  // ✅ A) Active document (the one opened in Step 3)
  const [activeDocId, setActiveDocId] = useState(() => loadSaved(KEY_ACTIVE_DOC, "BC-01"));

  // ✅ B) Active doc drives Step 3; selectedDocIds is multi-select memory/export
  const selectedDocId = useMemo(() => {
    if (activeDocId) return activeDocId;
    // fallback: pick first selected; prefer BC-01 if present
    if (selectedDocIds?.includes("BC-01")) return "BC-01";
    return selectedDocIds?.[0] || null;
  }, [activeDocId, selectedDocIds]);

  // Ticket 3 safety: Step3Generate expects data.inputs; adapt legacy context shape if needed
  const step3Data = useMemo(() => {
    if (!context) return context;
    return context?.inputs ? context : { ...context, inputs: context };
  }, [context]);

  // Built doc + research
  const [builtDoc, setBuiltDoc] = useState(null);
  const [researchBundle, setResearchBundle] = useState(null);

  useAutoSave(KEY_CONTEXT, context);
  useAutoSave(KEY_SECTIONS, finalSections);
  useAutoSave(KEY_SELECTED_DOCS, selectedDocIds);
  useAutoSave(KEY_ACTIVE_DOC, activeDocId);

  // UI toast/badge when a section is added to preview
  const [justAdded, setJustAdded] = useState(null);
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(null), 2000);
    return () => clearTimeout(t);
  }, [justAdded]);

  // Ticket 3: reset Advanced toggle when leaving Step 3
  useEffect(() => {
    if (step !== 3) setShowAdvanced(false);
  }, [step]);

  // Step 3 preview ref for smooth scroll
  const previewRef = useRef(null);

  // Export errors
  const [exportError, setExportError] = useState("");

  function handleAddSection(section) {
    if (!section) return;

    const safeMeta = toPromptSafeMeta(context);
    const html = mdToHtml(section.content || "");

    const next = {
      ...section,
      meta: safeMeta,
      html,
    };

    setFinalSections((prev) => [...(prev || []), next]);
    setJustAdded(section?.title || "Section added");
  }

  function handleContinueToExport() {
    setExportError("");

    const safeMeta = toPromptSafeMeta(context);

    if (!builtDoc) {
      setExportError("Nothing to export yet. Please generate the document first.");
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const assembled = {
      ...builtDoc,
      builderKind,
      selectedDocId,
      selectedDocIds,
      meta: safeMeta,
      sections: finalSections || [],
      researchBundle,
    };

    if (!assembled?.sections?.length) {
      setExportError("No sections in preview. Add at least one section before exporting.");
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setBuiltDoc(assembled);
    setStep(4);
  }

  const clearSavedData = useCallback(() => {
    if (confirm("Clear all saved progress? This cannot be undone.")) {
      localStorage.removeItem(KEY_CONTEXT);
      localStorage.removeItem(KEY_SECTIONS);
      localStorage.removeItem(KEY_SELECTED_DOCS);
      localStorage.removeItem(KEY_ACTIVE_DOC);

      setFinalSections([]);
      setContext({ industry: "", region: "", topic: "", projectType: "default" });
      setSelectedDocIds(["BC-01"]);
      setActiveDocId("BC-01");
      setBuiltDoc(null);
      setResearchBundle(null);
      setExportError("");
      setStep(1);
    }
  }, []);

  // Header back behavior: keep simple but make step transitions consistent
  function goBackOneStep() {
    if (step === 4) return setStep(3);
    if (step === 3) return setStep(2);
    if (step === 2) return setStep(1);
    return setStep(1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FlowGestio — Wizard</h1>
            <p className="text-sm text-gray-600">
              Step {step} of 4 · Builder: <span className="font-medium">{builderKind}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goBackOneStep}
              className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={clearSavedData}
              className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              Clear progress
            </button>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <Step1Universal
            initial={context}
            onNext={(ctx) => {
              setContext(ctx);
              setStep(2);
            }}
          />
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <Step2Documents
            // ✅ Adjustment #2: pass builderKind
            builderKind={builderKind}
            data={step3Data}
            onBack={() => setStep(1)}
            onContinue={({ selectedDocuments }) => {
              const normalized = Array.isArray(selectedDocuments)
                ? selectedDocuments.filter(Boolean)
                : ["BC-01"];

              // Persist multi-selection
              setSelectedDocIds(normalized.length ? normalized : ["BC-01"]);

              // ✅ C) Choose which document opens in Step 3
              setActiveDocId((prev) => {
                if (prev && normalized.includes(prev)) return prev;
                return normalized[0] || "BC-01";
              });

              // Move forward
              setStep(3);
            }}
          />
        )}

        {/* STEP 3 */}
		{step === 3 && (
		  <div className="space-y-6">
		   {/* Step3 builder / generator - FULL WIDTH */}
			<Step3DocumentWizard
			  builderKind={builderKind}
			  step1Data={step3Data}
			  selectedDocId={selectedDocId}
			  selectedDocIds={selectedDocIds}
			  onBack={() => setStep(2)}
			  onNext={(doc) => {
				setBuiltDoc(doc);
				setStep(4);
			  }}
			  onResearch={(bundle) => setResearchBundle(bundle)}
			/>
			
    {/* Advanced toggle - OPTIONNEL (tu peux garder ou enlever) */}
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 p-4">
      <div>
        <div className="font-semibold">Advanced Mode</div>
        <div className="text-sm text-gray-600">
          Show the manual Section Builder (optional).
        </div>
      </div>
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
      >
        {showAdvanced ? "Hide" : "Show"}
      </button>
    </div>

    {showAdvanced && (
      <div className="mt-4">
        <Step3Section meta={toPromptSafeMeta(context)} onAddSection={handleAddSection} />
      </div>
    )}

    {/* Preview section - MAINTENANT EN BAS */}
    <div ref={previewRef} className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Preview</div>
            <div className="text-xs text-gray-600">
              Add sections from generator or advanced builder.
            </div>
          </div>

          <button
            onClick={handleContinueToExport}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue to Export
          </button>
        </div>

        {exportError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {exportError}
          </div>
        )}
      </div>

      {justAdded && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          ✓ {justAdded}
        </div>
      )}

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-semibold mb-2">Final Sections</div>
        {(finalSections || []).length ? (
          <div className="space-y-3">
            {finalSections.map((s, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="text-sm font-semibold">{s.title}</div>
                <div
                  className="prose prose-sm mt-2 max-w-none"
                  dangerouslySetInnerHTML={{ __html: s.html }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            No sections yet. Add a section to start building the preview.
          </div>
        )}
      </div>
    </div>
  </div>
)}

        {/* STEP 4 */}
        {step === 4 && (
          <Step4Export
            data={builtDoc}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  );
}
