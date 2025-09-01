// src/components/wizard/steps/Step1Context.jsx
import React, { useMemo, useState, useEffect } from "react";

export default function Step1Context({ initial = {}, onNext, onBack }) {
  // Context used by research
  const [topic, setTopic] = useState(initial.topic || "");
  const [industry, setIndustry] = useState(initial.industry || "");
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

  useEffect(() => {
    const el = document.getElementById("fg-topic");
    el && el.focus();
  }, []);

  const goals = useMemo(
    () =>
      goalsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [goalsText]
  );

  const canContinue =
    topic.trim() &&
    industry.trim() &&
    region.trim() &&
    title.trim() &&
    problem.trim();

  function handleContinue() {
    if (!canContinue) return;
    const inputs = {
      title,
      sponsor,
      manager,
      startDate,
      endDate,
      problem,
      goals,
      capex: capex !== "" ? Number(capex) : undefined,
      opex_annual: opex !== "" ? Number(opex) : undefined,
    };
    onNext?.({ topic, industry, region, inputs });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Step 1 — Project Context & Inputs</h2>
          <p className="text-sm text-slate-600">
            Enter project specifics (used to generate the document) and the context used to guide research.
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

      {/* Context (guides research) */}
      <div className="rounded-2xl border p-4 bg-white space-y-3">
        <h3 className="font-semibold">Research Context</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field id="fg-topic" label="Topic *">
            <input
              id="fg-topic"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Mobile health pilot"
            />
          </Field>
          <Field id="fg-industry" label="Industry *">
            <input
              id="fg-industry"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Healthcare"
            />
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

      {/* Project specifics (drive generation) */}
      <div className="rounded-2xl border p-4 bg-white space-y-3">
        <h3 className="font-semibold">Project Inputs</h3>

        <Field id="fg-title" label="Project title *">
          <input
            id="fg-title"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Mobile Health Pilot"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="fg-sponsor" label="Sponsor">
            <input
              id="fg-sponsor"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder="e.g., City of Sudbury – Public Health"
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

        <Field id="fg-goals" label="Goals (comma-separated)">
          <input
            id="fg-goals"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            placeholder="e.g., Improve access, Reduce wait times"
          />
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

      <div className="pt-2 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
        >
          Continue
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
