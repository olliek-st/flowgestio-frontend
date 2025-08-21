import React, { useMemo, useState, useEffect } from "react";
import { buildNumbered } from "../lib/docs/viewModel";
import { demoTree } from "../data/demoPackage"; // reuse your section tree
import CharterPreviewPolished from "../components/CharterPreviewPolished.jsx";

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
      // keep other sections empty to demonstrate partial generation
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
      { text: "Deploy two mobile units", metric: "units", target: "2 by Mar 2026" },
      { text: "Increase capacity", metric: "patients/quarter", target: "≥1,200 by Q4 2026" },
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
         Want to see a finished document? <a href="/sample" className="text-blue-600 underline">View Sample Output</a>
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
          <Steps step={step} setStep={setStep} />

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

        {/* RIGHT: live preview using the same engine as /demo */}
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500 mb-3">Live preview (updates as you type)</p>
          <CharterPreviewPolished vm={vm} />
        </div>
      </div>
    </main>
  );
}

/* ---------------- components ---------------- */

function Steps({ step, setStep }) {
  const items = ["Project", "Objectives", "Milestones & Scope"];
  return (
    <ol className="flex flex-wrap gap-2 text-sm">
      {items.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        return (
          <li key={label}>
            <button
              onClick={() => setStep(n)}
              className={`px-3 py-1 rounded-xl border ${active ? "bg-blue-600 text-white" : "hover:bg-slate-50"}`}
            >
              {n}. {label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepProject({ data, setData, dateError }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Project name" value={data.projectName || ""} onChange={v => setData(d => ({ ...d, projectName: v }))} required />
        <Input label="Project Manager" value={data.pm || ""} onChange={v => setData(d => ({ ...d, pm: v }))} />
        <Input label="Sponsor" value={data.sponsor || ""} onChange={v => setData(d => ({ ...d, sponsor: v }))} />
        <Input type="date" label="Start date" value={data.startDate || ""} onChange={v => setData(d => ({ ...d, startDate: v }))} required />
        <Input type="date" label="Finish date" value={data.finishDate || ""} onChange={v => setData(d => ({ ...d, finishDate: v }))} required />
      </div>

      {dateError && <p className="text-sm text-red-600">{dateError}</p>}

      <TextArea label="Project purpose (brief)" value={data.projectPurpose || ""} onChange={v => setData(d => ({ ...d, projectPurpose: v }))} />
    </div>
  );
}

function StepObjectives({ data, setData }) {
  const list = data.objectives || [];
  const update = (i, patch) =>
    setData(d => {
      const copy = [...(d.objectives || [])];
      copy[i] = { ...copy[i], ...patch };
      return { ...d, objectives: copy };
    });

  return (
    <div className="space-y-3">
      {(list.length === 0) && <p className="text-sm text-slate-500">Add at least one objective (text, metric, target).</p>}
      {list.map((o, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label={`Objective ${i + 1}`} value={o?.text || ""} onChange={v => update(i, { text: v })} required />
          <Input label="Metric" value={o?.metric || ""} onChange={v => update(i, { metric: v })} required />
          <Input label="Target" value={o?.target || ""} onChange={v => update(i, { target: v })} required />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          onClick={() => setData(d => ({ ...d, objectives: [...(d.objectives || []), { text: "", metric: "", target: "" }] }))}
          className="rounded-xl border px-3 py-2 hover:bg-slate-50"
        >
          + Add Objective
        </button>
        {!!list.length && (
          <button
            onClick={() => setData(d => ({ ...d, objectives: list.slice(0, -1) }))}
            className="rounded-xl border px-3 py-2 hover:bg-slate-50"
          >
          − Remove last
          </button>
        )}
      </div>
    </div>
  );
}

function StepMilestonesScope({ data, setData }) {
  const ms = data.milestones || [];
  const updateMs = (i, patch) =>
    setData(d => {
      const copy = [...(d.milestones || [])];
      copy[i] = { ...copy[i], ...patch };
      return { ...d, milestones: copy };
    });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-medium mb-2">Milestones</h3>
        {ms.map((m, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
            <Input label={`Milestone ${i + 1}`} value={m?.name || ""} onChange={v => updateMs(i, { name: v })} required />
            <Input type="date" label="Date" value={m?.date || ""} onChange={v => updateMs(i, { date: v })} required />
            <Input label="ID (optional)" value={m?.id || ""} onChange={v => updateMs(i, { id: v })} />
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={() => setData(d => ({ ...d, milestones: [...(d.milestones || []), { id: `M${ms.length + 1}`, name: "", date: "" }] }))}
            className="rounded-xl border px-3 py-2 hover:bg-slate-50"
          >
            + Add Milestone
          </button>
          {!!ms.length && (
            <button
              onClick={() => setData(d => ({ ...d, milestones: ms.slice(0, -1) }))}
              className="rounded-xl border px-3 py-2 hover:bg-slate-50"
            >
              − Remove last
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">High‑Level Scope</h3>
        <TagInput
          label="Inclusions"
          items={data.inclusions || []}
          onChange={(items) => setData(d => ({ ...d, inclusions: items }))}
        />
        <TagInput
          label="Exclusions"
          items={data.exclusions || []}
          onChange={(items) => setData(d => ({ ...d, exclusions: items }))}
        />
      </div>
    </div>
  );
}

/* ---------- small UI primitives ---------- */

function Input({ label, value, onChange, type = "text", required }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}{required ? " *" : ""}</span>
      <input
        type={type}
        className="mt-1 w-full rounded-xl border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <textarea
        className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[90px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TagInput({ label, items, onChange }) {
  const [value, setValue] = useState("");
  const add = () => {
    const v = value.trim();
    if (!v) return;
    onChange([...(items || []), v]);
    setValue("");
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="mb-3">
      <span className="block text-sm text-slate-700">{label}</span>
      <div className="flex gap-2 mt-1">
        <input className="flex-1 rounded-xl border px-3 py-2" value={value} onChange={e => setValue(e.target.value)} />
        <button onClick={add} className="rounded-xl border px-3 py-2 hover:bg-slate-50">Add</button>
      </div>
      {!!items?.length && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((t, i) => (
            <li key={i} className="px-2 py-1 rounded-lg bg-slate-100 text-sm">
              {t}{" "}
              <button onClick={() => remove(i)} className="text-slate-500 hover:text-slate-700">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
