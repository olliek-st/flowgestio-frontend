// src/components/wizard/Step3Section.jsx
import React, { useMemo, useState, useCallback } from "react";

const API = import.meta.env.VITE_API_BASE || "";

const PMI_ORDER = [
  "exec_summary","problem","strategic_alignment","scope","alternatives",
  "recommendation","benefits","costs","financials","risks","implementation",
  "success_criteria","governance",
];

// Section-specific keywords for research filtering
function getSectionKeywords(sectionId) {
  const keywords = {
    exec_summary: ["summary", "overview", "value proposition", "objectives"],
    problem: ["problem", "challenge", "need", "gap", "issue"],
    strategic_alignment: ["strategy", "alignment", "goals", "objectives"],
    scope: ["scope", "deliverables", "boundaries", "requirements"],
    alternatives: ["alternatives", "options", "comparison", "analysis"],
    recommendation: ["solution", "recommendation", "approach"],
    benefits: ["benefits", "value", "outcomes", "impact"],
    costs: ["cost", "budget", "investment", "expenditure"],
    financials: ["financial", "roi", "npv", "payback", "analysis"],
    risks: ["risk", "mitigation", "uncertainty", "threat"],
    implementation: ["implementation", "plan", "timeline", "approach"],
    success_criteria: ["success", "kpi", "metrics", "measurement"],
    governance: ["governance", "approval", "oversight", "review"]
  };
  return keywords[sectionId] || [];
}

/* --- Enhanced calculator component --- */
function EnhancedCalculator({ sectionType, onCopy }) {
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(3);
  const [initial, setInitial] = useState(500000);
  const [annual, setAnnual] = useState(200000);

  function calcNPV() {
    const r = rate / 100;
    let pv = -initial;
    for (let t = 1; t <= years; t++) pv += annual / Math.pow(1 + r, t);
    return Math.round(pv);
  }
  
  function calcROI() {
    const npv = calcNPV();
    return Math.round((npv / initial) * 100);
  }
  
  function calcPayback() {
    if (annual <= 0) return "N/A";
    return Math.round((initial / annual) * 12); // months
  }

  const npv = calcNPV();
  const roi = calcROI();
  const payback = calcPayback();

  const getSectionSpecificText = () => {
    switch (sectionType) {
      case "costs":
        return `**Estimated Investment:** $${initial.toLocaleString()} initial, $${annual.toLocaleString()}/year operational`;
      case "benefits":
        return `**Financial Benefits:** NPV of $${npv.toLocaleString()} over ${years} years, ROI of ${roi}%`;
      case "financials":
      default:
        return `**Financial Analysis:** NPV: $${npv.toLocaleString()} | ROI: ${roi}% | Payback: ${payback} months`;
    }
  };

  return (
    <div className="border rounded-md p-3 bg-blue-50">
      <div className="font-medium mb-2 text-blue-800">Quick Financial Calculator</div>
      <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
        <label>Years
          <input 
            className="border rounded w-full p-1 text-xs" 
            type="number" 
            value={years} 
            onChange={e=>setYears(Math.max(1, +e.target.value||1))} 
          />
        </label>
        <label>Discount %
          <input 
            className="border rounded w-full p-1 text-xs" 
            type="number" 
            step="0.1"
            value={rate} 
            onChange={e=>setRate(Math.max(0, +e.target.value||0))} 
          />
        </label>
        <label>Initial Cost
          <input 
            className="border rounded w-full p-1 text-xs" 
            type="number" 
            value={initial} 
            onChange={e=>setInitial(Math.max(0, +e.target.value||0))} 
          />
        </label>
        <label>Annual Benefit
          <input 
            className="border rounded w-full p-1 text-xs" 
            type="number" 
            value={annual} 
            onChange={e=>setAnnual(Math.max(0, +e.target.value||0))} 
          />
        </label>
      </div>
      <div className="text-xs text-blue-700 mb-2">
        NPV: <strong>${npv.toLocaleString()}</strong> | 
        ROI: <strong>{roi}%</strong> | 
        Payback: <strong>{payback} months</strong>
      </div>
      <button
        className="w-full text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        onClick={() => onCopy?.(getSectionSpecificText())}
      >
        Insert into Section
      </button>
    </div>
  );
}

/* --- Main component --- */
export default function Step3Section({
  meta,
  sectionDef,
  priorSections = [],
  research = null,
  onFinalize,
  onGoNext,
}) {
  const [formValues, setFormValues] = useState(() => {
    const base = {};
    (sectionDef?.fields || []).forEach(f => { 
      base[f.name] = sectionDef?.initialValues?.[f.name] ?? ""; 
    });
    return base;
  });
  
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [finalized, setFinalized] = useState(false);

  const sortedPrior = useMemo(() =>
    [...(priorSections || [])].sort((a, b) => PMI_ORDER.indexOf(a.id) - PMI_ORDER.indexOf(b.id)),
  [priorSections]);

  // Filter research facts by section relevance
  const relevantFacts = useMemo(() => {
    if (!research?.facts) return [];
    const keywords = getSectionKeywords(sectionDef.id);
    return research.facts.filter(fact => 
      keywords.some(keyword => 
        fact.claim.toLowerCase().includes(keyword.toLowerCase()) ||
        fact.snippet?.toLowerCase().includes(keyword.toLowerCase())
      )
    ).slice(0, 5); // Limit to most relevant
  }, [research?.facts, sectionDef.id]);

  function onFieldChange(name, value) {
    setFormValues(v => ({ ...v, [name]: value }));
    // Clear any existing draft when user makes changes
    if (draft) {
      setDraft(null);
      setFinalized(false);
    }
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const body = {
        meta,
        currentSection: {
          id: sectionDef.id,
          title: sectionDef.title,
          fields: formValues,
        },
        priorSections: sortedPrior.map(s => ({ 
          id: s.id, 
          title: s.title, 
          content_md: s.content_md 
        })),
        research: {
          ...research,
          facts: relevantFacts // Send only relevant facts
        },
        tone: "professional, concise, PMI-aligned",
      };

      const res = await fetch(`${API}/api/generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || j?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setDraft(data);
      setFinalized(false);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Improved apply suggestion function
  async function applySuggestion(sug) {
    if (!sug.body_md) return;
    
    setLoading(true);
    try {
      // Enhanced suggestion application - integrate with existing content rather than append
      const body = {
        meta,
        currentSection: {
          id: sectionDef.id,
          title: sectionDef.title,
          fields: formValues,
        },
        suggestion: sug.body_md,
        existingContent: draft?.content_md || "",
        instruction: "Integrate this suggestion with the existing content to create improved, cohesive text. Do not simply append - weave the suggestion into the appropriate place naturally.",
        tone: "professional, concise, PMI-aligned",
      };

      const res = await fetch(`${API}/api/integrate-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setDraft(prev => ({ ...prev, content_md: data.content_md || prev.content_md }));
      } else {
        // Fallback to simple append if integration endpoint doesn't exist
        setDraft(d => {
          if (!d) return d;
          const appended = (d.content_md || "").trim() + "\n\n" + (sug.body_md || "").trim();
          return { ...d, content_md: appended };
        });
      }
    } catch (e) {
      console.warn("Suggestion integration failed, falling back to append:", e);
      setDraft(d => {
        if (!d) return d;
        const appended = (d.content_md || "").trim() + "\n\n" + (sug.body_md || "").trim();
        return { ...d, content_md: appended };
      });
    } finally {
      setLoading(false);
    }
  }

  function acceptSection() {
    if (draft && onFinalize) {
      onFinalize(draft);
      setFinalized(true);
    }
  }

  // Render form field based on type
  function renderField(field) {
    const commonProps = {
      value: formValues[field.name] ?? "",
      onChange: (e) => onFieldChange(field.name, e.target.value),
      placeholder: field.placeholder || "",
      className: "border rounded-md p-2 w-full"
    };

    switch (field.type) {
      case "select":
        return (
          <select {...commonProps} className="border rounded-md p-2 w-full">
            <option value="">Select {field.label.toLowerCase()}...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case "textarea":
        return (
          <textarea 
            {...commonProps} 
            className="border rounded-md p-2 w-full min-h-[96px]"
            rows={3}
          />
        );
      case "number":
        return (
          <input 
            {...commonProps} 
            type="number"
            min="0"
            step={field.name.includes("rate") ? "0.1" : "1"}
          />
        );
      default:
        return <input {...commonProps} type="text" />;
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{sectionDef.title}</h3>
          {relevantFacts.length > 0 && (
            <p className="text-sm text-blue-600">
              {relevantFacts.length} relevant research insights found
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={loading}
            className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60 hover:bg-blue-700"
          >
            {loading ? "Generating..." : "Generate Section"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-3">
        {(sectionDef.fields || []).map((field) => (
          <div key={field.name} className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              {field.label}
              {field.type === "select" && field.options && (
                <span className="text-xs text-gray-500 ml-1">
                  (choose from dropdown)
                </span>
              )}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Error */}
      {!!error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          <strong>Generation failed:</strong> {error}
        </div>
      )}

      {/* AI-Generated Draft (Single preview instead of both live + AI) */}
      {draft?.content_md && (
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">Generated Content</div>
          <div className="border rounded-md p-3 bg-white">
            <pre className="whitespace-pre-wrap text-sm">{draft.content_md}</pre>
            {draft.connector_md && (
              <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                <strong>Transition:</strong> {draft.connector_md}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Research Suggestions - Full Width */}
      {draft && (
        <div className="space-y-4">
          <div className="w-full">
            <div className="text-sm font-medium text-gray-600 mb-2">Research Suggestions</div>
            <div className="border rounded-md p-3 bg-green-50 space-y-2">
              {draft?.suggestions?.length ? (
                draft.suggestions.map((s) => (
                  <div key={s.id} className="flex items-start justify-between p-2 bg-white rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">{s.label}</div>
                      <div className="text-xs text-gray-600">{s.body_md}</div>
                    </div>
                    <button
                      className="ml-2 text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 flex-shrink-0"
                      onClick={() => applySuggestion(s)}
                      disabled={loading}
                    >
                      Apply
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">
                  Generate the section to see targeted suggestions
                </p>
              )}
            </div>
          </div>

          {/* Guidelines - Full Width */}
          <div className="w-full">
            <div className="text-sm font-medium text-gray-600 mb-2">Guidelines</div>
            <div className="border rounded-md p-3 bg-yellow-50 space-y-2">
              {draft?.guidelines?.length ? (
                draft.guidelines.map((g) => (
                  <div key={g.id} className="p-2 bg-white rounded">
                    <div className="text-xs">{g.note_md}</div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">
                  Guidelines appear after generation
                </p>
              )}
            </div>
          </div>

          {/* Calculator (if applicable) */}
          {["costs", "benefits", "financials"].includes(sectionDef.id) && (
            <div className="w-full">
              <EnhancedCalculator
                sectionType={sectionDef.id}
                onCopy={(text) =>
                  setDraft(d => d ? { ...d, content_md: `${d.content_md}\n\n${text}` } : d)
                }
              />
            </div>
          )}

          {/* Action Buttons - 50/50 Layout */}
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`px-3 py-2 rounded-md text-white font-medium ${
                finalized 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : draft 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-gray-300 cursor-not-allowed"
              }`}
              onClick={acceptSection}
              disabled={!draft || finalized}
              title={
                !draft 
                  ? "Generate the section first" 
                  : finalized 
                    ? "Already added to preview"
                    : "Add this section to the document preview"
              }
            >
              {finalized ? "✓ Added to Preview" : "Use this Section"}
            </button>
            
            <button
              className={`px-3 py-2 rounded-md font-medium ${
                finalized
                  ? "bg-gray-700 text-white hover:bg-gray-800"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              onClick={() => finalized && onGoNext?.()}
              disabled={!finalized}
              title={finalized ? "Go to next section" : "Complete current section first"}
            >
              Next Section →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}