// utils/validators/financialValidators.js
// ✅ Phase 2 - Financial Validation Rules (FlowGestio-compatible)

// ---------- helpers (non-aggressive) ----------
function toNumberOrNull(v) {
  const n = parseFloat(String(v).replace(/[%$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * R-FIN-01: CAPEX and OPEX cannot be negative
 */
const R_FIN_01_NON_NEGATIVE_COSTS = {
  id: "R-FIN-01",
  name: "Non-Negative Costs",
  severity: "BLOCK",
  targetSection: "S9",
  targetField: "capex_total",

  check: (snapshot) => {
    const capexRaw = snapshot?.S9?.capex_total || snapshot?.step1?.capex;
    const opexRaw = snapshot?.S9?.opex_annual || snapshot?.step1?.opex_annual;

    if (capexRaw == null && opexRaw == null) return true;

    const capex = toNumberOrNull(capexRaw);
    const opex = toNumberOrNull(opexRaw);

    if (capex == null && opex == null) return true;

    return (capex == null || capex >= 0) && (opex == null || opex >= 0);
  },

  message: "CAPEX and OPEX cannot be negative values",
  remedyLabel: "Review cost estimates in S9 - use positive numbers only",
};

/**
 * R-FIN-02: Negative ROI requires qualitative justification
 */
const R_FIN_02_NEGATIVE_ROI_JUSTIFICATION = {
  id: "R-FIN-02",
  name: "Negative ROI Justification",
  severity: "WARN",
  targetSection: "S10",
  targetField: "qualitative_justification",
  dependencies: ["S8", "S9", "S10"],

  check: (snapshot) => {
    const roiRaw = snapshot?.S10?.roi_calculated || snapshot?.S10?.roi;

    if (!roiRaw || roiRaw === "N/A" || roiRaw === "TBD") return true;

    const roiValue = toNumberOrNull(roiRaw);
    if (roiValue == null) return true;

    if (roiValue >= 0) return true;

    const justification = snapshot?.S10?.qualitative_justification || "";

    const hasLength = justification.length >= 100;
    const hasStrategicContent =
      /strategic|social|operational|intangible|long[- ]term|equity|access|compliance|reputation/i.test(
        justification
      );

    return hasLength && hasStrategicContent;
  },

  message: "Negative ROI requires detailed qualitative justification",
  detailedMessage:
    "Projects with negative financial returns can still deliver value through strategic, social, or operational benefits. These must be clearly documented.",
  remedyLabel:
    "Add strategic or social value justification in S10, or review cost/benefit data",

  examples: {
    good:
      "While financially negative, this project improves healthcare access for underserved populations and reduces downstream emergency costs.",
    bad: "This project is important.",
  },

  getContextData: (snapshot) => ({
    roi: snapshot?.S10?.roi_calculated || "N/A",
    npv: snapshot?.S10?.npv_calculated || "N/A",
    justificationLength:
      (snapshot?.S10?.qualitative_justification || "").length,
  }),

  shouldEscalate: (snapshot) => {
    const roi = toNumberOrNull(
      snapshot?.S10?.roi_calculated || snapshot?.S10?.roi
    );
    const npv = toNumberOrNull(
      snapshot?.S10?.npv_calculated || snapshot?.S10?.npv
    );

    if (roi == null || npv == null) return false;

    return roi < -50 && npv < -100000;
  },

  escalatedMessage:
    "Severely negative financials require executive-level justification or project redesign",
};

/**
 * R-FIN-03: NPV and Payback consistency check
 */
const R_FIN_03_NPV_PAYBACK_CONSISTENCY = {
  id: "R-FIN-03",
  name: "NPV-Payback Consistency",
  severity: "WARN",
  targetSection: "S10",
  targetField: "npv_calculated",

  check: (snapshot) => {
    const npv = toNumberOrNull(
      snapshot?.S10?.npv_calculated || snapshot?.S10?.npv
    );
    const payback = toNumberOrNull(
      snapshot?.S10?.payback_calculated ||
        snapshot?.S10?.payback_period
    );

    if (npv == null || payback == null) return true;

    return !(npv < 0 && payback < 3);
  },

  message:
    "Short payback period with negative NPV suggests financial inconsistency",
  detailedMessage:
    "A project with quick payback but negative NPV may indicate issues with discount rate, horizon, or timing of benefits.",
  remedyLabel:
    "Review discount rate, planning horizon, and cost/benefit assumptions",

  getContextData: (snapshot) => ({
    npv: snapshot?.S10?.npv_calculated || "N/A",
    payback: snapshot?.S10?.payback_calculated || "N/A",
    discountRate: snapshot?.S10?.discount_rate || "Not set",
    planningHorizon: snapshot?.S10?.planning_horizon || "Not set",
  }),
};

/**
 * R-FIN-04: Discount rate must be valid (0–100%)
 */
const R_FIN_04_VALID_DISCOUNT_RATE = {
  id: "R-FIN-04",
  name: "Valid Discount Rate",
  severity: "BLOCK",
  targetSection: "S10",
  targetField: "discount_rate",

  check: (snapshot) => {
    const rate = toNumberOrNull(snapshot?.S10?.discount_rate);
    if (rate == null) return true;
    return rate > 0 && rate <= 100;
  },

  message: "Discount rate must be between 0% and 100%",
  remedyLabel: "Use a realistic corporate discount rate (typically 5–15%)",
};

/**
 * R-FIN-05: Costs must exist if financial metrics are provided
 */
const R_FIN_05_COSTS_FOR_FINANCIAL_ANALYSIS = {
  id: "R-FIN-05",
  name: "Costs Required for Financial Analysis",
  severity: "BLOCK",
  targetSection: "S10",
  targetField: "capex_total",
  dependencies: ["S9"],

  check: (snapshot) => {
    const hasFinancialMetrics =
      snapshot?.S10?.npv_calculated ||
      snapshot?.S10?.roi_calculated ||
      snapshot?.S10?.payback_calculated;

    if (!hasFinancialMetrics) return true;

    const capex = toNumberOrNull(snapshot?.S9?.capex_total);
    const opex = toNumberOrNull(snapshot?.S9?.opex_annual);

    return (capex && capex > 0) || (opex && opex > 0);
  },

  message: "Financial analysis requires cost data from S9",
  remedyLabel:
    "Complete CAPEX or OPEX data in S9 before generating financial metrics",
};

// Export all financial rules
export const FINANCIAL_RULES = {
  "R-FIN-01": R_FIN_01_NON_NEGATIVE_COSTS,
  "R-FIN-02": R_FIN_02_NEGATIVE_ROI_JUSTIFICATION,
  "R-FIN-03": R_FIN_03_NPV_PAYBACK_CONSISTENCY,
  "R-FIN-04": R_FIN_04_VALID_DISCOUNT_RATE,
  "R-FIN-05": R_FIN_05_COSTS_FOR_FINANCIAL_ANALYSIS,
};
