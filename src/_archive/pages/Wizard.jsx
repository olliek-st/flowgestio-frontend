// src/pages/Wizard.jsx
import React, { useMemo, useState, useEffect } from "react";
import { buildNumbered } from "../lib/docs/viewModel";
import { demoTree } from "../data/demoPackage";
import CharterPreviewPolished from "../components/CharterPreviewPolished.jsx";

// ✅ import the external, AI-enabled components
import { Stepper } from "../components/wizard/Stepper.jsx";
import { StepProject } from "../components/wizard/StepProject.jsx";
import { StepObjectives } from "../components/wizard/StepObjectives.jsx";
import { StepMilestonesScope } from "../components/wizard/StepMilestonesScope.jsx";

const STORAGE_KEY = "fg_wizard_demo_v1";

/* ---------- storage helpers ---------- */
const loadDraft = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
};
const saveDraft = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

export default function Wizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(() => loadDraft());

  // autosave
  useEffect(() => { saveDraft(data); }, [data]);

  // build RAW from wizard inputs (PARTIAL charter for demo)
  const raw = useMemo(() => {
    const project = {
      name: data.projectName || "Untitled Project",
      dates: { start: data.startDate || "", finish: data.finishDate || "" },
      pm: data.pm || "",
      sponsor: data.sponsor || "",
    };
    const charter = {
      projectPurpose: data.projectPurpose || "",
      objectives: (data.objectives || []).filter(o => o?.text && o?.metric && o?.target),
      highLevelScope: {
        inclusions: (data.inclusions || []).filter(Boolean),
        exclusions: (data.exclusions || []).filter(Boolean),
      },
      milestones: (data.milestones || []).filter(m => m?.name && m?.date),
      initialRisks: [],
      stakeholders: [],
      successCriteria: [],
      assumptions: [],
      constraints: [],
    };
    return { project, charter };
  }, [data]);

  const { vm } = useMemo(() => buildNumbered(raw, demoTree), [raw]);

  // simple validation
  const validProject =
    !!data.projectName?.trim() && !!data.startDate?.trim() && !!data.finishDate?.trim();
  const dateError =
    data.startDate && data.finishDate && data.finishDate < data.startDate
      ? "Finish date cannot be before start date."
      : "";

  const validObjectives = (data.objectives || []).some(o => o?.text && o?.metric && o?.target);

  // helpers
  const reset = () => setData({});
  const prefill = () => setData({
    projectName: "Mobile Health Pilot",
    pm: "Olivier Betu", sponsor: "City of Sudbury – Public Health",
    startDate: "2025-01-15", finishDate: "2026-12-15",
    projectPurpose: "Provide accessible primary care to underserved communities via mobile clinics.",
    objectives: [
      { id: "O1", text: "Deploy two mobile units", metric: "units", target: "2 by Mar 2026" },
      { id: "O2", text: "Increase capacity", metric: "patients/quarter", target: "≥1,200 by Q4 2026" },
    ],
    milestones: [{ id: "M1", name: "Funding approval", date: "2025-02-28" }],
    inclusions: ["Mobile clinic procurement", "Staffing & training"],
    exclusions: ["Inpatient services"],
  });

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FlowGestio — Wizard Demo</h1>
        <p className="text-sm text-slate-500">
          Want to see a finished document?{" "}
          <a href="/sample" className="text-blue-600 underline">View Sample Output</a>
        </p>
        <div className="flex gap-2">
          <button onClick={prefill} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">Prefill</button>
          <button onClick={reset} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">Reset</button>
          <a href="/" className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">Back</a>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: wizard */}
        <div className="rounded-2xl border bg-white p-5 space-y-5">
          <Stepper step={step} setStep={setStep} labels={["Project", "Objectives", "Milestones & Scope"]} />

          {step === 1 && (
            <StepProject data={data} setData={setData} dateError={dateError} />
          )}
          {step === 2 && (
            <StepObjectives data={data} setData={setData} />
          )}
          {step === 3 && (
            <StepMilestonesScope data={data} setData={setData} />
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              disabled={step === 1}
            >
              Back
            </button>
            <div className="text-sm text-slate-500">
              {step === 1 && (!validProject || dateError) && "Enter project name & valid dates."}
              {step === 2 && !validObjectives && "Add at least one objective."}
            </div>
            <button
              onClick={() => {
                if (step === 1 && (!validProject || dateError)) return;
                if (step === 2 && !validObjectives) return;
                setStep(s => Math.min(3, s + 1));
              }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {step < 3 ? "Next" : "Done"}
            </button>
          </div>

          <p className="text-xs text-slate-500 pt-2">
            This demo generates a **partial** charter (purpose, objectives, scope, milestones).
            Join the beta to unlock the full generator (risks, stakeholders, budget, approvals, etc.).
          </p>
        </div>

        {/* RIGHT: live preview */}
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500 mb-3">Live preview (updates as you type)</p>
          <CharterPreviewPolished vm={vm} />
        </div>
      </div>
    </main>
  );
}
