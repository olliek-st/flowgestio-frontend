import React from "react";

export default function CharterPreview({ vm }) {
  if (!vm?.charter) return <p>No data yet</p>;

  const c = vm.charter;

  return (
    <div className="prose max-w-none">
      <h1>Project Charter</h1>

      <section>
        <h2>Business Case</h2>
        <p>{c.businessCase}</p>
      </section>

      <section>
        <h2>Objectives</h2>
        <ol>
          {c.objectives.map(o => (
            <li key={o.id}>{o.text} ({o.metric}: {o.target})</li>
          ))}
        </ol>
      </section>

      <section>
        <h2>High-Level Scope</h2>
        <p><strong>Inclusions:</strong> {c.highLevelScope?.inclusions?.join(", ")}</p>
        <p><strong>Exclusions:</strong> {c.highLevelScope?.exclusions?.join(", ")}</p>
      </section>

      <section>
        <h2>Milestones</h2>
        <ul>
          {c.milestones.map(m => (
            <li key={m.id}>{m.name} ({m.date})</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Initial Risks</h2>
        <ul>
          {c.risks.map(r => (
            <li key={r.id}>{r.cause} → {r.event} → {r.impactDesc}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Stakeholders</h2>
        <ul>
          {c.stakeholders.map(s => (
            <li key={s.id}>{s.name} – {s.role} (Interest {s.interest}, Influence {s.influence})</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
