// src/utils/complianceCapabilities.js
// ✅ FlowGestio Phase 2 — Compliance Capabilities (LEGO blocks)
//
// Contract expected by ruleEngine.js:
// export function buildPolicyFromCapabilities(snapshot, enabledCapabilityIds)
//   -> returns { enabledCapabilities, params, overrides, extraRules, capabilityRuleOwners }
//
// Notes:
// - Non-aggressive: missing data => PASS
// - No snapshot mutation

export const CAPABILITY_TAGS = {
  ESI: "Environmental & Social Impact",
  FT: "Financial Traceability (Public Funding)",
  CS: "Critical Safety",
  DRP: "Data Residency & Privacy",
  CM: "Cybersecurity Maturity",
  HEALTH: "Health (Privacy & Regulatory Readiness)",
  FINTECH: "Fintech (Security & Continuity)",
};

/* ---------------- Regex (Canada/US) ---------------- */

const cleantechRegex =
  /(cleantech|renewable|solar|wind|hydrogen|battery|storage|carbon|emission|grid|environment|net[- ]?zero|esg|nr?can|eccc|epa|doe|sde|green|clean energy|energy transition)/i;

const publicFundingRegex =
  /(grant|subsidy|public|government|tax credit|incentive|funding|contribution|subvention|irap|pari|cdap|sred|itc|pttc|investment tax credit|doe|eccc|nr?can)/i;

const healthcareRegex =
  /(health|healthcare|hospital|clinic|patient|ehr|emr|clinical|pharmacy|telehealth|medical|lab|diagnos|treatment)/i;

// ✅ Updated: add FINTRAC (CA) + SEC/OCC (US)
const fintechRegex =
  /(fintech|bank|banking|payment|payments|card|pci|wallet|aml|kyc|osfi|fintrac|sec|occ|merchant|settlement|transfer|transaction|core banking)/i;

const cyberRegex =
  /(security|cyber|nist|soc2|iso 27001|incident|breach|threat|vulnerability|pen[- ]?test|dr|disaster recovery|bcp|rto|rpo)/i;

const privacyRegex =
  /(privacy|pia|pipeda|hipaa|phi|pii|personal data|confidential|consent|data protection|data residency|sovereignty|access control)/i;

/* ---------------- Helpers (safe) ---------------- */

function toText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function lower(v) {
  return toText(v).toLowerCase();
}

function safeLower(v) {
  return lower(v);
}

function hasText(v, min = 10) {
  return typeof v === "string" && v.trim().length >= min;
}

function toValidDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

function buildHay(snapshot) {
  const sector = lower(snapshot?.step1?.sector || snapshot?.step1?.industry);
  const title = lower(snapshot?.step1?.title || snapshot?.S1?.title);
  const desc = lower(
    snapshot?.step1?.description ||
      snapshot?.S2?.problem_statement ||
      snapshot?.step1?.problem
  );
  const funding = lower(snapshot?.step1?.funding_source || snapshot?.S9?.funding_source);
  return `${sector} ${title} ${desc} ${funding}`;
}

/**
 * Estimate completion ratio (0..1) using a lightweight heuristic.
 * Non-aggressive: missing fields simply reduce the ratio; never hard-fails.
 */
function estimateCompletionRatio(snapshot) {
  const checks = [
    () => String(snapshot?.S1?.executive_summary_text || snapshot?.step1?.title || "").trim().length >= 20,
    () => String(snapshot?.S2?.problem_statement || snapshot?.step1?.description || "").trim().length >= 50,
    () => String(snapshot?.S7?.recommendation_text || snapshot?.S7?.solution || "").trim().length >= 30,
    () => String(snapshot?.S8?.benefits_list || "").trim().length >= 30,
    () =>
      snapshot?.S9?.capex_total != null ||
      snapshot?.S9?.opex_annual != null ||
      String(snapshot?.S9?.cost_breakdown || "").trim().length >= 30,
    () => String(snapshot?.S10?.financial_analysis_text || "").trim().length >= 50,
    () =>
      String(snapshot?.S11?.risks_text || "").trim().length >= 30 ||
      (Array.isArray(snapshot?.S11?.risks_list) && snapshot?.S11?.risks_list.length > 0),
    () => Array.isArray(snapshot?.S12?.stakeholders_list) && snapshot?.S12?.stakeholders_list.length > 0,
    () => String(snapshot?.S13?.raci_text || snapshot?.S13?.governance_text || "").trim().length >= 30,
  ];

  const total = checks.length;
  const filled = checks.reduce((acc, fn) => (fn() ? acc + 1 : acc), 0);
  return total ? filled / total : 0;
}

/* ---------------- Capabilities ---------------- */

export const CAPABILITIES = {
  // --- CleanTech: Environmental & Social Impact ---
  ESI: {
    id: "ESI",
    title: CAPABILITY_TAGS.ESI,
    isApplicable: (snapshot) => cleantechRegex.test(buildHay(snapshot)),
    params: {
      requireStakeholderRegulatorMention: true,
      requireCommunityMention: true,
      esiRegulatorRegex:
        /(regulator|ministry|agency|environment|eccc|epa|doe|nr?can|utility|ieso|oeb|nepa|ceaa|impact assessment)/i,
      esiCommunityRegex:
        /(community|municipal|city|town|indigenous|first nation|first nations|tribal|stakeholder|public consultation)/i,
    },
    extraRules: {
      "R-ESI-01": {
        id: "R-ESI-01",
        name: "Stakeholders include regulators and community",
        severity: "WARN",
        targetSection: "S12",
        targetField: "stakeholders_list",
        dependencies: ["S12"],
        tags: ["ESI", "stakeholders"],
        check: (snapshot, ctx) => {
          const list = snapshot?.S12?.stakeholders_list;
          if (!Array.isArray(list) || list.length === 0) return true;

          const names = list
            .map((s) => `${toText(s?.role)} ${toText(s?.name)} ${toText(s?.type)}`.toLowerCase())
            .join(" ");

          const needsReg = ctx?.params?.requireStakeholderRegulatorMention !== false;
          const needsCom = ctx?.params?.requireCommunityMention !== false;

          const regRe = ctx?.params?.esiRegulatorRegex;
          const comRe = ctx?.params?.esiCommunityRegex;

          const hasReg = regRe ? regRe.test(names) : true;
          const hasCom = comRe ? comRe.test(names) : true;

          if (needsReg && !hasReg) return false;
          if (needsCom && !hasCom) return false;
          return true;
        },
        message: "CleanTech projects should include regulators and community stakeholders",
        remedyLabel: "Add regulator/community stakeholders in S12 (Stakeholder Register)",
      },

      "R-ESI-02": {
        id: "R-ESI-02",
        name: "Environmental impact / permitting consideration present",
        severity: "INFO",
        targetSection: "S11",
        targetField: "risks_list",
        dependencies: ["S11"],
        tags: ["ESI", "permitting", "risk"],
        check: (snapshot) => {
          const risks = snapshot?.S11?.risks_list;
          const riskText = lower(snapshot?.S11?.risks_text);

          const keyRe =
            /(permit|permitting|environment|assessment|impact|wildlife|wetland|noise|soil|contamination|nepa|ceaa|impact assessment)/i;

          if (Array.isArray(risks) && risks.length > 0) {
            const combined = risks
              .map((r) => `${toText(r?.title)} ${toText(r?.description)} ${toText(r?.category)}`)
              .join(" ")
              .toLowerCase();
            return keyRe.test(combined);
          }

          if (riskText.length >= 50) return keyRe.test(riskText);
          return true;
        },
        message: "Consider environmental/permitting risks in CleanTech projects",
        remedyLabel: "Add at least one permitting/environmental risk in S11",
      },
    },
  },

  // --- Public funding: Financial Traceability ---
  FT: {
    id: "FT",
    title: CAPABILITY_TAGS.FT,
    isApplicable: (snapshot) => publicFundingRegex.test(buildHay(snapshot)),
    params: {
      minCostBreakdownChars: 80,
      fundingMultiSourceRegex:
        /(grant|subsidy|irap|pari|cdap|sred|itc|tax credit|incentive|contribution|doe|eccc|nr?can|municipal|provincial|federal|state)/i,
    },
    extraRules: {
      "R-FT-01": {
        id: "R-FT-01",
        name: "Public funding requires cost breakdown",
        severity: "BLOCK",
        targetSection: "S9",
        targetField: "cost_breakdown",
        dependencies: ["S9"],
        tags: ["FT", "audit-ready", "funding"],
        check: (snapshot, ctx) => {
          const capex = snapshot?.S9?.capex_total;
          const opex = snapshot?.S9?.opex_annual;
          const analysis = snapshot?.S10?.financial_analysis_text;

          const hasAnyCostsOrAnalysis =
            capex != null ||
            opex != null ||
            snapshot?.S9?.cost_breakdown != null ||
            hasText(analysis, 50);

          if (!hasAnyCostsOrAnalysis) return true;

          const breakdown = String(snapshot?.S9?.cost_breakdown || "").trim();
          const minChars = ctx?.params?.minCostBreakdownChars ?? 80;

          return breakdown.length >= minChars;
        },
        message: "Public funding projects require a clear cost breakdown (audit-ready)",
        remedyLabel: "Add a cost breakdown in S9 (categories, assumptions, major line items)",
      },

      "R-FT-02": {
        id: "R-FT-02",
        name: "Benefits narrative supports measurable outcomes",
        severity: "WARN",
        targetSection: "S8",
        targetField: "benefits_list",
        dependencies: ["S8"],
        tags: ["FT", "benefits"],
        check: (snapshot) => {
          const benefits = lower(snapshot?.S8?.benefits_list);
          if (benefits.length < 50) return true;
          return /(jobs|emission|carbon|ghg|kwh|mw|capacity|efficiency|savings|revenue|impact|community|net[- ]?zero|esg)/i.test(
            benefits
          );
        },
        message: "Public funding projects should link benefits to measurable outcomes",
        remedyLabel: "In S8, mention measurable outcomes (e.g., emissions reduced, capacity, jobs, savings)",
      },

      "R-FT-03": {
        id: "R-FT-03",
        name: "Multiple funding sources mentioned (check eligibility constraints)",
        severity: "INFO",
        targetSection: "S9",
        targetField: "funding_source",
        dependencies: ["S9"],
        tags: ["FT", "funding"],
        check: (snapshot, ctx) => {
          const fundingText = lower(snapshot?.step1?.funding_source || snapshot?.S9?.funding_source);
          const breakdownText = lower(snapshot?.S9?.cost_breakdown);
          const hay = `${fundingText} ${breakdownText}`;
          if (hay.trim().length < 20) return true;

          const re = ctx?.params?.fundingMultiSourceRegex || publicFundingRegex;
          const hits = hay.match(re) || [];
          return hits.length < 2;
        },
        message: "Multiple funding sources appear to be referenced — verify stacking / eligibility rules",
        remedyLabel: "Confirm whether multiple grants/credits can be combined for the same costs (avoid ineligible stacking)",
      },
    },
  },

  // --- Critical safety (construction / site work) ---
  CS: {
    id: "CS",
    title: CAPABILITY_TAGS.CS,
    isApplicable: (snapshot) => {
      const hay = buildHay(snapshot);
      return /(construction|infrastructure|facility|plant|field|industrial|installation|site|civil|utility|substation)/i.test(
        hay
      );
    },
    params: {
      minSafetyRisks: 2,
      permittingLikelyDays: 180,
    },
    extraRules: {
      "R-CS-01": {
        id: "R-CS-01",
        name: "Safety risks present (site/field projects)",
        severity: "WARN",
        targetSection: "S11",
        targetField: "risks_list",
        dependencies: ["S11"],
        tags: ["CS", "safety", "risk"],
        check: (snapshot, ctx) => {
          const risks = snapshot?.S11?.risks_list;
          if (!Array.isArray(risks) || risks.length === 0) return true;

          const minSafety = ctx?.params?.minSafetyRisks ?? 2;

          const safetyRisks = risks.filter((r) => {
            const cat = lower(r?.category);
            const txt = `${lower(r?.title)} ${lower(r?.description)}`;
            return /(safety|h&s|hs|osha|injury|hazard|incident|ppe|site|fatal|near miss)/i.test(cat + " " + txt);
          });

          return safetyRisks.length >= minSafety;
        },
        message: "Safety-critical projects should include explicit safety risks",
        remedyLabel: "Add safety-related risks in S11 (hazards, incidents, mitigation, PPE, site safety)",
      },

      "R-CS-02": {
        id: "R-CS-02",
        name: "Permitting timelines considered in schedule",
        severity: "WARN",
        targetSection: "S1",
        targetField: "end_date",
        dependencies: ["S1", "S11"],
        tags: ["CS", "permitting", "schedule"],
        check: (snapshot, ctx) => {
          const risksText = lower(snapshot?.S11?.risks_text);
          const desc = lower(snapshot?.step1?.description || snapshot?.S2?.problem_statement);
          const hay = `${risksText} ${desc}`;

          const permittingMentioned =
            /(permit|permitting|environmental assessment|impact assessment|municipal approval|zoning|inspection)/i.test(
              hay
            );

          if (!permittingMentioned) return true;

          const startRaw = snapshot?.S1?.start_date || snapshot?.step1?.startDate;
          const endRaw = snapshot?.S1?.end_date || snapshot?.step1?.endDate;

          const start = toValidDate(startRaw);
          const end = toValidDate(endRaw);
          if (!start || !end) return true;

          const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          if (!Number.isFinite(days) || days <= 0) return true;

          const threshold = ctx?.params?.permittingLikelyDays ?? 180;
          return days >= threshold;
        },
        message: "Permitting/approval work often requires longer timelines than indicated",
        remedyLabel: "Review schedule realism: permitting/approvals can add months; adjust dates or document assumptions",
      },
    },
  },

  // --- Generic privacy/data residency ---
  DRP: {
    id: "DRP",
    title: CAPABILITY_TAGS.DRP,
    isApplicable: (snapshot) => privacyRegex.test(buildHay(snapshot)),
    params: {},
    extraRules: {
      "R-DRP-01": {
        id: "R-DRP-01",
        name: "Sensitive data implies data residency/location consideration",
        severity: "INFO",
        targetSection: "S2",
        targetField: "problem_statement",
        dependencies: ["S2"],
        tags: ["DRP", "privacy"],
        check: (snapshot) => {
          const problem = lower(snapshot?.S2?.problem_statement || snapshot?.step1?.problem);
          const desc = lower(snapshot?.step1?.description);

          const handlesSensitive =
            /(phi|pii|personal data|customer data|patient|medical record|financial|transaction)/i.test(problem + " " + desc);

          if (!handlesSensitive) return true;

          return /(canada|us|usa|north america|on[- ]?prem|residency|sovereignty|data location|region|hosting)/i.test(
            problem + " " + desc
          );
        },
        message: "Sensitive data projects should acknowledge data location/residency considerations",
        remedyLabel: "In S2, mention data location/hosting constraints (e.g., Canada/US residency, region, sovereignty)",
      },
    },
  },

  // --- Generic cybersecurity maturity ---
  CM: {
    id: "CM",
    title: CAPABILITY_TAGS.CM,
    isApplicable: (snapshot) => cyberRegex.test(buildHay(snapshot)) || fintechRegex.test(buildHay(snapshot)),
    params: {
      requireIncidentResponseMention: true,
    },
    extraRules: {
      "R-CM-01": {
        id: "R-CM-01",
        name: "Incident response approach referenced",
        severity: "WARN",
        targetSection: "S11",
        targetField: "risks_text",
        dependencies: ["S11"],
        tags: ["CM", "security"],
        check: (snapshot, ctx) => {
          if (ctx?.params?.requireIncidentResponseMention === false) return true;

          const risksText = lower(snapshot?.S11?.risks_text);
          const desc = lower(snapshot?.step1?.description);
          const hay = `${risksText} ${desc}`;

          const hasCyberSignals = cyberRegex.test(hay);
          if (!hasCyberSignals) return true;

          return /(incident response|ir plan|breach|security incident|runbook|playbook|containment|forensics)/i.test(hay);
        },
        message: "Security-relevant projects should reference an Incident Response approach",
        remedyLabel: "Add an Incident Response mention (runbook/playbook, breach handling) in risks or governance notes",
      },
    },
  },

  // --- Health pack (soft->hard via shouldEscalate) ---
  HEALTH: {
    id: "HEALTH",
    title: CAPABILITY_TAGS.HEALTH,
    isApplicable: (snapshot) => healthcareRegex.test(buildHay(snapshot)),
    params: {
      minPrivacyStatementChars: 60,
      // ✅ adjustable threshold; default 0.5 (50%)
      healthPrivacyBlockThreshold: 0.5,
    },
    extraRules: {
      "R-HEALTH-01": {
        id: "R-HEALTH-01",
        name: "Patient/clinical data implies privacy assessment mention",
        severity: "WARN", // ✅ draft-friendly
        targetSection: "S11",
        targetField: "risks_text",
        dependencies: ["S2", "S11"],
        tags: ["HEALTH", "privacy"],

        // ✅ Escalate to BLOCK when document is sufficiently filled
        shouldEscalate: (snapshot, ctx) => {
          const ratio = estimateCompletionRatio(snapshot);
          const threshold = ctx?.params?.healthPrivacyBlockThreshold ?? 0.5;
          return ratio >= threshold;
        },

        check: (snapshot, ctx) => {
          const problem = lower(snapshot?.S2?.problem_statement || snapshot?.step1?.problem);
          const desc = lower(snapshot?.step1?.description);

          const hasPHI =
            /(phi|patient data|patient|clinical|ehr|emr|medical record|diagnos|treatment|lab result|health info)/i.test(
              problem + " " + desc
            );
          if (!hasPHI) return true;

          const privacyHay = (
            lower(snapshot?.S11?.risks_text) +
            " " +
            lower(snapshot?.S1?.executive_summary_text) +
            " " +
            problem +
            " " +
            desc
          ).toLowerCase();

          const minChars = ctx?.params?.minPrivacyStatementChars ?? 60;

          const mentionsPrivacy =
            /(privacy impact|pia|pipeda|hipaa|confidentiality|data protection|access control|consent)/i.test(privacyHay);

          if (!mentionsPrivacy) return false;
          return privacyHay.length >= minChars;
        },

        message: "If patient/clinical data is involved, reference privacy/data protection assessment considerations",
        escalatedMessage:
          "Patient/clinical data is involved: privacy/data protection assessment is required before export",
        remedyLabel: "Add a brief privacy note (PIA/data protection/consent/access control) in S11 risks or S1 summary",
      },

      "R-HEALTH-02": {
        id: "R-HEALTH-02",
        name: "Validation/testing approach referenced",
        severity: "WARN",
        targetSection: "S7",
        targetField: "recommendation_text",
        dependencies: ["S7"],
        tags: ["HEALTH", "quality"],
        check: (snapshot) => {
          const rec = lower(snapshot?.S7?.recommendation_text || snapshot?.S7?.solution);
          if (rec.length < 40) return true;

          const clinicalBuild = /(ehr|emr|clinical|workflow|device|software|app|integration)/i.test(rec);
          if (!clinicalBuild) return true;

          return /(validation|verify|verification|test plan|v&v|acceptance criteria|traceability)/i.test(rec);
        },
        message: "Healthcare solutions should reference validation/testing (acceptance criteria, V&V/traceability)",
        remedyLabel: "In S7, add how the solution will be validated (test plan, acceptance criteria, V&V/traceability)",
      },

      "R-HEALTH-03": {
        id: "R-HEALTH-03",
        name: "Governance includes privacy/compliance role (RACI hint)",
        severity: "INFO",
        targetSection: "S13",
        targetField: "raci_roles",
        dependencies: ["S13"],
        tags: ["HEALTH", "governance"],
        check: (snapshot) => {
          const raciText = (
            lower(snapshot?.S13?.raci_text) +
            " " +
            lower(snapshot?.S13?.raci_roles) +
            " " +
            lower(snapshot?.S13?.governance_text)
          ).toLowerCase();

          if (raciText.length < 30) return true;

          return /(privacy officer|regulatory|compliance|quality|risk officer|security officer)/i.test(raciText);
        },
        message: "Consider including a privacy/compliance role in governance (RACI)",
        remedyLabel: "In governance/RACI, add a role for Privacy/Compliance/Quality oversight if applicable",
      },
    },
  },

  // --- Fintech pack ---
  FINTECH: {
    id: "FINTECH",
    title: CAPABILITY_TAGS.FINTECH,
    isApplicable: (snapshot) => fintechRegex.test(buildHay(snapshot)),
    params: {},
    extraRules: {
      "R-FINTECH-01": {
        id: "R-FINTECH-01",
        name: "Incident Response Plan referenced",
        severity: "BLOCK",
        targetSection: "S10",
        targetField: "financial_analysis_text",
        dependencies: ["S10"],
        tags: ["FINTECH", "security"],
        check: (snapshot) => {
          const hay = (
            lower(snapshot?.step1?.sector || snapshot?.step1?.industry) +
            " " +
            lower(snapshot?.step1?.title || snapshot?.S1?.title) +
            " " +
            lower(snapshot?.step1?.description) +
            " " +
            lower(snapshot?.S10?.financial_analysis_text)
          ).toLowerCase();

          if (!fintechRegex.test(hay)) return true;

          return /(incident response|ir plan|breach|security incident|runbook|playbook)/i.test(hay);
        },
        message: "Fintech projects should reference an Incident Response approach",
        remedyLabel: "Add an Incident Response / breach handling reference (runbook/playbook) in S10 or governance notes",
      },

      "R-FINTECH-02": {
        id: "R-FINTECH-02",
        name: "Sensitive data classification acknowledged",
        severity: "WARN",
        targetSection: "S2",
        targetField: "problem_statement",
        dependencies: ["S2"],
        tags: ["FINTECH", "privacy"],
        check: (snapshot) => {
          const text = (lower(snapshot?.S2?.problem_statement || snapshot?.step1?.problem) + " " + lower(snapshot?.step1?.description)).toLowerCase();

          const handlesFinancialData =
            /(transaction|account|balance|payment|card|customer data|pii|personal data|bank|merchant)/i.test(text);

          if (!handlesFinancialData) return true;

          return /(pii|personal data|sensitive|classification|data type|privacy|confidential)/i.test(text);
        },
        message: "If financial customer data is involved, acknowledge data sensitivity/classification",
        remedyLabel: "In S2, mention what sensitive data is handled (PII/transactions) and the privacy/security constraints",
      },

      "R-FINTECH-03": {
        id: "R-FINTECH-03",
        name: "Business continuity (RTO/RPO) considered",
        severity: "INFO",
        targetSection: "S11",
        targetField: "risks_list",
        dependencies: ["S11"],
        tags: ["FINTECH", "continuity"],
        check: (snapshot) => {
          const hay = (
            lower(snapshot?.step1?.title || snapshot?.S1?.title) +
            " " +
            lower(snapshot?.step1?.description) +
            " " +
            lower(snapshot?.S11?.risks_text)
          ).toLowerCase();

          const critical = /(payments|card|bank|real[- ]?time|settlement|critical|availability|uptime)/i.test(hay);
          if (!critical) return true;

          return /(rto|rpo|business continuity|bcp|dr|disaster recovery|failover)/i.test(hay);
        },
        message: "Consider continuity targets (RTO/RPO) for critical financial services",
        remedyLabel: "In S11, add a continuity risk/assumption (RTO/RPO, DR, failover)",
      },
    },
  },
};

/**
 * buildPolicyFromCapabilities(snapshot, enabledCapabilityIds)
 * - merges params, overrides, extraRules
 * - includes only applicable capabilities (non-aggressive)
 * - returns capabilityRuleOwners for UI badge labels in ruleEngine.js
 */
export function buildPolicyFromCapabilities(snapshot, enabledCapabilityIds = []) {
  const safeSnapshot = snapshot ?? {};
  const enabled = [];

  for (const id of enabledCapabilityIds) {
    const cap = CAPABILITIES[id];
    if (!cap) continue;

    if (typeof cap.isApplicable === "function") {
      try {
        if (!cap.isApplicable(safeSnapshot)) continue;
      } catch {
        continue;
      }
    }

    enabled.push(cap);
  }

  const merged = {
    enabledCapabilities: enabled.map((c) => c.id),
    params: {},
    overrides: {},
    extraRules: {},
    capabilityRuleOwners: {},
  };

  for (const cap of enabled) {
    Object.assign(merged.params, cap.params || {});
    Object.assign(merged.overrides, cap.ruleOverrides || {});

    const rules = cap.extraRules || {};
    for (const [ruleId, rule] of Object.entries(rules)) {
      merged.extraRules[ruleId] = rule;
      merged.capabilityRuleOwners[ruleId] = cap.id; // enables "Profile/<capId>" badge
    }
  }

  return merged;
}
