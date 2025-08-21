import React, { useState } from "react";
import { Input } from "./fields";

export function StepMilestonesScope({ data, setData }) {
  const ms = data.milestones || [];

  const updateMs = (i, patch) =>
    setData((d) => {
      const copy = [...(d.milestones || [])];
      copy[i] = { ...copy[i], ...patch };
      return { ...d, milestones: copy };
    });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-medium mb-2">Milestones</h3>
        {ms.map((m, i) => (
          <div
            key={m.id ?? m.name ?? `${i}`}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2"
          >
            <Input
              label={`Milestone ${i + 1}`}
              value={m?.name || ""}
              onChange={(v) => updateMs(i, { name: v })}
              required
            />
            <Input
              type="date"
              label="Date"
              value={m?.date || ""}
              onChange={(v) => updateMs(i, { date: v })}
              required
            />
            <Input
              label="ID (optional)"
              value={m?.id || ""}
              onChange={(v) => updateMs(i, { id: v })}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={() =>
              setData((d) => ({
                ...d,
                milestones: [
                  ...(d.milestones || []),
                  { id: `M${ms.length + 1}`, name: "", date: "" },
                ],
              }))
            }
            className="rounded-xl border px-3 py-2 hover:bg-slate-50"
          >
            + Add Milestone
          </button>
          {!!ms.length && (
            <button
              onClick={() =>
                setData((d) => ({ ...d, milestones: ms.slice(0, -1) }))
              }
              className="rounded-xl border px-3 py-2 hover:bg-slate-50"
            >
              − Remove last
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">High-Level Scope</h3>
        <TagInput
          label="Inclusions"
          items={data.inclusions || []}
          onChange={(items) => setData((d) => ({ ...d, inclusions: items }))}
        />
        <TagInput
          label="Exclusions"
          items={data.exclusions || []}
          onChange={(items) => setData((d) => ({ ...d, exclusions: items }))}
        />
      </div>
    </div>
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
        <input
          className="flex-1 rounded-xl border px-3 py-2"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          onClick={add}
          className="rounded-xl border px-3 py-2 hover:bg-slate-50"
        >
          Add
        </button>
      </div>
      {!!items?.length && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((t, i) => (
            <li
              key={`${t}-${i}`}
              className="px-2 py-1 rounded-lg bg-slate-100 text-sm"
            >
              {t}{" "}
              <button
                onClick={() => remove(i)}
                className="text-slate-500 hover:text-slate-700"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
