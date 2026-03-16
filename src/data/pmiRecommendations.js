// src/data/pmiRecommendations.js

/**
 * PMI/PMBOK Document Recommendations
 * Static fallback that never fails.
 *
 * Notes:
 * - IDs align with FlowGestio document IDs (BC-01, PC-01, etc.)
 * - Content is intentionally short + practical for MVP
 * - Perplexity remains a bonus enrichment, not a dependency
 */

export const PMI_RECOMMENDATIONS = {
  default: [
    {
      id: "BC-01",
      label: "Business Case",
      description: "Foundation document for investment decision",
      required: true,
      estimatedTime: "45–60 min",
      rationale:
        "Justifies the investment and supports the go/no-go decision by demonstrating value, feasibility, and alignment.",
      pmbokReference: "PMBOK® Guide: Business Case / Business Documents (organizational)",
      useCases: ["Stakeholder approval", "Budget justification", "Go/No-Go decision"],
    },
    {
      id: "PC-01",
      label: "Project Charter",
      description: "Formally authorizes the project",
      required: false,
      estimatedTime: "30–45 min",
      rationale:
        "Formally authorizes the project and provides the project manager with authority. Captures high-level scope, assumptions, and constraints.",
      pmbokReference: "PMBOK® Guide: Develop Project Charter",
      useCases: ["Project kickoff", "Team formation", "Authority assignment"],
    },
    {
      id: "RP-01",
      label: "Risk Management Plan",
      description: "Systematic approach to managing project risks",
      required: false,
      estimatedTime: "25–40 min",
      rationale:
        "Defines how risks will be identified, analyzed, responded to, and monitored—especially helpful for complex or compliance-driven projects.",
      pmbokReference: "PMBOK® Guide: Plan Risk Management",
      useCases: ["High-risk initiatives", "Regulatory compliance", "Risk governance"],
    },
    {
      id: "SP-01",
      label: "Stakeholder Engagement Plan",
      description: "Strategy for stakeholder engagement",
      required: false,
      estimatedTime: "20–35 min",
      rationale:
        "Defines strategies to engage stakeholders based on their needs, expectations, and influence—critical when multiple departments are impacted.",
      pmbokReference: "PMBOK® Guide: Plan Stakeholder Engagement",
      useCases: ["Multi-department projects", "Change adoption", "Executive alignment"],
    },
    {
      id: "CP-01",
      label: "Communication Management Plan",
      description: "Defines project communication requirements",
      required: false,
      estimatedTime: "20–30 min",
      rationale:
        "Defines what information is communicated, to whom, when, and how—improves alignment and reduces surprises for stakeholders.",
      pmbokReference: "PMBOK® Guide: Plan Communications Management",
      useCases: ["Distributed teams", "Formal reporting", "Stakeholder updates"],
    },
  ],

  // MVP: can return default for all. Kept for future expansion.
  new_development: [],
  system_upgrade: [],
  process_improvement: [],
  compliance_initiative: [],
};

/**
 * Get PMI recommendations for a project type.
 * Always returns valid data (never fails).
 */
export function getPmiDocsForProjectType(projectType) {
  const list = PMI_RECOMMENDATIONS[projectType];
  if (Array.isArray(list) && list.length > 0) return list;
  return PMI_RECOMMENDATIONS.default;
}

/**
 * Lookup helper (useful for mapping selection → doc metadata).
 */
export function getDocumentById(docId) {
  const buckets = Object.values(PMI_RECOMMENDATIONS);
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    const found = bucket.find((d) => d.id === docId);
    if (found) return found;
  }
  return null;
}
