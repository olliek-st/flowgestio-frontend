// src/components/wizard/steps/Step2Documents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { runResearch } from "../../../services/researchClient";
import TestPipelineButton from "../../../dev/TestPipelineButton";

// Document-specific research topics that are contextual but focus on each document type
const DOCS = [
  { 
    id: "business-case", 
    label: "Business Case", 
    research: "business case ROI analysis financial justification examples",
    researchFocus: "financial-justification"
  },
  { 
    id: "project-charter", 
    label: "Project Charter", 
    research: "project charter components business objectives stakeholder identification",
    researchFocus: "project-initiation"
  },
  { 
    id: "scope-plan", 
    label: "Scope Management Plan", 
    research: "project scope management work breakdown structure scope creep prevention",
    researchFocus: "scope-management"
  },
  { 
    id: "requirements-plan", 
    label: "Requirements Management Plan", 
    research: "requirements management process stakeholder requirements traceability",
    researchFocus: "requirements-management"
  },
  { 
    id: "schedule-plan", 
    label: "Schedule Management Plan", 
    research: "project scheduling techniques critical path method resource leveling",
    researchFocus: "schedule-management"
  },
  { 
    id: "cost-plan", 
    label: "Cost Management Plan", 
    research: "project cost management budget control earned value management",
    researchFocus: "cost-management"
  },
  { 
    id: "quality-plan", 
    label: "Quality Management Plan", 
    research: "quality management planning quality assurance quality control metrics",
    researchFocus: "quality-management"
  },
  { 
    id: "resource-plan", 
    label: "Resource Management Plan", 
    research: "project resource management team development resource optimization",
    researchFocus: "resource-management"
  },
  { 
    id: "communication-plan", 
    label: "Communication Management Plan", 
    research: "project communication planning stakeholder communication matrix",
    researchFocus: "communication-management"
  },
  { 
    id: "risk-plan", 
    label: "Risk Management Plan", 
    research: "project risk management risk assessment risk mitigation strategies",
    researchFocus: "risk-management"
  },
  { 
    id: "procurement-plan", 
    label: "Procurement Management Plan", 
    research: "project procurement management vendor selection contract management",
    researchFocus: "procurement-management"
  },
  { 
    id: "stakeholder-plan", 
    label: "Stakeholder Management Plan", 
    research: "stakeholder management stakeholder engagement stakeholder analysis matrix",
    researchFocus: "stakeholder-management"
  },
];

export default function Step2Documents({ data, onPick }) {
  const context = useMemo(
    () => ({ 
      industry: data?.industry || "", 
      region: data?.region || "",
      // Add topic context for better research
      topic: data?.topic || ""
    }),
    [data?.industry, data?.region, data?.topic]
  );

  const [results, setResults] = useState(() => new Map()); // id -> { loading, error, summary, facts, notes }
  const [inFlight, setInFlight] = useState(false);

  // Enhanced research function that provides document-specific research within business context
  const buildResearchQuery = (doc, context) => {
    const { industry, region, topic } = context;
    
    // Build contextual query for each document type
    let query = doc.research;
    
    // Add industry context to make research more relevant
    if (industry) {
      query += ` ${industry} industry`;
    }
    
    // Add business case context for non-business-case documents
    if (doc.id !== "business-case" && topic) {
      query += ` ${topic} project`;
    }
    
    // For business case, add topic directly
    if (doc.id === "business-case" && topic) {
      query += ` ${topic}`;
    }
    
    return query;
  };

  // Fetch research for all tiles when context changes (lean payload only)
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      // If no context yet, skip (keeps UI calm)
      if (!context.industry || !context.region) return;

      setInFlight(true);

      // Kick each tile to "loading"
      setResults(prev => {
        const next = new Map(prev);
        for (const d of DOCS) {
          next.set(d.id, { loading: true, error: "", summary: "", facts: [], notes: [] });
        }
        return next;
      });

      const promises = DOCS.map(d => {
        const enhancedQuery = buildResearchQuery(d, context);
        
        return runResearch({
          topic: enhancedQuery,
          industry: context.industry,
          region: context.region,
          // Document-specific context instead of forcing business-case for all
          documentType: d.id,
          researchFocus: d.researchFocus,
          // Selective exclusions - only exclude PMI for business case
          excludeTerms: d.id === "business-case" ? [
            "pmbok", "pmp certification", "project manager", 
            "scrum master", "agile methodology", "waterfall",
            "work breakdown structure", "gantt chart"
          ] : [],
          // Selective priorities - business terms for business case, document-specific for others
          priorityTerms: d.id === "business-case" ? [
            "business case", "roi", "cost benefit", "financial analysis",
            "business value", "investment", "cost savings"
          ] : [
            d.researchFocus.replace('-', ' '), "best practices", "framework", "process"
          ]
        })
          .then((json) => ({ id: d.id, ok: true, json }))
          .catch((e) => ({ id: d.id, ok: false, error: e.message || String(e) }));
      });

      const settled = await Promise.all(promises);

      if (cancelled) return;

      setResults(prev => {
        const next = new Map(prev);
        for (const r of settled) {
          if (r.ok) {
            // Filter facts based on document type
            const filteredFacts = filterBusinessCaseContent(r.json?.facts || [], r.id);
            
            next.set(r.id, {
              loading: false,
              error: "",
              summary: r.json?.summary || "",
              facts: filteredFacts,
              notes: Array.isArray(r.json?.notes) ? r.json.notes : [],
            });
          } else {
            next.set(r.id, {
              loading: false,
              error: r.error || "Research failed",
              summary: "",
              facts: [],
              notes: ["research_error"],
            });
          }
        }
        return next;
      });

      setInFlight(false);
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [context.industry, context.region, context.topic]);

  // Filter facts based on document type - business case gets business filtering, others get document-specific filtering
  function filterBusinessCaseContent(facts, docId) {
    if (!Array.isArray(facts)) return [];
    
    if (docId === "business-case") {
      // Business case: Remove PMI methodology, prioritize financial content
      const pmiTerms = /pmbok|pmp certification|project manager|scrum master|agile methodology|waterfall methodology|work breakdown structure|gantt chart|project lifecycle/i;
      const businessTerms = /business case|roi|cost benefit|financial|investment|revenue|profit|savings|value|benefit|analysis/i;
      
      return facts
        .filter(fact => {
          const content = String(fact.claim || "").toLowerCase();
          if (pmiTerms.test(content)) return false;
          return true;
        })
        .sort((a, b) => {
          const aHasBusiness = businessTerms.test(String(a.claim || "").toLowerCase());
          const bHasBusiness = businessTerms.test(String(b.claim || "").toLowerCase());
          
          if (aHasBusiness && !bHasBusiness) return -1;
          if (!aHasBusiness && bHasBusiness) return 1;
          return 0;
        });
    } else {
      // Other documents: Keep relevant PM methodology but ensure it's contextual
      const genericTerms = /generic|template|standard form|basic process/i;
      
      return facts.filter(fact => {
        const content = String(fact.claim || "").toLowerCase();
        // Remove overly generic content
        if (genericTerms.test(content)) return false;
        return true;
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      {inFlight && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-sm text-blue-800">Researching business case examples and industry insights...</span>
          </div>
        </div>
      )}

      <div className="document-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCS.map((doc) => {
          const r = results.get(doc.id) || { loading: false, error: "", summary: "", facts: [], notes: [] };

          return (
            <div key={doc.id} className="border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <button
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  onClick={() => onPick?.(doc.id)}
                  title={`Create a ${doc.label}`}
                >
                  {doc.label}
                </button>

                <span className="text-xs text-slate-500">
                  {r.loading ? (
                    <span className="flex items-center gap-1">
                      <div className="animate-pulse h-2 w-2 bg-blue-400 rounded-full"></div>
                      loading
                    </span>
                  ) : r.error ? (
                    <span className="text-red-500">error</span>
                  ) : r.facts.length ? (
                    <span className="text-green-600">{r.facts.length} insights</span>
                  ) : (
                    "no data"
                  )}
                </span>
              </div>

              {/* Summary */}
              <div className="mt-3">
                {r.error ? (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">
                    {r.error}
                  </div>
                ) : r.loading ? (
                  <div className="space-y-2">
                    <div className="h-3 animate-pulse rounded bg-slate-200"></div>
                    <div className="h-3 animate-pulse rounded bg-slate-200 w-4/5"></div>
                    <div className="h-3 animate-pulse rounded bg-slate-200 w-3/5"></div>
                  </div>
                ) : r.summary ? (
                  <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    {r.summary}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No summary available.</div>
                )}
              </div>

              {/* Facts */}
              <div className="mt-3 space-y-3">
                {(r.facts || []).slice(0, 3).map((f, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors">
                    <div className="text-[13px] text-slate-800 font-medium mb-2">{f.claim}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                      {f.source ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                          {f.source}
                        </span>
                      ) : null}
                      {typeof f.confidence === "number" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          {Math.round(f.confidence * 100)}% confidence
                        </span>
                      ) : null}
                      {f.published ? (
                        <span className="text-slate-500">{new Date(f.published).toISOString().slice(0, 10)}</span>
                      ) : null}
                    </div>
                    {f.snippet && (
                      <div className="mt-2 text-xs text-slate-600 line-clamp-2">{f.snippet}</div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {f.url ? (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 hover:underline"
                        >
                          View source
                        </a>
                      ) : null}
                      <button
                        onClick={() => copyCitation(f)}
                        className="text-xs rounded-lg px-2 py-1 border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        Copy citation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Optional dev helper at the bottom */}
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="mt-6">
            <TestPipelineButton />
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---- helpers ---- */
function copyCitation(fact) {
  const text = `${fact.claim} — ${fact.url || ""}`;
  navigator.clipboard.writeText(text).catch(() => {});
}