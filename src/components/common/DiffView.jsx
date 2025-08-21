import React from "react";
import { diffWords } from "diff";

export default function DiffView({ original = "", proposed = "", onAccept, onReject }) {
  const parts = diffWords(original || "", proposed || "");
  return (
    <div className="border rounded-xl p-3 bg-slate-50">
      <div className="text-sm mb-2 text-slate-600">Proposed changes</div>
      <div className="text-[15px] leading-6">
        {parts.map((p, i) => {
          if (p.added) return <mark key={i} className="bg-green-100 rounded px-0.5">{p.value}</mark>;
          if (p.removed) return <del key={i} className="bg-red-50 text-red-700 rounded px-0.5">{p.value}</del>;
          return <span key={i}>{p.value}</span>;
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onAccept} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Accept</button>
        <button onClick={onReject} className="px-3 py-1 rounded-lg border text-sm hover:bg-slate-50">Reject</button>
      </div>
    </div>
  );
}
