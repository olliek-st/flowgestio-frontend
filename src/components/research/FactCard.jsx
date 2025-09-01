// src/components/research/FactCard.jsx
import React from "react";

export default function FactCard({ fact, onCopy }) {
  const { claim, url, snippet, source = "", published, confidence } = fact || {};

  const domain =
    typeof source === "string"
      ? source
      : (source?.domain || (url ? new URL(url).hostname : ""));

  const date = published ? new Date(published).toLocaleDateString() : null;

  return (
    <div className="border rounded-2xl p-4 hover:shadow-sm transition">
      <p className="text-sm leading-6">{claim}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        {domain && <span className="px-2 py-0.5 rounded-full bg-slate-100">{domain}</span>}
        {date && <span>• {date}</span>}
        {typeof confidence === "number" && <span>• Confidence: {Math.round(confidence * 100)}%</span>}
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="underline">
            View source
          </a>
        )}
        <button onClick={onCopy} className="ml-auto underline">
          Copy citation
        </button>
      </div>

      {snippet && <p className="mt-2 text-xs text-slate-500 line-clamp-3">{snippet}</p>}
    </div>
  );
}
