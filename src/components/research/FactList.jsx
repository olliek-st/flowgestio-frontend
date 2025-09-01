// src/components/research/FactList.jsx
import React from "react";
import FactCard from "./FactCard";

function formatCitation(f) {
  const src =
    typeof f?.source === "string"
      ? f.source
      : (f?.source?.domain || (f?.url ? new URL(f.url).hostname : ""));
  const year = f?.published ? new Date(f.published).getFullYear() : "";
  return `${f.claim} — ${src}${year ? ` (${year})` : ""}. ${f.url || ""}`.trim();
}

export default function FactList({ facts = [] }) {
  if (!facts.length) {
    return (
      <div className="text-sm text-slate-500 border rounded-xl p-4">
        No high-confidence facts to show.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {facts.map((f, i) => (
        <li key={f.url ?? i}>
          <FactCard fact={f} onCopy={() => navigator.clipboard.writeText(formatCitation(f))} />
        </li>
      ))}
    </ul>
  );
}
