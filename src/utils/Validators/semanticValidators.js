// utils/validators/semanticValidators.js
// ✅ Phase 2 - Semantic / Logic Validation Rules (FlowGestio compatible)

// ---------- helpers ----------
function toNumberOrNull(v) {
  const n = parseFloat(String(v).replace(/[%$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * R-SEM-01: High-risk items should have mitigation strategies
 */
const R_SEM_01_HIGH_RISK_MITIGATION = {
  id: "R-SEM-01",
  name: "High Risk Mitigation Required",
  severity: "INFO",
  targetSection: "S11",
  targetField: "risks_list",

  check: (snapshot) => {
    const risks = snapshot?.S11?.risks_list;

    if (!Array.isArray(risks) || risks.length === 0) return true;

    const highRisks = risks.filter(
      (risk) =>
        risk?.likelihood === "high" ||
        risk?.impact === "high" ||
        risk?.severity === "high"
    );

    if (highRisks.length === 0) return true;

    const withMitigation = highRisks.filter(
      (risk) =>
        typeof risk?.mitigation === "string" &&
        risk.mitigation.length > 20
    );

    return withMitigation.length >= highRisks.length * 0.8;
  },

  message: "High-risk items should have detailed mitigation strategies",
  remedyLabel:
    "Add mitigation plans for high-likelihood or high-impact risks in S11",
};

/**
 * R-SEM-02: Executive summary should mention key financials (if available)
 */
const R_SEM_02_EXEC_SUMMARY_MENTIONS_FINANCIALS = {
  id: "R-SEM-02",
  name: "Executive Summary Includes Key Financials",
  severity: "INFO",
  targetSection: "S1",
  targetField: "executive_summary_text",
  dependencies: ["S9", "S10"],

  check: (snapshot) => {
    const execSummary = (
      snapshot?.S1?.executive_summary_text || ""
    ).toLowerCase();

    if (!execSummary || execSummary.length < 50) return true;

    const hasCosts =
      snapshot?.S9?.capex_total || snapshot?.S9?.opex_annual;
    const hasMetrics =
      snapshot?.S10?.roi_calculated || snapshot?.S10?.npv_calculated;

    if (!hasCosts && !hasMetrics) return true;

    return /\$|cost|capex|opex|roi|npv|budget|investment|benefit|return|payback/i.test(
      execSummary
    );
  },

  message: "Executive summary should mention key financial data",
  detailedMessage:
    "When financial data exists, the executive summary should briefly reference costs or benefits for decision-makers.",
  remedyLabel: "Update S1 to include financial highlights",
};

/**
 * R-SEM-03: Quantified benefits should include units
 */
const R_SEM_03_BENEFITS_HAVE_UNITS = {
  id: "R-SEM-03",
  name: "Quantified Benefits Include Units",
  severity: "INFO",
  targetSection: "S8",
  targetField: "benefits_list",

  check: (snapshot) => {
    const amount = toNumberOrNull(snapshot?.S8?.annual_benefit_amount);
    const benefitsText = snapshot?.S8?.benefits_list || "";

    if (amount == null || amount <= 0) return true;

    return (
      benefitsText.includes(String(snapshot?.S8?.annual_benefit_amount)) ||
      /\$|annually|per year|per annum|one[- ]time|savings|revenue/i.test(
        benefitsText
      )
    );
  },

  message: "Quantified benefits should specify units (annual, one-time, etc.)",
  remedyLabel:
    "Clarify in S8 whether benefits are annual, one-time, or cumulative",
};

/**
 * R-SEM-04: Multiple alternatives should be analyzed
 */
const R_SEM_04_MULTIPLE_ALTERNATIVES = {
  id: "R-SEM-04",
  name: "Multiple Alternatives Analyzed",
  severity: "INFO",
  targetSection: "S6",
  targetField: "alternatives",

  check: (snapshot) => {
    const alternatives =
      snapshot?.S6?.options || snapshot?.S6?.alternatives;

    if (!Array.isArray(alternatives)) return true;

    return alternatives.length >= 2;
  },

  message:
    "PMI best practice: analyze at least 2–3 alternatives including 'do nothing'",
  detailedMessage:
    "Business cases should compare multiple options to demonstrate due diligence.",
  remedyLabel: "Add more alternatives in S6 for comparison",
};

/**
 * R-SEM-05: Project title should be descriptive
 */
const R_SEM_05_DESCRIPTIVE_TITLE = {
  id: "R-SEM-05",
  name: "Descriptive Project Title",
  severity: "INFO",
  targetSection: "S1",
  targetField: "title",

  check: (snapshot) => {
    const title =
      snapshot?.S1?.title || snapshot?.step1?.title || "";

    if (title.length < 10) return false;

    const isGeneric =
      /^(project|initiative|program|test|untitled|new|draft)$/i.test(
        title.trim()
      );

    return !isGeneric;
  },

  message: "Project title should be descriptive and specific",
  remedyLabel:
    "Update title to clearly describe the project's purpose or outcome",
};

// Export all semantic rules
export const SEMANTIC_RULES = {
  "R-SEM-01": R_SEM_01_HIGH_RISK_MITIGATION,
  "R-SEM-02": R_SEM_02_EXEC_SUMMARY_MENTIONS_FINANCIALS,
  "R-SEM-03": R_SEM_03_BENEFITS_HAVE_UNITS,
  "R-SEM-04": R_SEM_04_MULTIPLE_ALTERNATIVES,
  "R-SEM-05": R_SEM_05_DESCRIPTIVE_TITLE,
};
