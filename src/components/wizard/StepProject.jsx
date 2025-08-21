// src/components/wizard/StepProject.jsx
import React, { useMemo, useState } from "react";
import { Input, TextArea } from "./fields";
import { AiBar } from "./AiBar";
import DiffView from "../common/DiffView";
import { aiSuggest } from "../../lib/ai/client";

export function StepProject({ data, setData, dateError }) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState("");

  const projectInputs = useMemo(() => ({
    project: {
      name: data.projectName || "",
      pm: data.pm || "",
      sponsor: data.sponsor || "",
      dates: { start: data.startDate || "", finish: data.finishDate || "" },
    },
    currentPurpose: data.projectPurpose || "",
    objectives: data.objectives || [],
  }), [data]);

  async function runSuggest(payload) {
    try {
      setBusy(true);
      setError("");
      const res = await aiSuggest(payload); // { text, model, promptHash }
      setSuggestion({
        text: res.text,
        meta: {
          model: res.model,
          promptHash: res.promptHash,
          createdAt: new Date().toISOString(),
          source: payload.intent === "rewrite" ? "refine" : "draft",
        },
      });
    } catch (e) {
      const msg = typeof e === "string" ? e : (e?.message || "AI request failed");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const onAccept = () => {
    if (!suggestion?.text) return;
    setData((d) => ({
      ...d,
      projectPurpose: suggestion.text,
      projectPurpose_ai: suggestion.meta,
    }));
    setSuggestion(null);
  };

  const disabled =
    busy ||
    !!dateError ||
    !((data.projectName || "").trim()) ||
    !((data.startDate || "").trim()) ||
    !((data.finishDate || "").trim());

  return (
    <div className="space-y-4">
      {/* Top fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Project name" value={data.projectName || ""} onChange={(v) => setData((d) => ({ ...d, projectName: v }))} required />
        <Input label="Project Manager" value={data.pm || ""} onChange={(v) => setData((d) => ({ ...d, pm: v }))} />
        <Input label="Sponsor" value={data.sponsor || ""} onChange={(v) => setData((d) => ({ ...d, sponsor: v }))} />
        <Input type="date" label="Start date" value={data.startDate || ""} onChange={(v) => setData((d) => ({ ...d, startDate: v }))} required />
        <Input type="date" label="Finish date" value={data.finishDate || ""} onChange={(v) => setData((d) => ({ ...d, finishDate: v }))} required />
      </div>
      {dateError && <p className="text-sm text-red-600">{dateError}</p>}

      {/* Purpose + AI controls */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm text-slate-700 mt-2">Project purpose (brief)</span>

          {/* Polished AI button group */}
          <div className="flex flex-wrap gap-2">
            <AiBar
              busy={disabled} // disables when busy or invalid basics
              onDraft={() =>
                runSuggest({
                  intent: "draft",
                  section: "charter.projectPurpose",
                  inputs: projectInputs,
                  style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.3 },
                  constraints: { maxWords: 120 },
                })
              }
              onImprove={() =>
                runSuggest({
                  intent: "rewrite",
                  section: "charter.projectPurpose",
                  inputs: { currentPurpose: data.projectPurpose },
                  style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.3 },
                  constraints: { maxWords: 120 },
                })
              }
              onConcise={() =>
                runSuggest({
                  intent: "rewrite",
                  section: "charter.projectPurpose",
                  inputs: { currentPurpose: data.projectPurpose },
                  style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.2 },
                  constraints: { maxWords: 90 },
                })
              }
              onLonger={() =>
                runSuggest({
                  intent: "rewrite",
                  section: "charter.projectPurpose",
                  inputs: { currentPurpose: data.projectPurpose },
                  style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.35 },
                  constraints: { maxWords: 160 },
                })
              }
              onFormal={() =>
                runSuggest({
                  intent: "rewrite",
                  section: "charter.projectPurpose",
                  inputs: { currentPurpose: data.projectPurpose },
                  style: { tone: "formal", readingLevel: "C1", region: "EN-CA", temperature: 0.3 },
                  constraints: { maxWords: 120 },
                })
              }
            />
          </div>
        </div>

        <TextArea
          label=""
          value={data.projectPurpose || ""}
          onChange={(v) => setData((d) => ({ ...d, projectPurpose: v }))}
        />

        {/* Status row */}
        <div className="min-h-[24px]" aria-live="polite">
          {busy && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
              Generating…
            </div>
          )}
          {!!error && !busy && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Diff viewer */}
        {suggestion && (
          <DiffView
            original={data.projectPurpose || ""}
            proposed={suggestion.text}
            onAccept={onAccept}
            onReject={() => setSuggestion(null)}
          />
        )}

        {/* Provenance */}
        {data.projectPurpose_ai && (
          <p className="text-xs text-slate-500">
            AI: {data.projectPurpose_ai.model} ·{" "}
            {new Date(data.projectPurpose_ai.createdAt).toLocaleString()} · prompt{" "}
            {String(data.projectPurpose_ai.promptHash || "").slice(0, 8)}…
          </p>
        )}
      </div>
    </div>
  );
}
