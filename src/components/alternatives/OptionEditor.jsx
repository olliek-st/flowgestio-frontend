// flowgestio-frontend/src/components/alternatives/OptionEditor.jsx
import React, { useMemo, useState } from "react";
import { OPTION_TYPES } from "./alternativesUtils";

function ListEditor({ label, items, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-sm font-semibold text-slate-800">{label}</div>

      <div className="mt-2 space-y-2">
        {items?.length ? (
          items.map((t, idx) => (
            <div key={`${label}-${idx}`} className="flex items-center gap-2">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={t}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = e.target.value;
                  onChange(next);
                }}
              />
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400 italic">None yet</div>
        )}

        <div className="flex gap-2">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => {
              const v = draft.trim();
              if (!v) return;
              onChange([...(items || []), v]);
              setDraft("");
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OptionEditor({
  option,
  onChange,
  onDraftWithAI, // optional hook later
}) {
  const locked = option?.id === "status_quo" || option?.type === "status_quo";

  const typeLabel = useMemo(() => {
    return OPTION_TYPES.find((t) => t.value === option?.type)?.label || option?.type;
  }, [option?.type]);

  if (!option) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-500">
        Select an option to edit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-500">Editing</div>
            <div className="text-lg font-semibold text-slate-900 truncate">
              {option.name || "Untitled option"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Type: <span className="font-medium text-slate-700">{typeLabel}</span>
              {locked ? " • Required" : ""}
            </div>
          </div>

          <div className="flex gap-2">
            {onDraftWithAI && (
              <button
                type="button"
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
                onClick={() => onDraftWithAI(option)}
              >
                Draft with AI
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-600">Option name</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={option.name}
              onChange={(e) => onChange({ ...option, name: e.target.value })}
              disabled={locked} // keep SQ name stable
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={option.type}
              onChange={(e) => onChange({ ...option, type: e.target.value })}
              disabled={locked} // SQ type must stay SQ
            >
              {OPTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">High-level description</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[110px]"
              value={option.description}
              onChange={(e) => onChange({ ...option, description: e.target.value })}
              placeholder="Describe the option at a comparable (high-level) detail."
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">CAPEX (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={option.capex}
              onChange={(e) => onChange({ ...option, capex: e.target.value })}
              placeholder="e.g., 1200000"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">OPEX / year (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={option.opex}
              onChange={(e) => onChange({ ...option, opex: e.target.value })}
              placeholder="e.g., 450000"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ListEditor
          label="Pros"
          items={option.pros}
          onChange={(pros) => onChange({ ...option, pros })}
          placeholder="Add a pro..."
        />
        <ListEditor
          label="Cons"
          items={option.cons}
          onChange={(cons) => onChange({ ...option, cons })}
          placeholder="Add a con..."
        />
        <div className="lg:col-span-2">
          <ListEditor
            label="Risks"
            items={option.risks}
            onChange={(risks) => onChange({ ...option, risks })}
            placeholder="Add a risk..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-800">Sources (optional)</div>
        <div className="mt-2 space-y-2">
          {(option.sources || []).length ? (
            option.sources.map((s, idx) => (
              <div key={`src-${idx}`} className="flex items-center gap-2">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={s}
                  onChange={(e) => {
                    const next = [...option.sources];
                    next[idx] = e.target.value;
                    onChange({ ...option, sources: next });
                  }}
                  placeholder="https://..."
                />
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() =>
                    onChange({
                      ...option,
                      sources: option.sources.filter((_, i) => i !== idx),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 italic">
              Add citations/links here (Perplexity will later prefill these).
            </div>
          )}

          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => onChange({ ...option, sources: [...(option.sources || []), ""] })}
          >
            + Add source
          </button>
        </div>
      </div>
    </div>
  );
}
