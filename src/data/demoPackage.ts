// src/data/demoPackage.ts
// Full PMI-style sample charter data for the Demo page

export const demoRaw = {
  project: {
    name: "Northern Ontario Mobile Health Expansion",
    dates: { start: "2025-01-15", finish: "2026-12-15" },
    pm: "Olivier Betu",
    sponsor: "City of Sudbury – Public Health",
  },
  charter: {
    // Replaces Business Case summary inside the Charter
    projectPurpose:
      "Provide accessible primary care to underserved communities via two mobile clinics, improving preventive coverage and reducing average appointment wait times by 30% over 2024 baseline.",

    objectives: [
      { id: "O1", text: "Deploy two mobile units", metric: "units commissioned", target: "2 by Mar 2026" },
      { id: "O2", text: "Increase capacity", metric: "patients/quarter", target: "≥1,200 by Q4 2026" },
      { id: "O3", text: "Reduce wait time", metric: "avg wait time", target: "−30% vs 2024 baseline" },
    ],

    highLevelRequirements: [
      "Clinic vehicles configured to provincial clinical standards",
      "EMR integration for patient registration & records",
      "Accessible scheduling system (web + phone)",
      "Data privacy and security compliance",
    ],

    highLevelScope: {
      inclusions: [
        "Mobile clinic procurement",
        "Clinical staffing & training",
        "Routing & scheduling system",
        "Community outreach & education",
      ],
      exclusions: [
        "Hospital inpatient services",
        "Long‑term care beds",
      ],
    },

    successCriteria: [
      "Objectives O1–O3 achieved within plan dates",
      "Budget variance ≤ 5%",
      "Patient CSAT ≥ 4.2/5 by Q4 2026",
    ],

    assumptions: [
      "Provincial grant funding approved",
      "Vendor delivery timelines hold",
    ],

    constraints: [
      "Annual budget cap $2.1M",
      "Clinical licensing requirements",
    ],

    milestones: [
      { id: "M1", name: "Funding approval", date: "2025-02-28" },
      { id: "M2", name: "Vendor contract signed", date: "2025-06-15" },
      { id: "M3", name: "Unit 1 in service", date: "2026-03-01" },
      { id: "M4", name: "Unit 2 in service", date: "2026-06-01" },
    ],

    // Keep this name in RAW; ViewModel maps it to vm.charter.risks
    initialRisks: [
      { id: "R1", cause: "Regulatory review backlog", event: "Licensing delayed", impactDesc: "Go‑live slippage" },
      { id: "R2", cause: "Supply chain variability", event: "Vehicle delivery late", impactDesc: "Schedule replan" },
    ],

    stakeholders: [
      { id: "S1", name: "City of Sudbury", role: "Sponsor", interest: "H", influence: "H" },
      { id: "S2", name: "Regional Health Authority", role: "Partner", interest: "H", influence: "M" },
      { id: "S3", name: "Community Partners", role: "Advisory", interest: "M", influence: "L" },
    ],

    // Simple budget summary (for sample)
    budgetSummary: {
      currency: "CAD",
      capex: 1400000,
      opex: 550000,
      contingency: 150000,
      total: 2100000,
    },

    // PM authority + authorization/sign-off section
    pmAuthority:
      "The Project Manager is authorized to plan, execute, and control project activities within the approved scope, schedule, and budget, and to escalate exceptions to the Sponsor.",

    approvals: {
      sponsorName: "Dr. Jane Smith",
      sponsorRole: "Director, Public Health",
      pmName: "Olivier Betu",
      approvalDate: "2025-01-12",
    },
  },
};

export const demoTree = {
  id: "ROOT",
  title: "Doc",
  include: true,
  children: [
    { id: "CH-EXEC", title: "Executive Summary", include: true },
    {
      id: "CH-CHARTER",
      title: "Project Charter",
      include: true,
      children: [
        { id: "CH-SCOPE", title: "High-Level Scope", include: true },
        { id: "CH-ASSUMPTIONS", title: "Assumptions & Constraints", include: true },
        { id: "CH-MILESTONES", title: "Milestones", include: true },
        { id: "CH-RISKS", title: "Initial Risks", include: true },
        { id: "CH-STAKEHOLDERS", title: "Stakeholders", include: true },
      ],
    },
  ],
} as const;
