/* =============================================
src/documentBuilders/businessCase.js
Business Case document builder (P1 only, JavaScript)

INPUT: Phase-1 analyzed model (schemaVersion "1.0"),
       produced after: migrate legacy -> P1 -> analyze (compute _calc) -> validate
============================================= */

/**
 * @typedef {Object} ResearchInsight
 * @property {string} claim
 * @property {string} [implication]
 * @property {{ url: string, source?: string, published?: string }} [cite]
 */

/**
 * Build a Business Case document from a *P1 analyzed* model.
 * Throws if the model is not P1 or missing `_calc`.
 * @param {any} d
 * @param {ResearchInsight[]} insights
 */
export function buildBusinessCase(d, insights = []) {
  assertP1Analyzed(d);

  const ccy = d.financial?.currency || "USD";
  const title =
    d.meta?.title ||
    d.strategic?.businessNeed ||
    d.strategic?.problemStatement ||
    "Business Case";

  const sections = [
    sec("exec_summary", "Executive Summary", genExecSummary(d, title, ccy)),
    sec("strategic_context", "Strategic Context", genStrategic(d)),
    sec("assumptions_constraints", "Assumptions & Constraints", genAssumptionsConstraints(d)),
    sec("alternatives", "Options & Alternatives Analysis", genOptions(d, ccy)),
    sec("financials", "Financial Analysis", genFinancial(d, ccy)),
    sec("benefits_value", "Benefits & Value Realization", genBenefits(d)),
    sec("success_metrics", "Success Metrics (KPIs)", genKPIs(d)),
    sec("risks", "Risks & Mitigations", genRisks(d)),
    sec("implementation", "Implementation Approach & Next Steps", genImplementation(d)),
    sec("stakeholders_governance", "Governance & Approvals", genGovernance(d)),
    sec("compliance", "Regulatory & Compliance", genCompliance(d)),
  ];

  // Optional: weave one research-backed line into Benefits section as a note
  const insight = (insights || []).find((i) => /benefit|value|outcome|kpi/i.test(i.claim));
  if (insight?.implication) {
    const idx = sections.findIndex((s) => s.id === "benefits_value");
    sections.splice(
      idx >= 0 ? idx + 1 : sections.length,
      0,
      sec("benefits_notes", "Benefits Note (Research)", ensurePeriod(insight.implication))
    );
  }

  // Derive citations from insights (deduped by url+claim)
  const citations = dedupeCitations(
    (insights || [])
      .filter((i) => i?.cite?.url)
      .map((i) => ({
        claim: String(i.claim || ""),
        url: String(i.cite.url || ""),
        source: i.cite.source ? String(i.cite.source) : guessDomain(i.cite.url),
        published: i.cite.published ? String(i.cite.published) : "",
      }))
  );

  return {
    type: "business_case",
    meta: { title, date: new Date().toISOString().slice(0, 10) },
    sections,
    citations,
  };
}

/* ========== Guards & helpers (P1 only) ========== */

function assertP1Analyzed(d) {
  if (!d || d.schemaVersion !== "1.0") {
    throw new Error("BusinessCase builder requires a Phase-1 model (schemaVersion '1.0').");
  }
  if (!Array.isArray(d.options) || d.options.length < 2) {
    throw new Error("BusinessCase builder requires at least two options (including a baseline).");
  }
  const baselineCount = d.options.filter((o) => o.isBaseline).length;
  if (baselineCount !== 1) {
    throw new Error("Exactly one baseline option is required.");
  }
  const hz = d.financial?.horizonMonths;
  const cur = d.financial?.currency;
  for (const o of d.options) {
    if (!o._calc) throw new Error(`Option "${o.name}" is missing _calc. Run analysis before building.`);
    if (typeof o._calc.horizonMonths === "number" && hz !== undefined && o._calc.horizonMonths !== hz) {
      throw new Error(
        `Option "${o.name}" _calc.horizonMonths (${o._calc.horizonMonths}) != financial.horizonMonths (${hz}).`
      );
    }
    if (o._calc.currency && cur && o._calc.currency !== cur) {
      throw new Error(`Option "${o.name}" _calc.currency (${o._calc.currency}) != financial.currency (${cur}).`);
    }
  }
}

function pickRecommended(d) {
  if (d.recommendedOption) {
    return d.options.find((o) => o.id === d.recommendedOption) || d.options.find((o) => !o.isBaseline) || d.options[0];
  }
  // Respect governance decisions: do not auto-rank purely by ROI
  return d.options.find((o) => !o.isBaseline) || d.options[0];
}

/* ========== Section generators (P1) ========== */

function genExecSummary(d, title, ccy) {
  const opt = pickRecommended(d);
  const hz = d.financial?.horizonMonths ? ` over ${d.financial.horizonMonths} months` : "";
  const fin = summarizeOptionFinancial(opt?._calc, ccy);
  const why = d.recommendationRationale
    ? ensurePeriod(d.recommendationRationale)
    : "It offers the best balance of impact, cost, and risk.";
  const align = d.strategic?.strategicAlignment?.length
    ? ` It aligns with ${joinAnd(d.strategic.strategicAlignment)}.`
    : "";

  return ensurePeriod(
    `This business case proposes "${title}"${hz}. The recommended option is ${opt?.name || "the proposed option"} for its value profile${fin ? ` (${fin})` : ""}. ${why}${align}`
  );
}

function genStrategic(d) {
  const s = d.strategic || {};
  const lines = [];
  if (s.businessNeed) lines.push(`• Business need: ${s.businessNeed}`);
  if (s.problemStatement) lines.push(`• Problem statement: ${s.problemStatement}`);
  if (s.opportunityDescription) lines.push(`• Opportunity: ${s.opportunityDescription}`);
  if (s.strategicAlignment?.length) lines.push(`• Strategic alignment: ${joinAnd(s.strategicAlignment)}.`);
  if (Array.isArray(s.keyAssumptions) && s.keyAssumptions.length) {
    lines.push("• Key assumptions:");
    for (const a of s.keyAssumptions) {
      const val = a.validationStatus ? ` [${a.validationStatus}]` : "";
      lines.push(`  – ${a.assumption}${val}${a.validation ? ` — validation: ${a.validation}` : ""}`);
    }
  }
  return lines.length ? lines.join("\n") : "Strategic context information is captured elsewhere in the dossier.";
}

function genAssumptionsConstraints(d) {
  const s = d.strategic || {};
  const lines = [];
  if (Array.isArray(s.constraints) && s.constraints.length) {
    lines.push("• Constraints:");
    for (const c of s.constraints) {
      lines.push(
        `  – ${c.type}: ${c.description}${c.impact ? ` — ${c.impact}` : ""}${
          c.mitigation ? ` — Mitigation: ${c.mitigation}` : ""
        }`
      );
    }
  }
  if (Array.isArray(s.keyAssumptions) && s.keyAssumptions.length) {
    lines.push("• Assumptions (summary): " + joinAnd(s.keyAssumptions.map((a) => a.assumption)));
  }
  return lines.length ? lines.join("\n") : "No specific assumptions or constraints have been recorded.";
}

function genOptions(d, ccy) {
  const lines = [];
  for (const o of d.options) {
    const fx = summarizeOptionFinancial(o._calc, ccy);
    const comp = o.implementationComplexity ? ` — Complexity: ${o.implementationComplexity}` : "";
    lines.push(`• ${o.isBaseline ? "[Baseline] " : ""}${o.name}${comp}${fx ? ` — ${fx}` : ""}`);
    if (o.description) lines.push(`  ${o.description}`);
  }

  // Optional: decision matrix summary, if provided
  if (Array.isArray(d.decisionCriteria) && d.decisionCriteria.length && Array.isArray(d.optionScores)) {
    lines.push("\n• Decision criteria (weights): " + joinAnd(d.decisionCriteria.map((c) => `${c.criterion} ${fmtPct(c.weight*100)}`)));
    const scoreLine = d.optionScores
      .map((os) => {
        const opt = d.options.find((x) => x.id === os.optionId);
        return `${opt?.name || os.optionId}: ${round1(os.weightedScore)}`;
      })
      .join("; ");
    if (scoreLine) lines.push("• Weighted scores: " + scoreLine);
  }

  return lines.join("\n");
}

function genFinancial(d, ccy) {
  const hz = d.financial?.horizonMonths;
  const r = typeof d.financial?.discountRatePct === "number" ? ` at ${d.financial.discountRatePct}% discount` : "";
  const header = `Modeled over ${hz || "the chosen"} months${r}.`;
  const rows = d.options.map((o) => `• ${o.isBaseline ? "[Baseline] " : ""}${o.name}: ${detailedOptionFinancial(o._calc, ccy)}`);
  const thresholds = [
    isNum(d.financial?.minimumROI) ? `Minimum ROI: ${fmtPct(d.financial.minimumROI)}.` : "",
    isNum(d.financial?.maximumPaybackMonths) ? `Maximum payback: ${d.financial.maximumPaybackMonths} months.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [header, ...rows, thresholds].filter(Boolean).join("\n");
}

function genBenefits(d) {
  const opt = pickRecommended(d);
  const cats = summarizeBenefitCategories(opt) || [];
  const catLine = cats.length ? `Top benefit categories: ${joinAnd(cats.map(([k, v]) => `${labelCat(k)} ${fmtMoney(v)}`))}.` : "";
  const qual = "Non-financial value includes service access, quality, and equity improvements where applicable.";
  return [catLine || "Benefits will be realized through the proposed service and operating model.", qual].join(" ");
}

function genKPIs(d) {
  const s = d.strategic || {};
  if (!Array.isArray(s.successKPIs) || !s.successKPIs.length) {
    return "KPIs will be baselined and monitored per the measurement plan.";
  }
  const lines = [];
  for (const k of s.successKPIs) {
    const base = k.baseline ? ` (baseline: ${k.baseline})` : "";
    const tgt = k.target ? ` → target: ${k.target}` : "";
    const date = k.targetDate ? ` by ${formatDate(k.targetDate)}` : "";
    const own = k.owner ? ` — owner: ${k.owner}` : "";
    lines.push(`• ${k.name}${base}${tgt}${date}${own}`);
  }
  return lines.join("\n");
}

function genRisks(d) {
  const lines = [];
  // Project-level risks
  if (Array.isArray(d.projectRisks) && d.projectRisks.length) {
    lines.push("• Project risks:");
    for (const r of d.projectRisks) {
      const score = isNum(r.riskScore) ? ` [score ${r.riskScore}]` : "";
      const res = r.responseStrategy ? ` — response: ${r.responseStrategy}` : "";
      lines.push(`  – ${r.statement}${score} — owner: ${r.owner}${res}`);
    }
  }
  // Recommended option specific risks
  const opt = pickRecommended(d);
  if (Array.isArray(opt.optionSpecificRisks) && opt.optionSpecificRisks.length) {
    lines.push("• Option-specific risks (recommended):");
    for (const r of opt.optionSpecificRisks) {
      const score = isNum(r.riskScore) ? ` [score ${r.riskScore}]` : "";
      lines.push(`  – ${r.statement}${score} — mitigation: ${r.mitigation}`);
    }
  }
  return lines.length ? lines.join("\n") : "No material risks have been identified at this stage.";
}

function genImplementation(d) {
  const opt = pickRecommended(d);
  const steps = Array.isArray(d.nextSteps) && d.nextSteps.length ? d.nextSteps.map((s, i) => `  ${i + 1}. ${s}`).join("\n") : "";
  const comp = opt?.implementationComplexity ? `Implementation complexity: ${opt.implementationComplexity}. ` : "";
  const hz = d.financial?.horizonMonths ? `Planning horizon: ${d.financial.horizonMonths} months. ` : "";
  const lead = comp || hz ? `${comp}${hz}` : "";
  return [lead + (steps ? "Planned next steps:" : "Implementation plan will be refined."), steps].filter(Boolean).join("\n");
}

function genGovernance(d) {
  const wf = d.workflow || {};
  const lines = [];
  if (wf.currentStatus) lines.push(`• Status: ${wf.currentStatus} (version ${wf.version || "v1"})`);
  if (wf.createdBy) lines.push(`• Created by: ${wf.createdBy}${wf.lastModified ? ` — last modified ${formatDate(wf.lastModified)}` : ""}`);
  if (Array.isArray(wf.approvals) && wf.approvals.length) {
    lines.push("• Approvals:");
    for (const a of wf.approvals) {
      const lvl = a.approvalLevel ? ` [${a.approvalLevel}]` : "";
      lines.push(`  – ${a.role}${lvl}: ${a.name}${a.status ? ` — ${a.status}` : ""}${a.date ? ` — ${formatDate(a.date)}` : ""}`);
    }
  }
  return lines.length ? lines.join("\n") : "Governance process and approvers will be confirmed.";
}

function genCompliance(d) {
  const org = d.organizational || {};
  const checks = Array.isArray(d.complianceChecks) ? d.complianceChecks : [];
  const parts = [];
  parts.push(`• Regulatory relevant: ${org.requiresRegulatory ? "Yes" : "No"}.`);
  if (checks.length) {
    for (const c of checks) {
      parts.push(`  – ${c.checkType}: ${c.status}${c.date ? ` — ${formatDate(c.date)}` : ""}${c.notes ? ` — ${c.notes}` : ""}`);
    }
  }
  return parts.join("\n");
}

/* ========== Financial helpers ========== */

function summarizeOptionFinancial(calc, ccy) {
  if (!calc) return "";
  const bits = [];
  if (isNum(calc.roiPct)) bits.push(`ROI ${fmtPct(calc.roiPct)}`);
  if (isNum(calc.npv)) bits.push(`NPV ${fmtMoney(calc.npv, ccy)}`);
  if (isNum(calc.paybackMonths)) bits.push(`payback ${calc.paybackMonths} mo`);
  if (isNum(calc.mirrPct)) bits.push(`MIRR ${fmtPct(calc.mirrPct)}`);
  if (isNum(calc.benefitCostRatio)) bits.push(`BCR ${round2(calc.benefitCostRatio)}`);
  return bits.join(", ");
}

function detailedOptionFinancial(calc, ccy) {
  if (!calc) return "financials pending";
  const bits = [];
  bits.push(`costs ${fmtMoney(calc.totalCosts, ccy)}`);
  if (isNum(calc.totalBenefits)) bits.push(`benefits ${fmtMoney(calc.totalBenefits, ccy)}`);
  if (isNum(calc.netBenefit)) bits.push(`net ${fmtMoney(calc.netBenefit, ccy)}`);
  if (isNum(calc.roiPct)) bits.push(`ROI ${fmtPct(calc.roiPct)}`);
  if (isNum(calc.paybackMonths)) bits.push(`payback ${calc.paybackMonths} mo`);
  if (isNum(calc.breakEvenMonth)) bits.push(`break-even ${calc.breakEvenMonth}`);
  if (isNum(calc.npv)) bits.push(`NPV ${fmtMoney(calc.npv, ccy)}`);
  if (isNum(calc.mirrPct)) bits.push(`MIRR ${fmtPct(calc.mirrPct)}`);
  if (isNum(calc.benefitCostRatio)) bits.push(`BCR ${round2(calc.benefitCostRatio)}`);
  if (isNum(calc.profitabilityIndex)) bits.push(`PI ${round2(calc.profitabilityIndex)}`);
  return bits.join(", ");
}

function summarizeBenefitCategories(opt) {
  if (!opt || !Array.isArray(opt.lineItems)) return null;
  const sums = {};
  for (const li of opt.lineItems) {
    if (li.kind !== "benefit") continue;
    const k = li.category || "benefit";
    sums[k] = (sums[k] || 0) + Math.abs(Number(li.amount) || 0);
  }
  const entries = Object.entries(sums);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 3); // top 3
}

function labelCat(c) {
  const map = {
    capex: "CapEx",
    opex: "OpEx",
    licensing: "Licensing",
    maintenance: "Maintenance",
    compliance: "Compliance",
    revenue: "Revenue",
    cost_savings: "Cost Savings",
    risk_avoidance: "Risk Avoidance",
    productivity: "Productivity",
  };
  return map[c] || c;
}

/* ========== General helpers ========== */

function sec(id, title, content) {
  return { id, title, content: content || "" };
}

function ensurePeriod(s) {
  if (!s) return "";
  const t = String(s).trim();
  return /[.!?]$/.test(t) ? t : t + ".";
}

function fmtMoney(n, currency = "USD") {
  if (typeof n === "number" && isFinite(n)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: Math.abs(n) < 1000 ? 0 : 0,
      }).format(n);
    } catch {
      // Fallback if Intl doesn't have the currency
      return `${currency} ${Math.round(n).toLocaleString()}`;
    }
  }
  return "—";
}

function fmtPct(p) {
  if (p === null || p === undefined || !isFinite(p)) return "—";
  // accept both 0-1 and 0-100 scales defensively
  const val = Math.abs(p) <= 1 ? p * 100 : p;
  return `${round1(val)}%`;
}

function round1(x) {
  return Math.round(Number(x) * 10) / 10;
}
function round2(x) {
  return Math.round(Number(x) * 100) / 100;
}
function isNum(x) {
  return typeof x === "number" && isFinite(x);
}

function joinAnd(arr) {
  const a = Array.isArray(arr) ? arr.filter(Boolean) : [];
  if (!a.length) return "";
  return a.length === 1 ? a[0] : a.slice(0, -1).join(", ") + " and " + a.slice(-1);
}

function formatDate(s) {
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s || "";
  }
}

function guessDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "source";
  }
}
function dedupeCitations(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    const key = `${c.url}::${c.claim}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
