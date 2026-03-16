// utils/validators/dependencyValidators.js
// ✅ Phase 2 - Cross-Section Dependency Rules (FlowGestio compatible)

// ---------- helpers ----------
function toNumberOrNull(v) {
  const n = parseFloat(String(v).replace(/[%$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function hasNonEmptyText(v, min = 10) {
  return typeof v === "string" && v.trim().length >= min;
}

/**
 * R-DEP-01: Financial analysis requires cost data
 */
const R_DEP_01_FINANCIAL_REQUIRES_COSTS = {
  id: "R-DEP-01",
  name: "Financial Analysis Requires Costs",
  severity: "BLOCK",
  targetSection: "S10",
  targetField: "financial_analysis_text",
  dependencies: ["S9"],

  check: (snapshot) => {
    const analysisText = snapshot?.S10?.financial_analysis_text;
    if (!hasNonEmptyText(analysisText, 50)) return true;

    const capex = toNumberOrNull(snapshot?.S9?.capex_total);
    const opex = toNumberOrNull(snapshot?.S9?.opex_annual);
    const breakdown = snapshot?.S9?.cost_breakdown;

    return (capex && capex > 0) || (opex && opex > 0) || hasNonEmptyText(breakdown, 20);
  },

  message: "Financial analysis requires cost data from S9",
  remedyLabel: "Complete S9 (Costs) before writing financial analysis",
};

/**
 * R-DEP-02: Quantified metrics require quantified benefits
 */
const R_DEP_02_METRICS_REQUIRE_BENEFITS = {
  id: "R-DEP-02",
  name: "Quantified Metrics Require Quantified Benefits",
  severity: "WARN",
  targetSection: "S10",
  targetField: "npv_calculated",
  dependencies: ["S8"],

  check: (snapshot) => {
    const npv = snapshot?.S10?.npv_calculated;
    const roi = snapshot?.S10?.roi_calculated;

    const hasMetrics =
      (npv && npv !== "N/A" && npv !== "TBD") ||
      (roi && roi !== "N/A" && roi !== "TBD");

    if (!hasMetrics) return true;

    const benefitAmount = toNumberOrNull(snapshot?.S8?.annual_benefit_amount);
    const flagged = snapshot?.S8?.benefits_quantified === true;

    return (benefitAmount && benefitAmount > 0) || flagged;
  },

  message: "Quantified financial metrics require quantified benefits in S8",
  detailedMessage:
    "NPV and ROI calculations depend on quantified benefits. If benefits are qualitative only, metrics should be marked N/A.",
  remedyLabel:
    "Add annual benefit amount in S8, or keep financial analysis qualitative",
};

/**
 * R-DEP-03: Recommendation must reference analyzed alternatives
 */
const R_DEP_03_RECOMMENDATION_FROM_ALTERNATIVES = {
  id: "R-DEP-03",
  name: "Recommendation Must Reference Alternatives",
  severity: "WARN",
  targetSection: "S7",
  targetField: "selected_option",
  dependencies: ["S6"],

  check: (snapshot) => {
    const recommended =
      snapshot?.S7?.selected_option || snapshot?.S7?.recommendation;

    if (!recommended) return true;

    const alternatives =
      snapshot?.S6?.options || snapshot?.S6?.alternatives;

    if (!Array.isArray(alternatives) || alternatives.length === 0) return true;

    return alternatives.some(
      (alt) =>
        alt?.id === recommended ||
        alt?.name === recommended ||
        alt?.title === recommended
    );
  },

  message: "Recommended option should be one of the analyzed alternatives",
  remedyLabel:
    "Select from alternatives in S6, or add recommended option to alternatives list",
};

/**
 * R-DEP-04: Benefits should align with stated goals
 */
const R_DEP_04_BENEFITS_ALIGN_GOALS = {
  id: "R-DEP-04",
  name: "Benefits Align with Goals",
  severity: "INFO",
  targetSection: "S8",
  targetField: "benefits_list",
  dependencies: ["S1", "S3"],

  check: (snapshot) => {
    const benefitsText = String(snapshot?.S8?.benefits_list || "").toLowerCase();
    if (benefitsText.length < 20) return true;

    const goalsRaw = snapshot?.step1?.goals || snapshot?.S1?.goals || [];
    const objectivesRaw = snapshot?.S3?.strategic_objectives || "";

    const goalsText = Array.isArray(goalsRaw)
      ? goalsRaw.join(" ")
      : String(goalsRaw || "");

    const allGoals = (goalsText + " " + objectivesRaw).toLowerCase();
    if (allGoals.length < 10) return true;

    const benefitKeywords = benefitsText.match(/\b\w{5,}\b/g) || [];
    const goalKeywords = allGoals.match(/\b\w{5,}\b/g) || [];

    const overlap = benefitKeywords.filter((kw) =>
      goalKeywords.includes(kw)
    );

    return overlap.length >= 2;
  },

  message: "Benefits should clearly support stated project goals",
  detailedMessage:
    "Benefits in S8 should directly relate to goals from Step 1 and strategic objectives in S3.",
  remedyLabel: "Review benefits in S8 to ensure alignment with project goals",
};

/**
 * R-DEP-05: Problem statement should inform solution
 */
const R_DEP_05_SOLUTION_ADDRESSES_PROBLEM = {
  id: "R-DEP-05",
  name: "Solution Addresses Problem",
  severity: "WARN",
  targetSection: "S7",
  targetField: "recommendation_text",
  dependencies: ["S2"],

  check: (snapshot) => {
    const problemText = String(
      snapshot?.S2?.problem_statement || snapshot?.step1?.problem || ""
    ).toLowerCase();

    const solutionText = String(
      snapshot?.S7?.recommendation_text || snapshot?.S7?.solution || ""
    ).toLowerCase();

    if (problemText.length < 20 || solutionText.length < 20) return true;

    const problemKeywords = problemText.match(/\b\w{5,}\b/g) || [];
    const solutionKeywords = solutionText.match(/\b\w{5,}\b/g) || [];

    const overlap = problemKeywords.filter((kw) =>
      solutionKeywords.includes(kw)
    );

    return overlap.length >= 2;
  },

  message: "Recommended solution should clearly address the stated problem",
  remedyLabel:
    "Ensure S7 recommendation explicitly addresses the problem described in S2",
};

// Export all dependency rules
export const DEPENDENCY_RULES = {
  "R-DEP-01": R_DEP_01_FINANCIAL_REQUIRES_COSTS,
  "R-DEP-02": R_DEP_02_METRICS_REQUIRE_BENEFITS,
  "R-DEP-03": R_DEP_03_RECOMMENDATION_FROM_ALTERNATIVES,
  "R-DEP-04": R_DEP_04_BENEFITS_ALIGN_GOALS,
  "R-DEP-05": R_DEP_05_SOLUTION_ADDRESSES_PROBLEM,
};
