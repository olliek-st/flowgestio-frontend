import React from "react";

export function Stepper({ step, setStep, labels }) {
  return (
    <ol className="flex flex-wrap gap-2 text-sm">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        return (
          <li key={`${label}-${i}`}>
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
