// utils/validators/dateValidators.js
// ✅ Phase 2 - Temporal/Date Validation Rules

// Small helpers (keep rules non-aggressive when data is missing/invalid)
function toValidDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function toIntOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * R-TIME-01: Project end date must be after start date
 */
const R_TIME_01_END_AFTER_START = {
  id: "R-TIME-01",
  name: "End Date After Start Date",
  severity: "BLOCK",
  targetSection: "S1",
  targetField: "end_date", // ✅ UI anchor support (S1__end_date)

  check: (snapshot) => {
    const startRaw = snapshot?.S1?.start_date || snapshot?.step1?.startDate;
    const endRaw = snapshot?.S1?.end_date || snapshot?.step1?.endDate;

    if (!startRaw || !endRaw) return true; // Can't validate if missing

    const start = toValidDate(startRaw);
    const end = toValidDate(endRaw);

    if (!start || !end) return true; // non-aggressive on invalid dates

    return end > start;
  },

  message: "Project end date must be after start date",
  remedyLabel: "Adjust project timeline in Executive Summary or Step 1",

  getContextData: (snapshot) => ({
    startDate: snapshot?.S1?.start_date || snapshot?.step1?.startDate || "Not set",
    endDate: snapshot?.S1?.end_date || snapshot?.step1?.endDate || "Not set",
  }),
};

/**
 * R-TIME-02: Project timeline should be realistic (not too short)
 */
const R_TIME_02_REALISTIC_DURATION = {
  id: "R-TIME-02",
  name: "Realistic Project Duration",
  severity: "WARN",
  targetSection: "S1",
  targetField: "end_date", // ✅ ties to duration; anchor to end_date is fine

  check: (snapshot) => {
    const startRaw = snapshot?.S1?.start_date || snapshot?.step1?.startDate;
    const endRaw = snapshot?.S1?.end_date || snapshot?.step1?.endDate;

    if (!startRaw || !endRaw) return true;

    const start = toValidDate(startRaw);
    const end = toValidDate(endRaw);

    if (!start || !end) return true;

    const durationDays = (end - start) / (1000 * 60 * 60 * 24);

    // Warn if project is less than 30 days (heuristic)
    return durationDays >= 30;
  },

  message: "Project duration is unusually short (< 1 month)",
  detailedMessage:
    "Most PMI-compliant projects require at least 1-2 months for proper planning, execution, and closure. Very short timelines may indicate missing phases or unrealistic expectations.",
  remedyLabel: "Review project timeline or confirm this is a rapid deployment",

  getContextData: (snapshot) => {
    const startRaw = snapshot?.S1?.start_date || snapshot?.step1?.startDate;
    const endRaw = snapshot?.S1?.end_date || snapshot?.step1?.endDate;

    const start = toValidDate(startRaw);
    const end = toValidDate(endRaw);

    if (!start || !end) return {};

    const durationDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

    return {
      startDate: startRaw,
      endDate: endRaw,
      durationDays,
      durationMonths: (durationDays / 30).toFixed(1),
    };
  },
};

/**
 * R-TIME-03: Financial analysis horizon should cover project lifecycle
 */
const R_TIME_03_FINANCIAL_HORIZON_COVERAGE = {
  id: "R-TIME-03",
  name: "Financial Horizon Coverage",
  severity: "WARN",
  targetSection: "S10",
  targetField: "planning_horizon", // ✅ UI anchor support (S10__planning_horizon)
  dependencies: ["S1", "S10"],

  check: (snapshot) => {
    const startRaw = snapshot?.S1?.start_date || snapshot?.step1?.startDate;
    if (!startRaw) return true;

    const horizonYears = toIntOrNull(snapshot?.S10?.planning_horizon) ?? 5;

    const start = toValidDate(startRaw);
    const projectEnd = toValidDate(snapshot?.S1?.end_date || snapshot?.step1?.endDate);

    if (!start || !projectEnd) return true;

    const analysisEnd = new Date(start);
    analysisEnd.setFullYear(start.getFullYear() + horizonYears);

    return analysisEnd >= projectEnd;
  },

  message: "Financial analysis period may not cover full project lifecycle",
  detailedMessage:
    "The planning horizon for financial analysis (NPV, ROI) should extend at least through the project's completion to capture all costs and benefits.",
  remedyLabel: "Extend planning horizon in S10 or adjust project timeline",

  getContextData: (snapshot) => {
    const horizonYears = toIntOrNull(snapshot?.S10?.planning_horizon) ?? 5;
    const projectStart = snapshot?.S1?.start_date || snapshot?.step1?.startDate || "TBD";
    const projectEnd = snapshot?.S1?.end_date || snapshot?.step1?.endDate || "TBD";

    return {
      planningHorizon: `${horizonYears} years`,
      projectStart,
      projectEnd,
    };
  },
};

/**
 * R-TIME-04: Start date is significantly in the past (informational)
 */
const R_TIME_04_START_DATE_NOT_PAST = {
  id: "R-TIME-04",
  name: "Start Date Validity",
  severity: "INFO",
  targetSection: "S1",
  targetField: "start_date", // ✅ UI anchor support (S1__start_date)

  check: (snapshot) => {
    const startRaw = snapshot?.S1?.start_date || snapshot?.step1?.startDate;
    if (!startRaw) return true;

    const start = toValidDate(startRaw);
    if (!start) return true;

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    // INFO if start date is more than ~6 months in the past
    return start > sixMonthsAgo;
  },

  message: "Project start date is significantly in the past",
  detailedMessage:
    "The start date suggests this project may have already begun or the timeline needs updating. Ensure the Business Case reflects current project status.",
  remedyLabel: "Update start date or confirm project is in-progress",
};

// Export all date rules
export const DATE_RULES = {
  "R-TIME-01": R_TIME_01_END_AFTER_START,
  "R-TIME-02": R_TIME_02_REALISTIC_DURATION,
  "R-TIME-03": R_TIME_03_FINANCIAL_HORIZON_COVERAGE,
  "R-TIME-04": R_TIME_04_START_DATE_NOT_PAST,
};
