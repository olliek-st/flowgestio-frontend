// src/components/CharterPreviewPolished.jsx
import React from "react";

export default function CharterPreviewPolished({ vm }) {
  if (!vm?.charter) return null;
  const c = vm.charter;

  const money = (n, cur = "CAD") =>
    typeof n === "number"
      ? n.toLocaleString(undefined, { style: "currency", currency: cur })
      : "";

  // Stable key helper (falls back gracefully)
  const k = (item, idx, ...candidates) =>
    candidates.find((v) => v != null && v !== "") ?? `${idx}-${JSON.stringify(item)}`;

  return (
    // CSS print hooks target this id
    <article id="charter-doc" className="mx-auto max-w-[850px] bg-white p-8 rounded-2xl shadow-sm border">
      {/* Title block */}
      <header className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Project Charter — {vm.header.name}
        </h1>
        <p className="text-sm text-slate-500">
          Start: {vm.header.start} • Finish: {vm.header.finish}
          {vm.header.pm ? ` • PM: ${vm.header.pm}` : ""}
          {vm.header.sponsor ? ` • Sponsor: ${vm.header.sponsor}` : ""}
        </p>
      </header>

      {/* 1. Project Purpose */}
      {c.projectPurpose && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">1. Project Purpose</h2>
          <p className="leading-relaxed">{c.projectPurpose}</p>
        </section>
      )}

      {/* 2. Objectives */}
      {Array.isArray(c.objectives) && c.objectives.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">2. Objectives</h2>
          <ol className="list-decimal pl-5 space-y-1">
            {c.objectives.map((o, idx) => (
              <li key={k(o, idx, o.id, o.text)}>
                <span className="font-medium">{o.text}</span> — Metric: {o.metric}; Target: {o.target}
                {o.deadline ? `; Deadline: ${o.deadline}` : ""}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 3. High-Level Requirements */}
      {Array.isArray(c.highLevelRequirements) && c.highLevelRequirements.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">3. High‑Level Requirements</h2>
          <ul className="list-disc pl-5">
            {c.highLevelRequirements.map((r, idx) => (
              <li key={k(r, idx, r)}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. High-Level Scope */}
      {(c.scope?.inclusions?.length || c.scope?.exclusions?.length) ? (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">4. High‑Level Scope</h2>

          {Array.isArray(c.scope?.inclusions) && c.scope.inclusions.length > 0 && (
            <div className="mb-2">
              <h3 className="font-medium">Inclusions</h3>
              <ul className="list-disc pl-5">
                {c.scope.inclusions.map((s, idx) => (
                  <li key={k(s, idx, s)}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(c.scope?.exclusions) && c.scope.exclusions.length > 0 && (
            <div>
              <h3 className="font-medium">Exclusions</h3>
              <ul className="list-disc pl-5">
                {c.scope.exclusions.map((s, idx) => (
                  <li key={k(s, idx, s)}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {/* 5. Success Criteria */}
      {Array.isArray(c.successCriteria) && c.successCriteria.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">5. Success Criteria</h2>
          <ul className="list-disc pl-5">
            {c.successCriteria.map((s, idx) => (
              <li key={k(s, idx, s)}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 6. Assumptions & Constraints */}
      {(c.assumptions?.length || c.constraints?.length) ? (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">6. Assumptions & Constraints</h2>
          {Array.isArray(c.assumptions) && c.assumptions.length > 0 && (
            <div className="mb-2">
              <h3 className="font-medium">Assumptions</h3>
              <ul className="list-disc pl-5">
                {c.assumptions.map((a, idx) => (
                  <li key={k(a, idx, a)}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(c.constraints) && c.constraints.length > 0 && (
            <div>
              <h3 className="font-medium">Constraints</h3>
              <ul className="list-disc pl-5">
                {c.constraints.map((v, idx) => (
                  <li key={k(v, idx, v)}>{v}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {/* 7. Milestones */}
      {Array.isArray(c.milestones) && c.milestones.length > 0 && (
        <section className="mb-6 break-before-page">
          <h2 className="text-lg font-semibold mb-2">7. Milestones</h2>
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 border-b">ID</th>
                <th className="text-left p-2 border-b">Milestone</th>
                <th className="text-left p-2 border-b">Date</th>
              </tr>
            </thead>
            <tbody>
              {c.milestones.map((m, idx) => (
                <tr key={k(m, idx, m.id, m.name, m.date)} className="odd:bg-white even:bg-slate-50/40">
                  <td className="p-2 border-b">{m.id}</td>
                  <td className="p-2 border-b">{m.name}</td>
                  <td className="p-2 border-b">{m.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 8. Initial Risks */}
      {Array.isArray(c.risks) && c.risks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">8. Initial Risks</h2>
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 border-b">ID</th>
                <th className="text-left p-2 border-b">Cause</th>
                <th className="text-left p-2 border-b">Event</th>
                <th className="text-left p-2 border-b">Impact</th>
              </tr>
            </thead>
            <tbody>
              {c.risks.map((r, idx) => (
                <tr key={k(r, idx, r.id, r.event)} className="odd:bg-white even:bg-slate-50/40">
                  <td className="p-2 border-b">{r.id}</td>
                  <td className="p-2 border-b">{r.cause}</td>
                  <td className="p-2 border-b">{r.event}</td>
                  <td className="p-2 border-b">{r.impactDesc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 9. Stakeholders */}
      {Array.isArray(c.stakeholders) && c.stakeholders.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">9. Stakeholders</h2>
          <ul className="list-disc pl-5">
            {c.stakeholders.map((s, idx) => (
              <li key={k(s, idx, s.id, s.name)}>
                <span className="font-medium">{s.name}</span> — {s.role} (Interest {s.interest}, Influence {s.influence})
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 10. Budget Summary */}
      {c.budgetSummary && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">10. Budget Summary</h2>
          <table className="text-sm">
            <tbody>
              <tr><td className="pr-4 py-1 text-slate-600">CapEx</td><td>{money(c.budgetSummary.capex, c.budgetSummary.currency)}</td></tr>
              <tr><td className="pr-4 py-1 text-slate-600">OpEx</td><td>{money(c.budgetSummary.opex, c.budgetSummary.currency)}</td></tr>
              <tr><td className="pr-4 py-1 text-slate-600">Contingency</td><td>{money(c.budgetSummary.contingency, c.budgetSummary.currency)}</td></tr>
              <tr><td className="pr-4 py-1 font-medium">Total</td><td className="font-medium">{money(c.budgetSummary.total, c.budgetSummary.currency)}</td></tr>
            </tbody>
          </table>
        </section>
      )}

      {/* 11. Project Manager Authority */}
      {c.pmAuthority && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">11. Project Manager Authority</h2>
          <p className="leading-relaxed">{c.pmAuthority}</p>
        </section>
      )}

      {/* 12. Approvals */}
      {c.approvals && (
        <section className="mb-2">
          <h2 className="text-lg font-semibold mb-2">12. Authorization & Approvals</h2>
          <table className="w-full text-sm border border-slate-200">
            <tbody>
              <tr>
                <td className="p-2 border-b w-1/3 text-slate-600">Sponsor</td>
                <td className="p-2 border-b">{c.approvals.sponsorName} — {c.approvals.sponsorRole}</td>
              </tr>
              <tr>
                <td className="p-2 border-b text-slate-600">Project Manager</td>
                <td className="p-2 border-b">{c.approvals.pmName}</td>
              </tr>
              <tr>
                <td className="p-2 text-slate-600">Approval Date</td>
                <td className="p-2">{c.approvals.approvalDate}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Footer note */}
      <footer className="mt-8 text-xs text-slate-400">
        Generated preview • FlowGestio
      </footer>
    </article>
  );
}
