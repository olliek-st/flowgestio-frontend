import React from "react";

export function Input({ label, value, onChange, type = "text", required }) {
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

export function TextArea({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      {label && <span className="text-slate-700">{label}</span>}
      <textarea
        className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[90px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
