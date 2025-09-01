// src/components/wizard/ResearchPanel.jsx
import React from "react";
import { addCitation, removeCitation, list as listCites } from "../../services/citationManager";

export default function ResearchPanel({ insights = [], currentSectionId }) {
  const [added, setAdded] = React.useState(() => new Set());

  function onAdd(i) {
    const id = addCitation(currentSectionId, {
      claim: i.claim, url: i.cite?.url, source: i.cite?.source, published: i.cite?.published
    });
    setAdded(new Set([...added, id]));
  }
  function onRemove(id) {
    removeCitation(id);
    const nx = new Set(added); nx.delete(id); setAdded(nx);
  }

  // Optionally show what’s already attached to this section
  const attached = listCites().filter(c => c.sectionId === currentSectionId);

  return (
    <aside className="border rounded p-3 bg-slate-50">
      <h4 className="font-semibold mb-2">Research suggestions</h4>
      <ul className="space-y-2">
        {insights.map((i, idx) => (
          <li key={idx} className="text-sm">
            <div className="font-medium">{i.claim}</div>
            {i.cite?.url ? <a className="text-blue-600 underline" href={i.cite.url} target="_blank" rel="noreferrer">Source</a> : null}
            <div className="mt-1">
              <button className="px-2 py-1 text-xs bg-emerald-600 text-white rounded" onClick={() => onAdd(i)}>Add citation</button>
            </div>
          </li>
        ))}
      </ul>

      {attached.length ? (
        <>
          <h5 className="font-semibold mt-3">Attached to this section</h5>
          <ul className="space-y-1">
            {attached.map(c => (
              <li key={c.id} className="flex items-center justify-between text-xs">
                <span>{c.claim}</span>
                <button className="px-2 py-0.5 bg-slate-200 rounded" onClick={() => onRemove(c.id)}>Remove</button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
