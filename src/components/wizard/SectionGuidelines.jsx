// src/components/wizard/SectionGuidelines.jsx
import React from "react";
import { renderGuidelineParts } from "../../schemas/BC01_SCHEMA.v2";

/**
 * Props:
 * - items: string[]
 * - onOpenReference?: ({ id, kind, ids }) => void
 * - className?: string
 */
export default function SectionGuidelines({ items, onOpenReference, className = "" }) {
  if (!items || items.length === 0) return null;

  return (
    <div className={className}>
      <ul className="space-y-2">
        {items.map((text, i) => (
          <li key={i} className="text-sm text-slate-700 leading-relaxed">
            <GuidelineLine text={text} onOpenReference={onOpenReference} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuidelineLine({ text, onOpenReference }) {
  const parts = renderGuidelineParts(text);

  return (
    <span>
      {parts.map((part, idx) => {
        if (part.type === "text") return <span key={idx}>{part.value}</span>;

        // PMI: part.id is string (e.g. PR-VALUE)
        // TBS: part.ids is number[]
        const handleClick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (typeof onOpenReference !== "function") return;

          if (part.kind === "pmi") {
            onOpenReference({ kind: "pmi", id: part.id });
          } else {
            const primaryId = part.ids?.[0];
            onOpenReference({ kind: "tbs", id: primaryId, ids: part.ids });
          }
        };

        return (
          <button
            key={idx}
            type="button"
            onClick={handleClick}
            className="text-blue-600 hover:underline font-semibold bg-blue-50 px-1 rounded mx-0.5"
            title={part.kind === "pmi" ? `Open PMI reference ${part.id}` : `Open reference ${part.label}`}
          >
            {part.label}
          </button>
        );
      })}
    </span>
  );
}
