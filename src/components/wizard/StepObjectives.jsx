import React from "react";
import { Input } from "./fields";

export function StepObjectives({ data, setData }) {
  const list = data.objectives || [];

  const update = (i, patch) =>
    setData((d) => {
      const copy = [...(d.objectives || [])];
      copy[i] = { ...copy[i], ...patch };
      return { ...d, objectives: copy };
    });

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-slate-500">
          Add at least one objective (text, metric, target).
        </p>
      )}
      {list.map((o, i) => (
        <div
          key={o.id ?? o.text ?? `${i}`}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <Input
            label={`Objective ${i + 1}`}
            value={o?.text || ""}
            onChange={(v) => update(i, { text: v })}
            required
          />
          <Input
            label="Metric"
            value={o?.metric || ""}
            onChange={(v) => update(i, { metric: v })}
            required
          />
          <Input
            label="Target"
            value={o?.target || ""}
            onChange={(v) => update(i, { target: v })}
            required
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          onClick={() =>
            setData((d) => ({
              ...d,
              objectives: [
                ...(d.objectives || []),
                { id: `O${list.length + 1}`, text: "", metric: "", target: "" },
              ],
            }))
          }
          className="rounded-xl border px-3 py-2 hover:bg-slate-50"
        >
          + Add Objective
        </button>
        {!!list.length && (
          <button
            onClick={() =>
              setData((d) => ({ ...d, objectives: list.slice(0, -1) }))
            }
            className="rounded-xl border px-3 py-2 hover:bg-slate-50"
          >
            − Remove last
          </button>
        )}
      </div>
    </div>
  );
}
