// src/components/wizard/steps/Step1Context.jsx
// ENRICHED VERSION - Collects universal project data

import React, { useMemo, useState, useEffect } from "react";
import { CONFIG_V1 } from "../../../config";
import { UniversalProjectSchema } from "../../../lib/schemas/universal.schema";

export default function Step1Context({ initial = {}, onNext, onBack }) {
  // ===== EXISTING FIELDS (KEEP AS-IS) =====
  
  // Context used by research & compliance
  const [topic, setTopic] = useState(initial.topic || "");
  const [industry, setIndustry] = useState(initial.industry || "");
  const [subsector, setSubsector] = useState(initial.subsector || "");
  const [region, setRegion] = useState(initial.region || "");

  // Actual document inputs (used by documentBuilder)
  const [title, setTitle] = useState(initial.inputs?.title || "");
  const [sponsor, setSponsor] = useState(initial.inputs?.sponsor || "");
  const [manager, setManager] = useState(initial.inputs?.manager || "");
  const [startDate, setStartDate] = useState(initial.inputs?.startDate || "");
  const [endDate, setEndDate] = useState(initial.inputs?.endDate || "");
  const [problem, setProblem] = useState(initial.inputs?.problem || "");
  const [goalsText, setGoalsText] = useState((initial.inputs?.goals || []).join(", "));
  const [capex, setCapex] = useState(initial.inputs?.capex ?? "");
  const [opex, setOpex] = useState(initial.inputs?.opex_annual ?? "");
  
  // ===== NEW FIELDS FOR UNIVERSAL DATA =====
  
  // Project type
  const [projectType, setProjectType] = useState(
    initial.universal?.project?.type || "process_improvement"
  );
  
  // Organization details
  const [organizationName, setOrganizationName] = useState(
    initial.universal?.organization?.name || ""
  );
  const [department, setDepartment] = useState(
    initial.universal?.organization?.department || ""
  );
  const [branch, setBranch] = useState(
    initial.universal?.organization?.branch || ""
  );
  
  // Scope (brief)
  const [scopeIncluded, setScopeIncluded] = useState(
    initial.universal?.scope?.included || ""
  );
  const [scopeExcluded, setScopeExcluded] = useState(
    initial.universal?.scope?.excluded || ""
  );
  
  // Stakeholders (simplified)
  const [stakeholders, setStakeholders] = useState(
    initial.universal?.stakeholders || []
  );
  
  // Milestones
  const [milestones, setMilestones] = useState(
    initial.universal?.timeline?.majorMilestones || []
  );
  
  // Show/hide optional sections
  const [showOptionalSections, setShowOptionalSections] = useState(false);

  // ===== EXISTING LOGIC (KEEP) =====
  
  useEffect(() => {
    const el = document.getElementById("fg-topic");
    el && el.focus();
  }, []);

  const presets = CONFIG_V1?.industryPresets || [];

  const industries = useMemo(() => {
    return Array.from(new Set(presets.map((p) => p.industry).filter(Boolean))).sort();
  }, [presets]);

  const subsectorsForIndustry = useMemo(() => {
    if (!industry) return [];
    return presets
      .filter((p) => p.industry === industry)
      .map((p) => p.subsector)
      .filter(Boolean)
      .sort();
  }, [presets, industry]);

  useEffect(() => {
    if (!industry) {
      if (subsector) setSubsector("");
      return;
    }
    if (subsector && !subsectorsForIndustry.includes(subsector)) {
      setSubsector("");
    }
  }, [industry, subsector, subsectorsForIndustry]);

  // Transform goals text → outcomes array
  const outcomes = useMemo(() => {
    return goalsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(goal => ({
        description: goal,
        measurement: "" // Can be filled later in Step 3
      }));
  }, [goalsText]);

  const canContinue =
    topic.trim() &&
    industry.trim() &&
    subsector.trim() &&
    region.trim() &&
    title.trim() &&
    problem.trim();

  // ===== NEW HELPER FUNCTIONS =====
  
  function addStakeholder() {
    setStakeholders([...stakeholders, { name: "", role: "Contributor", organization: "" }]);
  }
  
  function updateStakeholder(index, field, value) {
    const updated = [...stakeholders];
    updated[index] = { ...updated[index], [field]: value };
    setStakeholders(updated);
  }
  
  function removeStakeholder(index) {
    setStakeholders(stakeholders.filter((_, i) => i !== index));
  }
  
  function addMilestone() {
    setMilestones([...milestones, { name: "", targetDate: "" }]);
  }
  
  function updateMilestone(index, field, value) {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  }
  
  function removeMilestone(index) {
    setMilestones(milestones.filter((_, i) => i !== index));
  }

  function handleContinue() {
    if (!canContinue) return;

    // ===== BUILD UNIVERSAL DATA STRUCTURE =====
    const universalData = {
      context: {
        topic,
        industry,
        subsector,
        region
      },
      project: {
        title,
        type: projectType,
        sponsor,
        manager,
        startDate,
        endDate
      },
      organization: {
        name: organizationName,
        department,
        branch
      },
      businessNeed: {
        problemStatement: problem,
        outcomes
      },
      stakeholders,
      scope: {
        included: scopeIncluded,
        excluded: scopeExcluded
      },
      timeline: {
        majorMilestones: milestones
      },
      financial: {
        capex: capex !== "" ? Number(capex) : undefined,
        opex_annual: opex !== "" ? Number(opex) : undefined,
        currency: "CAD"
      }
    };
    
    // Validate universal data
    try {
      UniversalProjectSchema.parse(universalData);
      console.log("[Step1Context] Universal data validated successfully");
    } catch (err) {
      console.error("[Step1Context] Validation failed:", err);
      alert("Please fill all required fields correctly");
      return;
    }

    // ===== BACKWARD COMPATIBLE PAYLOAD =====
    // Keep old structure + add universal
    const payload = {
      // OLD FORMAT (for backward compatibility)
      topic,
      industry,
      subsector,
      sector: industry, // Alias
      subSector: subsector, // Alias
      region,
      inputs: {
        title,
        sponsor,
        manager,
        startDate,
        endDate,
        problem,
        goals: outcomes.map(o => o.description), // Keep as array
        capex: capex !== "" ? Number(capex) : undefined,
        opex_annual: opex !== "" ? Number(opex) : undefined
      },
      
      // NEW FORMAT (universal)
      universal: universalData
    };
    
    console.log("[Step1Context] Payload:", payload);
    onNext?.(payload);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Step 1 — Project Identity</h2>
          <p className="text-sm text-slate-600">
            Fill once, use everywhere. This data will pre-populate all documents you generate.
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Back
          </button>
        )}
      </header>

      {/* ===== CONTEXT SECTION (UNCHANGED) ===== */}
      <div className="rounded-2xl border p-4 bg-white space-y-3">
        <h3 className="font-semibold">Research & Compliance Context</h3>

        <div className="grid sm:grid-cols-4 gap-4">
          <Field id="fg-topic" label="Topic *">
            <input
              id="fg-topic"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Procurement modernization"
            />
          </Field>

          <Field id="fg-industry" label="Industry *">
            <select
              id="fg-industry"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setSubsector("");
              }}
            >
              <option value="">Select an industry…</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </Field>

          <Field id="fg-subsector" label="Subsector *">
            <select
              id="fg-subsector"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white disabled:bg-slate-50"
              value={subsector}
              onChange={(e) => setSubsector(e.target.value)}
              disabled={!industry}
            >
              <option value="">{industry ? "Select a subsector…" : "Select an industry first…"}</option>
              {subsectorsForIndustry.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </Field>

          <Field id="fg-region" label="Region *">
            <input
              id="fg-region"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., Canada"
            />
          </Field>
        </div>
      </div>

      {/* ===== PROJECT BASICS (ENHANCED) ===== */}
      <div className="rounded-2xl border p-4 bg-white space-y-3">
        <h3 className="font-semibold">Project Basics</h3>

        <Field id="fg-title" label="Project title *">
          <input
            id="fg-title"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Procurement modernization program"
          />
        </Field>
        
        {/* 🆕 NEW: Project Type */}
        <Field id="fg-type" label="Project type">
          <select
            id="fg-type"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="process_improvement">Process Improvement</option>
            <option value="new_development">New Development</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="compliance">Compliance</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <div className="text-[11px] text-slate-500 mt-1">
            Helps with risk assessment and compliance validation
          </div>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="fg-sponsor" label="Sponsor">
            <input
              id="fg-sponsor"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder="e.g., Ministry / Hospital / Bank"
            />
          </Field>
          <Field id="fg-manager" label="Project Manager">
            <input
              id="fg-manager"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              placeholder="e.g., Olivier Betu"
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="fg-start" label="Start date">
            <input
              id="fg-start"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field id="fg-end" label="Finish date">
            <input
              id="fg-end"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>

        <Field id="fg-problem" label="Problem (brief) *">
          <textarea
            id="fg-problem"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={4}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Briefly describe the problem this project solves"
          />
        </Field>

        <Field id="fg-goals" label="Goals / Outcomes (comma-separated) *">
          <input
            id="fg-goals"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            placeholder="e.g., Reduce cycle time, Improve transparency, Strengthen compliance"
          />
          <div className="text-[11px] text-slate-500 mt-1">
            These will be converted to Success KPIs in the business case
          </div>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="fg-capex" label="CapEx (USD)">
            <input
              id="fg-capex"
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={capex}
              onChange={(e) => setCapex(e.target.value)}
              placeholder="e.g., 2400000"
            />
          </Field>
          <Field id="fg-opex" label="OpEx annual (USD)">
            <input
              id="fg-opex"
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={opex}
              onChange={(e) => setOpex(e.target.value)}
              placeholder="e.g., 350000"
            />
          </Field>
        </div>
      </div>
      
      {/* ===== 🆕 OPTIONAL SECTIONS TOGGLE ===== */}
      <div className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm font-semibold text-slate-700">
            Additional Details (Optional)
          </div>
          <div className="text-xs text-slate-500">
            Add organization, scope, stakeholders, and milestones for richer documents
          </div>
        </div>
        <button
          onClick={() => setShowOptionalSections(!showOptionalSections)}
          className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm"
        >
          {showOptionalSections ? "Hide" : "Show"} Optional Fields
        </button>
      </div>
      
      {showOptionalSections && (
        <>
          {/* ===== 🆕 ORGANIZATION SECTION ===== */}
          <div className="rounded-2xl border p-4 bg-white space-y-3">
            <h3 className="font-semibold">Organization</h3>
            <p className="text-xs text-slate-600">
              These details help create more professional documents
            </p>
            
            <Field id="fg-org-name" label="Organization name">
              <input
                id="fg-org-name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g., Health Canada"
              />
            </Field>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="fg-dept" label="Department">
                <input
                  id="fg-dept"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Policy & Programs"
                />
              </Field>
              
              <Field id="fg-branch" label="Branch">
                <input
                  id="fg-branch"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g., Infrastructure"
                />
              </Field>
            </div>
          </div>
          
          {/* ===== 🆕 SCOPE SECTION ===== */}
          <div className="rounded-2xl border p-4 bg-white space-y-3">
            <h3 className="font-semibold">High-Level Scope (Brief)</h3>
            <p className="text-xs text-slate-600">
              Just bullet points. You can refine these in the document wizard.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="fg-scope-in" label="Included in scope">
                <textarea
                  id="fg-scope-in"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  value={scopeIncluded}
                  onChange={(e) => setScopeIncluded(e.target.value)}
                  placeholder={"• Claims processing for Program X\n• Web portal for clients"}
                />
              </Field>
              
              <Field id="fg-scope-out" label="Out of scope">
                <textarea
                  id="fg-scope-out"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  value={scopeExcluded}
                  onChange={(e) => setScopeExcluded(e.target.value)}
                  placeholder={"• Mobile app (future phase)\n• Programs Y and Z"}
                />
              </Field>
            </div>
          </div>
          
          {/* ===== 🆕 STAKEHOLDERS SECTION ===== */}
          <div className="rounded-2xl border p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Key Stakeholders</h3>
                <p className="text-xs text-slate-600">
                  Add main project stakeholders (2-5 recommended)
                </p>
              </div>
              <button
                onClick={addStakeholder}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Stakeholder
              </button>
            </div>
            
            {stakeholders.length > 0 && (
              <div className="space-y-2">
                {stakeholders.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Name"
                      value={s.name}
                      onChange={(e) => updateStakeholder(idx, 'name', e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
                      value={s.role}
                      onChange={(e) => updateStakeholder(idx, 'role', e.target.value)}
                    >
                      <option value="Sponsor">Sponsor</option>
                      <option value="Owner">Owner</option>
                      <option value="Contributor">Contributor</option>
                      <option value="Consulted">Consulted</option>
                      <option value="Informed">Informed</option>
                    </select>
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Organization (optional)"
                      value={s.organization || ""}
                      onChange={(e) => updateStakeholder(idx, 'organization', e.target.value)}
                    />
                    <button
                      onClick={() => removeStakeholder(idx)}
                      className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* ===== 🆕 MILESTONES SECTION ===== */}
          <div className="rounded-2xl border p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Major Milestones</h3>
                <p className="text-xs text-slate-600">
                  Add 3-5 key project milestones
                </p>
              </div>
              <button
                onClick={addMilestone}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Milestone
              </button>
            </div>
            
            {milestones.length > 0 && (
              <div className="space-y-2">
                {milestones.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 items-start">
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Milestone name"
                      value={m.name}
                      onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                    />
                    <input
                      type="date"
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      value={m.targetDate || ""}
                      onChange={(e) => updateMilestone(idx, 'targetDate', e.target.value)}
                    />
                    <button
                      onClick={() => removeMilestone(idx)}
                      className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== CONTINUE BUTTON ===== */}
      <div className="pt-2 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          * Required fields
        </div>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          Continue to Document Selection
        </button>
      </div>
    </div>
  );
}

function Field({ id, label, children }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
