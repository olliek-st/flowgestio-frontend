// src/data/PMI_TBS_MAPPING_V2.js
// Source of truth: "Improved Mapping.docx" (English-only)
// Pills + Explanation MUST match the Word exactly (no generic text).

/**
 * Each section entry contains:
 * - principlesDetailed: [{ code:"P1", text:"P1 – Value: ..."}]
 * - domainsDetailed:    [{ code:"D5", text:"D5 – Value: ..."}]
 * - explanationEn: exact "User Writing Guide (Strategic Insight)"
 *
 * NOTE: Sections are mapped from:
 * 1) Improved Mapping.docx (English-only)
 * 2) Additional TBS→PMBOK7 mapping table provided in chat (English-only)
 * If a section is not present in either source, it will return empty arrays + empty explanation.
 */

export const PMI_TBS_MAPPING_V2 = {
  // -------------------------
  // Executive Summary
  // -------------------------
  EXEC_SUMMARY: {
    principlesDetailed: [
      { code: "P1", text: "P1 – Value: Maximize stakeholder value." },
      { code: "P7", text: "P7 – Objectivity: Use evidence-based decisions." },
    ],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Deliver and sustain value." }],
    explanationEn:
      "Summarize the recommendation and its impact. Present expected value, costs, and main risks objectively to justify the investment to decision-makers.",
  },

  // -------------------------
  // 1. Business Needs & Outcomes
  // -------------------------
  "1": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Align project with organizational goals." }],
    domainsDetailed: [{ code: "D1", text: "D1 – Stakeholders: Serve stakeholder interests." }],
    explanationEn:
      "Anchor the project in the expected value. Explain the business need and who benefits, focusing on the chain: Problem → Change → Measurable Benefits.",
  },

  "1.1": {
    principlesDetailed: [{ code: "P2", text: "P2 – Stewardship: Responsible guardianship." }],
    domainsDetailed: [{ code: "D2", text: "D2 – Planning: Organize work to meet objectives." }],
    explanationEn:
      "Describe the strategic context, including corporate priorities and policies. Show the project is managed responsibly within broader government mandates.",
  },

  "1.1.1": {
    principlesDetailed: [{ code: "P2", text: "P2 – Stewardship: Account for organizational capabilities and limits." }],
    domainsDetailed: [{ code: "D3", text: "D3 – Project Work: Organize work within existing structures." }],
    explanationEn:
      "Describe the current organization, capabilities, systems, and constraints. Explain how this project fits into existing structures and workflows rather than ignoring reality.",
  },

  "1.1.2": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Express the need in terms of value." }],
    domainsDetailed: [{ code: "D1", text: "D1 – Stakeholders: Focus on who is affected and who benefits." }],
    explanationEn:
      "Clarify who experiences the problem and what value the project will create for them. Link the need explicitly to stakeholder pain points and expected improvements.",
  },

  "1.1.3": {
    principlesDetailed: [{ code: "P3", text: "P3 – Systems Thinking: View project within the whole system." }],
    domainsDetailed: [{ code: "D8", text: "D8 – Uncertainty: Recognize emerging risks and pressures." }],
    explanationEn:
      "Present factors forcing change (e.g., regulatory pressure, emerging risks). Show how external pressures interact with internal systems and create urgency or risk.",
  },

  "1.1.4": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Express results in terms of value." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Define performance tracking." }],
    explanationEn:
      "Translate goals into measurable outcomes. Define specific KPIs to prove that the value promised will be tracked post-implementation.",
  },

  "1.2": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Align with strategy." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Position the project in the value portfolio." }],
    explanationEn:
      "Prove the project is not a silo. Link it directly to departmental priorities or government-wide mandates to justify why this project is a priority now.",
  },

  "1.3.1": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Evidence-based definitions." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Define the performance gap." }],
    explanationEn:
      "Clearly define the gap between the current and desired state using objective data. This forms the basis for all value-based decisions later in the document.",
  },

  "1.3.2": {
    principlesDetailed: [{ code: "P9", text: "P9 – Quality: Meet specified requirements." }],
    domainsDetailed: [{ code: "D6", text: "D6 – Development Approach: Translate needs into solution requirements." }],
    explanationEn:
      "Outline high-level prioritized requirements. Show how meeting these will satisfy quality standards and user needs to deliver the intended value.",
  },

  // -------------------------
  // 2. Options Analysis
  // -------------------------
  "2": {
    principlesDetailed: [
      { code: "P6", text: "P6 – Critical Thinking: Analyze options logically." },
      { code: "P7", text: "P7 – Objectivity: Use evidence to compare." },
    ],
    domainsDetailed: [],
    explanationEn:
      "Deconstruct the complexity of the choice. Use a structured, critical process to compare different ways of achieving outcomes rather than just listing options.",
  },

  "2.2.1": {
    principlesDetailed: [{ code: "P12", text: "P12 – Adaptability: Understand why change is needed." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Establish the performance baseline." }],
    explanationEn:
      "Establish the “current state” baseline. You cannot measure progress if you do not define the starting point of the performance domain.",
  },

  "2.3": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Unbiased, evidence-based choice." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Select the best value option." }],
    explanationEn:
      "Use objective criteria to select the best option. Show that the chosen path offers the highest valuetorisk ratio for stakeholders.",
  },

  // -------------------------
  // 3. Viable Options (selected sub-sections from Word)
  // -------------------------
  "3.1.1": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Align with strategy." }],
    domainsDetailed: [{ code: "D2", text: "D2 – Planning: Align with architectural and program plans." }],
    explanationEn:
      "Describe how this specific option fits the organization's business and program architecture. Prove it supports planned results and isn’t just a standalone technical fix.",
  },

  "3.1.2": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Express results in terms of value." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Outcome analysis." }],
    explanationEn:
      "Prepare an outcome analysis for each option. Use a table to show exactly how this option satisfies the business outcomes defined earlier.",
  },

  "3.2": {
    principlesDetailed: [{ code: "P2", text: "P2 – Stewardship: Responsible guardianship." }],
    domainsDetailed: [{ code: "D2", text: "D2 – Planning: Plan costs and funding over the life cycle." }],
    explanationEn:
      "Provide a total cost of ownership (TCO). Include setup, ongoing lifecycle costs, and stakeholder compliance costs. Show fiscal responsibility over the entire investment life.",
  },

  "3.3": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Evidence-based weighting." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Weighing benefits vs. costs." }],
    explanationEn:
      "Conduct a rigorous CBA for each option. Weigh the financial and nonfinancial benefits against costs and risks to justify the economic viability.",
  },

  "3.4.1": {
    principlesDetailed: [{ code: "P5", text: "P5 – Integrity: Ethical acquisition." }],
    domainsDetailed: [{ code: "D1", text: "D1 – Stakeholders: Manage supplier and market relationships." }],
    explanationEn:
      "Specify the procurement vehicle (e.g., existing standing offer) and exactly how it will be used. Focus on fairness, transparency, and market stewardship in selection.",
  },

  "3.4.2": {
    principlesDetailed: [{ code: "P8", text: "P8 – Tailoring: Adapt approach to context." }],
    domainsDetailed: [{ code: "D2", text: "D2 – Planning: Milestones and workstreams." }],
    explanationEn:
      "Identify core work streams and milestones. Show that the chosen delivery approach (Agile, Waterfall, hybrid) is realistic for this option’s complexity and uncertainty.",
  },

  "3.4.3": {
    principlesDetailed: [{ code: "P3", text: "P3 – Systems Thinking: Internal/External impacts." }],
    domainsDetailed: [{ code: "D1", text: "D1 – Stakeholders: Impact assessment." }],
    explanationEn:
      "Assess how this option affects the ecosystem. Consider internal staff impacts and external stakeholder/citizen perspectives. Use an impact matrix for clarity.",
  },

  "3.4.4": {
    principlesDetailed: [{ code: "P10", text: "P10 – Responsibility: Organizational capability." }],
    domainsDetailed: [{ code: "D3", text: "D3 – Project Work: Management capacity." }],
    explanationEn:
      "Prove the organization can actually deliver this. Use recognized capacity assessments or prior experience to justify your ability to manage an investment of this scale.",
  },

  "3.5.1": {
    principlesDetailed: [{ code: "P11", text: "P11 – Uncertainty: Recognize variability and risk." }],
    domainsDetailed: [{ code: "D8", text: "D8 – Uncertainty: Risk attributes." }],
    explanationEn:
      "Provide a summary table for each option: probability, impact, and mitigation. Focus on the “Outcome” risk—the risk that the value isn't realized.",
  },

  "3.5.2": {
    principlesDetailed: [{ code: "P12", text: "P12 – Adaptability: Response development." }],
    domainsDetailed: [{ code: "D8", text: "D8 – Uncertainty: Ongoing risk management." }],
    explanationEn:
      "If you have an Outcome Management Risk Register, link it here. Show you have a proactive system to monitor and respond to risks as the project evolves.",
  },

  "3.6": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Industry-standard comparisons." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Performance benchmarking." }],
    explanationEn:
      "Compare your option against industry standards or peer jurisdictions. If no benchmark exists, explain why, and justify how you will still validate performance.",
  },

  "3.7": {
    principlesDetailed: [{ code: "P2", text: "P2 – Stewardship: Compliance with policies." }],
    domainsDetailed: [{ code: "D3", text: "D3 – Project Work: Standards alignment." }],
    explanationEn:
      "Describe impacts on existing policies and standards. Identify limitations or constraints imposed by TBS or departmental standards and how they affect the option’s feasibility.",
  },

  "3.8": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Balanced evaluation." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Net value determination." }],
    explanationEn:
      "Summarize the Pros and Cons (financial and nonfinancial). This is the final objective filter to determine which option provides the best net value to the Crown.",
  },

  // -------------------------
  // 4. Risk Assessment (high level)
  // -------------------------
  "4": {
    principlesDetailed: [
      { code: "P11", text: "P11 – Uncertainty: Recognize and manage uncertainty." },
      { code: "P12", text: "P12 – Adaptability: Respond to evolving conditions." },
    ],
    domainsDetailed: [{ code: "D8", text: "D8 – Uncertainty: Manage risk over time." }],
    explanationEn:
      "Demonstrate resilience. Describe how the team will monitor, adapt, and pivot if risks materialize during execution to protect the intended project value.",
  },

  // -------------------------
  // 5.* (selected sub-sections from Word)
  // -------------------------
  "5.1": {
    principlesDetailed: [{ code: "P8", text: "P8 – Tailoring: Adapt processes to the project." }],
    domainsDetailed: [{ code: "D3", text: "D3 – Project Work: Define work management." }],
    explanationEn:
      "Justify your methodology choice. Show how you have tailored your processes to fit the project's specific size, complexity, and culture.",
  },

  "5.2": {
    principlesDetailed: [{ code: "P10", text: "P10 – Responsibility: Clear roles and accountability." }],
    domainsDetailed: [{ code: "D1", text: "D1 – Stakeholders: Structure around key interests." }],
    explanationEn:
      "Establish clear roles (RACI). Good governance ensures that stakeholders are engaged and decisions are made responsibly.",
  },

  "5.3": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Plan for sustained value tracking." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Specify tracking mechanisms." }],
    explanationEn:
      "Explain the mechanisms to track benefits (e.g., 6–24 months postlaunch). Identify who is responsible for sustaining the results after project delivery.",
  },

  "5.4": {
    principlesDetailed: [{ code: "P5", text: "P5 – Integrity: Ethical and transparent acquisition." }],
    domainsDetailed: [{ code: "D3", text: "D3 – Project Work: Vendor integration." }],
    explanationEn:
      "Describe contract types and selection criteria. Use integrity to show how the strategy protects the organization from contractual risks and dependencies.",
  },

  "5.5": {
    principlesDetailed: [
      { code: "P3", text: "P3 – Systems Thinking: Manage organizational impacts." },
      { code: "P6", text: "P6 – Leadership: Enable change through leadership." },
    ],
    domainsDetailed: [],
    explanationEn:
      "Describe communication and training activities. Explain how you will enable change to ensure users adopt the new system, as value depends on adoption.",
  },

  // -------------------------
  // 1.3 / 1.4 (added from TBS→PMBOK7 mapping table)
  // -------------------------
  "1.3": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Connect need to value outcomes." }],
    domainsDetailed: [{ code: "D1", text: "D1 – Stakeholders: Clarify stakeholder impacts." }],
    explanationEn:
      "Consolidate problem, assumptions, constraints, and dependencies into a complete business need picture. Show how they collectively justify project initiation.",
  },

  "1.3.3": {
    principlesDetailed: [{ code: "P11", text: "P11 – Uncertainty: Document key uncertainties." }],
    domainsDetailed: [{ code: "D8", text: "D8 – Uncertainty: Flag variables that must hold true." }],
    explanationEn:
      "List critical assumptions (demand, approvals, technology availability) that must hold true. Be explicit about what happens if they fail.",
  },

  "1.3.4": {
    principlesDetailed: [{ code: "P2", text: "P2 – Stewardship: Acknowledge organizational limits." }],
    domainsDetailed: [{ code: "D2", text: "D2 – Planning: Define boundaries for planning." }],
    explanationEn:
      "Document hard constraints (budget, time, regulation, capacity). Explain how they shape the solution space and option analysis.",
  },

  "1.3.5": {
    principlesDetailed: [{ code: "P3", text: "P3 – Systems Thinking: Map interdependencies." }],
    domainsDetailed: [{ code: "D3", text: "D3 – Project Work: Identify work sequence constraints." }],
    explanationEn:
      "Identify key dependencies (other projects, approvals, systems, partners). Show their impact on timing and delivery approach.",
  },

  "1.4": {
    principlesDetailed: [{ code: "P9", text: "P9 – Quality: Define what delivers value." }],
    domainsDetailed: [{ code: "D6", text: "D6 – Development Approach: Establish solution boundaries." }],
    explanationEn:
      "Define the complete scope picture: boundaries, stakeholders, and deliverables that create the promised value.",
  },

  "1.4.1": {
    principlesDetailed: [{ code: "P8", text: "P8 – Tailoring: Define realistic scope limits." }],
    domainsDetailed: [{ code: "D6", text: "D6 – Development Approach: In/out scope clarity." }],
    explanationEn:
      "Clearly state what's in scope vs out of scope. Use this to prevent scope creep and focus on value delivery.",
  },

  "1.4.2": {
    principlesDetailed: [{ code: "P10", text: "P10 – Responsibility: Identify key influencers." }],
    domainsDetailed: [{ code: "D1", text: "D1 – Stakeholders: Map interests and influence." }],
    explanationEn:
      "Identify key stakeholders by role, interest level, and influence. This informs communication and risk planning.",
  },

  // -------------------------
  // 4.* (added from TBS→PMBOK7 mapping table)
  // -------------------------
  "4J": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Evidence-based recommendation." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Prove best net value option." }],
    explanationEn:
      "Synthesize analysis to justify one clear recommendation. Answer \"Why this option over all others?\"",
  },

  "4.1": {
    principlesDetailed: [{ code: "P6", text: "P6 – Critical Thinking: Synthesize analysis findings." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Final value ranking." }],
    explanationEn:
      "Present final comparison table showing why the preferred option wins on value, cost, risk, and feasibility.",
  },

  "4.2": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Demonstrate superior value proposition." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: Prove optimal solution choice." }],
    explanationEn:
      "Present the winning option as the best path to value. Link back to business outcomes and strategic alignment.",
  },

  "4.2.1": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Clear, unambiguous choice." }],
    domainsDetailed: [{ code: "D5", text: "D5 – Value: State the value-maximizing decision." }],
    explanationEn:
      "State the specific recommendation clearly. Include the decision requested (Approve, Reject, More Analysis).",
  },

  "4.2.2": {
    principlesDetailed: [{ code: "P7", text: "P7 – Objectivity: Transparent decision criteria." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Criteria-based selection." }],
    explanationEn:
      "List 3-5 key factors that tipped the decision (strategic fit, cost, risk profile, capacity). Rank their relative weight.",
  },

  "4.2.3": {
    principlesDetailed: [{ code: "P2", text: "P2 – Stewardship: Full cost transparency." }],
    domainsDetailed: [{ code: "D2", text: "D2 – Planning: Lifecycle cost commitment." }],
    explanationEn:
      "Provide final cost summary (CAPEX + OPEX) for preferred option. Include key cost assumptions and confidence level.",
  },

  "4.2.4": {
    principlesDetailed: [{ code: "P11", text: "P11 – Uncertainty: Summarize key uncertainties." }],
    domainsDetailed: [{ code: "D8", text: "D8 – Uncertainty: Risk profile of preferred option." }],
    explanationEn:
      "Present top 3-5 risks for preferred option with mitigations. Focus on outcome risks (value not realized).",
  },

  "4.2.5": {
    principlesDetailed: [{ code: "P8", text: "P8 – Tailoring: High-level delivery roadmap." }],
    domainsDetailed: [{ code: "D2", text: "D2 – Planning: Phased delivery approach." }],
    explanationEn:
      "Outline high-level phases, milestones, and timeline. Show realistic path from approval to benefits realization.",
  },

  // -------------------------
  // 5.2.1 + 5.6 (added from TBS→PMBOK7 mapping table)
  // -------------------------
  "5.2.1": {
    principlesDetailed: [{ code: "P10", text: "P10 – Responsibility: Define review accountability." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Stage-gate reviews." }],
    explanationEn:
      "Define formal review points (gates) and success criteria. Specify who approves progression between phases.",
  },

  "5.6": {
    principlesDetailed: [{ code: "P1", text: "P1 – Value: Track value realization over time." }],
    domainsDetailed: [{ code: "D4", text: "D4 – Measurement: Post-project KPI tracking." }],
    explanationEn:
      "Define how benefits will be measured post-implementation (6, 12, 24 months). Assign benefit owners and reporting cadence.",
  },

};

// Aliases: schema section.id -> mapping key above
// IMPORTANT: keep aligned with BC01_SCHEMA.v2.ts section ids
export const SECTION_ID_ALIASES_V2 = {
  S1_EXEC_SUMMARY: "EXEC_SUMMARY",

  // Phase I — Strategic Context
  S1_0_BUS_NEEDS: "1",
  S1_1_STRATEGIC_ENV: "1.1",
  S1_1_1_ORG_OVERVIEW: "1.1.1",
  S1_1_2_BUSINESS_NEED: "1.1.2",
  S1_1_3_DRIVERS: "1.1.3",
  S1_1_4_OUTCOMES: "1.1.4",
  S1_2_STRATEGIC_FIT: "1.2",

  // Detailed Need (only entries present in the Word)
  S1_3_1_PROBLEM: "1.3.1",
  S1_3_2_REQS: "1.3.2",

  // Phase II — Analysis & Recommendation
  S2_OPTIONS_ANALYSIS: "2",
  S2_2_1_STATUS_QUO: "2.2.1",
  S2_3_SCREENING: "2.3",

  // Phase II / III items listed in Word
  S3_1_1_STRATEGIC_ALIGNMENT: "3.1.1",
  S3_1_2_ALIGNMENT_OUTCOMES: "3.1.2",
  S3_2_COSTS: "3.2",
  S3_3_CBA: "3.3",
  S3_4_1_PROCUREMENT: "3.4.1",
  S3_4_2_SCHEDULE: "3.4.2",
  S3_4_3_IMPACT: "3.4.3",
  S3_4_4_CAPACITY: "3.4.4",
  S3_5_1_RISK_SUMMARY: "3.5.1",
  S3_5_2_RISK_REGISTER: "3.5.2",
  S3_6_BENCHMARK: "3.6",
  S3_7_POLICY_STANDARDS: "3.7",
  S3_8_PROS_CONS: "3.8",

  // Risk Assessment
  S4_RISK_ASSESSMENT: "4",

  // Management & Capacity (selected in Word)
  S5_1_PM_STRATEGY: "5.1",
  S5_2_GOVERNANCE: "5.2",
  S5_3_BENEFIT_REALIZATION: "5.3",
  S5_4_PROCUREMENT_STRATEGY: "5.4",
  S5_5_CHANGE_MGMT: "5.5",

  // Phase I — Detailed Need & Scope (added from table)
  S1_3_DETAILED_BUSINESS_NEED: "1.3",
  S1_3_3_ASSUMPTIONS: "1.3.3",
  S1_3_4_CONSTRAINTS: "1.3.4",
  S1_3_5_DEPENDENCIES: "1.3.5",
  S1_4_SCOPE: "1.4",
  S1_4_1_BOUNDARIES: "1.4.1",
  S1_4_2_STAKEHOLDERS: "1.4.2",

  // Phase IV — Justification & Recommendation (added from table)
  S4_JUSTIFICATION_RECOMMENDATION: "4J",
  S4_1_COMPARISON_SUMMARY: "4.1",
  S4_2_PREFERRED_OPTION: "4.2",
  S4_2_1_RECOMMENDATION: "4.2.1",
  S4_2_2_DECIDING_FACTORS: "4.2.2",
  S4_2_3_COSTS: "4.2.3",
  S4_2_4_RISKS: "4.2.4",
  S4_2_5_IMPLEMENTATION_PLAN: "4.2.5",

  // Phase V — Review & Measurement (added from table)
  S5_2_1_PROJECT_REVIEW_STRATEGY: "5.2.1",
  S5_6_PERFORMANCE_MEASUREMENT_STRATEGY: "5.6",

};

export function getPmiLensForSectionV2(section) {
  const empty = {
    principles: [],
    domains: [],
    principlesDetailed: [],
    domainsDetailed: [],
    explanationEn: "",
  };

  if (!section) return empty;

  const key =
    SECTION_ID_ALIASES_V2[section.id] ||
    (section.ref && PMI_TBS_MAPPING_V2[section.ref] ? section.ref : null);

  if (!key) return empty;

  const entry = PMI_TBS_MAPPING_V2[key];
  if (!entry) return empty;

  // Backward compatibility
  const principles = (entry.principlesDetailed || []).map((x) => x.text).filter(Boolean);
  const domains = (entry.domainsDetailed || []).map((x) => x.text).filter(Boolean);

  return {
    principles,
    domains,
    principlesDetailed: entry.principlesDetailed || [],
    domainsDetailed: entry.domainsDetailed || [],
    explanationEn: entry.explanationEn || "",
  };
}
