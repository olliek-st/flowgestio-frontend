// src/components/wizard/StepProject.jsx
import React, { useState } from "react";
import { Input, TextArea } from "./fields";
import { AiBar } from "./AiBar";
import DiffView from "../common/DiffView";
import { aiSuggest } from "../../lib/ai/client";

export function StepProject({ data, setData, dateError }) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState("");

  const projectInputs = {
    project: {
      name: data.projectName || "",
      pm: data.pm || "",
      sponsor: data.sponsor || "",
      dates: { start: data.startDate || "", finish: data.finishDate || "" },
    },
    currentPurpose: data.projectPurpose || "",
    objectives: data.objectives || [],
  };

  async function runSuggest(payload) {
    try {
      setBusy(true); setError("");
      const res = await aiSuggest(payload);
      setSuggestion({
        text: res.text,
        meta: {
          model: res.model,
          promptHash: res.promptHash,
          createdAt: new Date().toISOString(),
          source: payload.intent === "rewrite" ? "refine" : "userPrompt",
        },
      });
    } catch (e) {
      setError(String(e?.message || e) || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const onAccept = () => {
    setData(d => ({ ...d, projectPurpose: suggestion.text, projectPurpose_ai: suggestion.meta }));
    setSuggestion(null);
  };

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Project purpose (brief)</span>
          <AiBar
            busy={busy}
            onDraft={() => runSuggest({
              intent: "draft",
              section: "charter.projectPurpose",
              inputs: projectInputs,
              style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.3 },
              constraints: { maxWords: 120 },
            })}
            onImprove={() => runSuggest({
              intent: "rewrite",
              section: "charter.projectPurpose",
              inputs: { currentPurpose: data.projectPurpose },
              style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.3 },
              constraints: { maxWords: 120 },
            })}
            onConcise={() => runSuggest({
              intent: "rewrite",
              section: "charter.projectPurpose",
              inputs: { currentPurpose: data.projectPurpose },
              style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.2 },
              constraints: { maxWords: 90 },
            })}
            onLonger={() => runSuggest({
              intent: "rewrite",
              section: "charter.projectPurpose",
              inputs: { currentPurpose: data.projectPurpose },
              style: { tone: "professional", readingLevel: "B2", region: "EN-CA", temperature: 0.3 },
              constraints: { maxWords: 160 },
            })}
            onFormal={() => runSuggest({
              intent: "rewrite",
              section: "charter.projectPurpose",
              inputs: { currentPurpose: data.projectPurpose },
              style: { tone: "formal", readingLevel: "C1", region: "EN-CA", temperature: 0.3 },
              constraints: { maxWords: 120 },
            })}
          />
        </div>

        <TextArea label="" value={data.projectPurpose || ""} onChange={v => setData(d => ({ ...d, projectPurpose: v }))} />

        {busy && <p className="text-sm text-slate-500">Generating…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {suggestion && (
          <DiffView
            original={data.projectPurpose || ""}
            proposed={suggestion.text}
            onAccept={onAccept}
            onReject={() => setSuggestion(null)}
          />
        )}

        {data.projectPurpose_ai && (
          <p className="text-xs text-slate-500">
            AI provenance: {data.projectPurpose_ai.model} ·{" "}
            {new Date(data.projectPurpose_ai.createdAt).toLocaleString()} · prompt{" "}
            {String(data.projectPurpose_ai.promptHash || "").slice(0, 8)}…
          </p>
        )}
      </div>
    </div>
  );
}
