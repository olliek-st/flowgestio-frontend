// src/components/wizard/DocumentPreview.jsx
// ✅ Document renderer (Preview/Print) — document-only (no editor helpers)
// ✅ Professional tables + automatic captions with decimal numbering (Table 3.1, 3.2, ...)
// ✅ Special handling for 3.0 Options: formatted summary + deterministic numbering

import React, { useMemo } from "react";

/**
 * Build deterministic table labels in the order sections are rendered.
 * Label format: "Table {major}.{minor}" (e.g., Table 3.1)
 */
function buildTableLabelMap({ sections = [], formData, engineOutput }) {
  const byMajor = new Map(); // major => nextMinor
  const labels = new Map();  // tableKey => label

  const nextLabel = (sectionRef, tableKey) => {
    const major = String(sectionRef || "").split(".")[0] || "1";
    const next = (byMajor.get(major) || 0) + 1;
    byMajor.set(major, next);
    const label = `Table ${major}.${next}`;
    labels.set(tableKey, label);
  };

  const getNarrative = (sid) => {
    const d = formData?.[sid];
    // optionsJson is the current write key for S3.0; narrative is the legacy fallback.
    const txt = typeof d?.optionsJson === "string" ? d.optionsJson
               : typeof d?.narrative  === "string" ? d.narrative
               : "";
    return txt.trim();
  };

  const isOptionsSection = (s) => {
    const sid = s?.id;
    const ref = String(s?.ref || "").trim();
    const title = String(s?.title || "").toLowerCase();
    return (
      ref === "3.0" ||
      sid === "S3_0_OPTIONS" ||
      sid === "S3_0" ||
      sid === "SECTION_3_0" ||
      title.includes("options data entry") ||
      title.includes("options considered")
    );
  };

  const hasValidOptions = (s) => {
    const raw = getNarrative(s.id);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  };

  const hasScoredOptions = Array.isArray(engineOutput?.scoredOptions) && engineOutput.scoredOptions.length > 0;

  // Walk sections in display order; assign labels only to tables that will actually render.
  for (const s of sections) {
    if (isOptionsSection(s) && hasValidOptions(s)) {
      nextLabel(s.ref || "3.0", `${s.id}::options`);
    }

    // These section IDs are from your schema / engine integration.
    if (s?.id === "S3_2_COSTS" && hasScoredOptions) {
      nextLabel(s.ref || "3.2", `${s.id}::main`);
    }
    if (s?.id === "S3_3_CBA" && hasScoredOptions) {
      nextLabel(s.ref || "3.3", `${s.id}::main`);
    }
    if (s?.id === "S3_6_BENCHMARK" && hasScoredOptions) {
      nextLabel(s.ref || "3.6", `${s.id}::main`);
    }
    if (s?.id === "S3_8_PROS_CONS" && hasScoredOptions) {
      nextLabel(s.ref || "3.8", `${s.id}::main`);
    }
  }

  return labels;
}

function depthFromRef(ref) {
  if (!ref) return 1;
  const r = String(ref);
  if (r.toLowerCase().startsWith("phase")) return 1;
  return r.split(".").length;
}

function Heading({ depth, children }) {
  if (depth <= 1) return <h2 className="text-xl font-bold mt-8 mb-3 text-gray-900">{children}</h2>;
  if (depth === 2) return <h3 className="text-lg font-bold mt-6 mb-3 text-gray-800">{children}</h3>;
  if (depth === 3) return <h4 className="text-base font-semibold mt-5 mb-2 text-gray-800">{children}</h4>;
  return <h5 className="text-sm font-semibold mt-4 mb-2 text-gray-700">{children}</h5>;
}

function Caption({ label, title }) {
  if (!label) return null;
  return (
    <div className="text-sm font-semibold mb-2">
      {label} — {title}
    </div>
  );
}

function ProfessionalTable({ headers, rows, className = "" }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full border border-gray-300 bg-white">
        <thead className="bg-gray-100">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, ridx) => (
            <tr key={ridx} className={ridx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {row.map((cell, cidx) => (
                <td key={cidx} className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function money(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

function pct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function OptionsOverview({ section, formData, tableLabels }) {
  // Read optionsJson first (current write key), fall back to narrative (legacy saves).
  const sectionData = formData?.[section.id];
  const narrative =
    typeof sectionData?.optionsJson === "string" ? sectionData.optionsJson :
    typeof sectionData?.narrative   === "string" ? sectionData.narrative   : "";
  const raw = narrative.trim();

  if (!raw) return <p className="text-sm italic text-gray-400">— No options defined yet —</p>;

  let options;
  try {
    options = JSON.parse(raw);
  } catch (e) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
        <div className="text-xs font-semibold text-red-800 mb-1">Options data is not valid JSON</div>
        <div className="text-xs text-red-700">
          Please re-save options using the Form editor. The preview cannot display invalid data.
        </div>
      </div>
    );
  }

  if (!Array.isArray(options) || options.length === 0) {
    return <p className="text-sm italic text-gray-400">— No options defined yet —</p>;
  }

  const count = options.length;

  return (
    <div className="my-4">
      {/* Generic, deterministic intro (no LLM) */}
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        Based on the business need and constraints identified in the previous section, {count} option{count === 1 ? "" : "s"}{" "}
        {count === 1 ? "was" : "were"} identified and retained for comparative analysis. These options represent distinct approaches to addressing the stated problem and are presented descriptively at this stage. Detailed financial and qualitative evaluation is provided in the sections that follow.
      </p>

      <Caption label={tableLabels.get(`${section.id}::options`)} title="Summary of Options" />

      <ProfessionalTable
        headers={["Option", "Description", "CAPEX", "OPEX / year", "Benefits / year"]}
        rows={options.map((opt, idx) => ([
          opt?.name || `Option ${idx + 1}`,
          opt?.description || "—",
          money(opt?.financialInputs?.capex ?? 0),
          money(opt?.financialInputs?.opexAnnual ?? 0),
          money(opt?.financialInputs?.benefitsAnnual ?? 0),
        ]))}
      />
    </div>
  );
}

function CostsTable({ section, engineOutput, tableLabels }) {
  if (!Array.isArray(engineOutput?.scoredOptions) || engineOutput.scoredOptions.length === 0) return null;

  const rows = engineOutput.scoredOptions.map((opt) => {
    const f = opt.financial || {};
    return [
      opt.name || "—",
      f.tco ? money(f.tco) : "—",
      Number.isFinite(f.paybackYears) ? f.paybackYears.toFixed(2) : "—",
      Number.isFinite(opt.financialScore1to5) ? opt.financialScore1to5.toFixed(2) : "—",
    ];
  });

  return (
    <div className="my-4">
      <Caption label={tableLabels.get(`${section.id}::main`)} title="Costs & Total Cost of Ownership" />
      <ProfessionalTable headers={["Option", "TCO (PV)", "Payback (yrs)", "Fin Score (1–5)"]} rows={rows} />
    </div>
  );
}

function FinancialAnalysisTable({ section, engineOutput, tableLabels }) {
  if (!Array.isArray(engineOutput?.scoredOptions) || engineOutput.scoredOptions.length === 0) return null;

  const rows = engineOutput.scoredOptions.map((opt) => {
    const f = opt.financial || {};
    return [
      opt.name || "—",
      Number.isFinite(f.npv) ? money(f.npv) : "—",
      Number.isFinite(f.roi) ? pct(f.roi) : "—",
      Number.isFinite(f.paybackYears) ? f.paybackYears.toFixed(2) : "—",
      Number.isFinite(opt.financialScore1to5) ? opt.financialScore1to5.toFixed(2) : "—",
    ];
  });

  return (
    <div className="my-4">
      <Caption label={tableLabels.get(`${section.id}::main`)} title="Financial Analysis Summary" />
      <ProfessionalTable headers={["Option", "NPV", "ROI", "Payback (yrs)", "Fin Score (1–5)"]} rows={rows} />
    </div>
  );
}

function BenchmarkTable({ section, engineOutput, tableLabels }) {
  if (!Array.isArray(engineOutput?.scoredOptions) || engineOutput.scoredOptions.length === 0) return null;

  const rows = engineOutput.scoredOptions.map((opt) => ([
    opt.name || "—",
    Number.isFinite(opt.financialScore1to5) ? opt.financialScore1to5.toFixed(2) : "—",
    Number.isFinite(opt.strategicScore1to5) ? opt.strategicScore1to5.toFixed(2) : "—",
    Number.isFinite(opt.feasibilityScore1to5) ? opt.feasibilityScore1to5.toFixed(2) : "—",
    Array.isArray(opt.flags) && opt.flags.length > 0 ? opt.flags.join(", ") : "—",
  ]));

  return (
    <div className="my-4">
      <Caption label={tableLabels.get(`${section.id}::main`)} title="Benchmark Signals" />
      <ProfessionalTable headers={["Option", "Fin (1–5)", "Strat (1–5)", "Feas (1–5)", "Flags"]} rows={rows} />
    </div>
  );
}

function ComparativeSummaryTable({ section, engineOutput, tableLabels }) {
  if (!Array.isArray(engineOutput?.scoredOptions) || engineOutput.scoredOptions.length === 0) return null;

  const rows = engineOutput.scoredOptions.map((opt) => ([
    opt.rank ? `#${opt.rank}` : "—",
    opt.name || "—",
    Number.isFinite(opt.financialScore1to5) ? opt.financialScore1to5.toFixed(2) : "—",
    Number.isFinite(opt.strategicScore1to5) ? opt.strategicScore1to5.toFixed(2) : "—",
    Number.isFinite(opt.feasibilityScore1to5) ? opt.feasibilityScore1to5.toFixed(2) : "—",
    Number.isFinite(opt.finalScore0to100) ? opt.finalScore0to100.toFixed(1) : "—",
    Array.isArray(opt.flags) && opt.flags.length > 0 ? opt.flags.join(", ") : "—",
  ]));

  return (
    <div className="my-4">
      <Caption label={tableLabels.get(`${section.id}::main`)} title="Comparative Summary" />
      <ProfessionalTable headers={["Rank", "Option", "Fin (1–5)", "Strat (1–5)", "Feas (1–5)", "Final (0–100)", "Flags"]} rows={rows} />
    </div>
  );
}

export default function DocumentPreview({
  sections,
  formData,
  engineOutput,
  projectTitle,
  className = "",
}) {
  const title =
    projectTitle ||
    formData?.meta?.title ||
    window?.__FG_STEP1__?.title ||
    window?.__FG_STEP1__?.projectTitle ||
    "Untitled Project";

  const ordered = useMemo(() => sections || [], [sections]);

  // Deterministic labels recomputed when content that affects table presence changes.
  const tableLabels = useMemo(
    () => buildTableLabelMap({ sections: ordered, formData, engineOutput }),
    [ordered, formData, engineOutput]
  );

  const getSectionText = (sid) => {
    const txt = formData?.[sid]?.narrative;
    return typeof txt === "string" ? txt.trim() : "";
  };

  const isOptionsSection = (s) => {
    const sid = s?.id;
    const ref = String(s?.ref || "").trim();
    const title = String(s?.title || "").toLowerCase();
    return (
      ref === "3.0" ||
      sid === "S3_0_OPTIONS" ||
      sid === "S3_0" ||
      sid === "SECTION_3_0" ||
      title.includes("options data entry") ||
      title.includes("options considered")
    );
  };

  return (
    <div className={`bg-white border border-slate-300 rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
        <div className="text-sm font-semibold text-slate-600">Business Case (BC-01)</div>
        <div className="text-2xl font-extrabold text-slate-900 mt-1">{title}</div>
      </div>

      {/* Content */}
      <div className="px-7 py-6 space-y-6">
        {/* Executive Summary (S1) */}
        {ordered
          .filter((s) => s.id === "S1")
          .map((s) => {
            const d = depthFromRef(s.ref);
            const text = getSectionText(s.id);
            return (
              <div key={s.id} className="pb-4 border-b border-gray-200">
                <Heading depth={d}>{s.title}</Heading>
                {text ? (
                  <p className="text-sm leading-7 text-gray-900 whitespace-pre-wrap">{text}</p>
                ) : (
                  <p className="text-sm italic text-gray-400">— Empty —</p>
                )}
              </div>
            );
          })}

        {/* All Other Sections */}
        {ordered
          .filter((s) => s.id !== "S1")
          .map((s) => {
            const d = depthFromRef(s.ref);
            const isContainer = !s.hasContent;

            // Document-only decision: hide 3.0 title in print/preview
            const hideHeading = isOptionsSection(s);

            return (
              <div key={s.id} className="pb-4">
                {!hideHeading && (
                  <Heading depth={d}>
                    <span className="text-gray-500 font-semibold mr-2">{s.ref}</span>
                    {s.title}
                  </Heading>
                )}

                {!isContainer && (
                  <>
                    {isOptionsSection(s) ? (
                      <OptionsOverview section={s} formData={formData} tableLabels={tableLabels} />
                    ) : s.id === "S3_2_COSTS" ? (
                      <CostsTable section={s} engineOutput={engineOutput} tableLabels={tableLabels} />
                    ) : s.id === "S3_3_CBA" ? (
                      <FinancialAnalysisTable section={s} engineOutput={engineOutput} tableLabels={tableLabels} />
                    ) : s.id === "S3_6_BENCHMARK" ? (
                      <BenchmarkTable section={s} engineOutput={engineOutput} tableLabels={tableLabels} />
                    ) : s.id === "S3_8_PROS_CONS" ? (
                      <ComparativeSummaryTable section={s} engineOutput={engineOutput} tableLabels={tableLabels} />
                    ) : (
                      (() => {
                        const txt = getSectionText(s.id);
                        return txt ? (
                          <p className="text-sm leading-7 text-gray-900 whitespace-pre-wrap">{txt}</p>
                        ) : (
                          <p className="text-sm italic text-gray-400">— Empty —</p>
                        );
                      })()
                    )}
                  </>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-500 text-center">
          Generated by FlowGestio Decision OS • PMI/PMBOK-aligned
        </div>
      </div>
    </div>
  );
}
