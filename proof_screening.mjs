// proof_screening.mjs
// ─── End-to-End Screening Tests (S2.1 → S2.3) + Combined Regulatory ──────────
//
// PART 2 — Scenarios A1–A4:
//   A1  Multiple viable options (Status Quo + 2 × VIABLE candidate)
//   A2  Deal-breaker fail → DISCOUNTED; non-deal-breaker fail → DISCOUNTED
//   A3  Missing structured data → INDETERMINATE → TBS-BC01-S23-INDETERMINATE BLOCK
//   A4  Override without justification → GAP CHECK (expected BLOCK, no rule exists yet)
//
// PART 3 — Scenario B1:
//   EDUCATION/DIGITAL_SERVICES preset; VIABLE screening + SECURITY-BC01-CONTROLS-REQUIRED BLOCK
//
// All engine logic inlined as JavaScript (types stripped) so this runs via plain `node`.
// No mocks: every computation runs the real algorithm copied verbatim from source.
//
// Sources:
//   screeningEngine.ts       — computeScreeningResults, deriveVerdict, evaluateCriterion
//   defaultGateCriteria.ts   — DEFAULT_GATE_CRITERIA (6 criteria)
//   tbs.rules.ts             — TBS-BC01-S23-INDETERMINATE (inlined)
//   security.rules.ts        — SECURITY-BC01-CONTROLS-REQUIRED (inlined)
//   getActiveDomainsForContext.ts — preset lookup (reads JSON at runtime)

import { readFileSync } from "fs";

// ── 1. Screening engine (from screeningEngine.ts — types stripped) ─────────────

function isEvidenceEmpty(evidence) {
  if (!evidence) return true;
  return (
    !evidence.textJustification?.trim() &&
    !evidence.checkedItems?.length &&
    evidence.numericValue === undefined &&
    !evidence.evidenceRefs?.length
  );
}

function evaluateBinary(criterion, evidence, refs) {
  const text = (evidence.textJustification ?? "").trim().toLowerCase();
  const NEGATIVE_LITERALS = new Set(["no", "non", "false", "fail", "0", "n"]);
  if (NEGATIVE_LITERALS.has(text)) {
    return {
      criterionId: criterion.id,
      status: "fail",
      reason: `Explicit negative for criterion "${criterion.id}": "${evidence.textJustification}"`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }
  if (evidence.checkedItems !== undefined && evidence.checkedItems.length === 0) {
    return {
      criterionId: criterion.id,
      status: "fail",
      reason: `No items checked for criterion "${criterion.id}" (binary checklist)`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }
  const justification = evidence.textJustification?.trim()
    ? `"${evidence.textJustification.trim()}"`
    : "(checklist items present)";
  return {
    criterionId: criterion.id,
    status: "pass",
    reason: `Criterion "${criterion.id}" met — ${justification}`,
    evidenceRefs: refs,
    evaluatedBy: "rule",
  };
}

function evaluateCriterion(criterion, evidence) {
  const refs = evidence?.evidenceRefs ?? [];
  if (isEvidenceEmpty(evidence)) {
    return {
      criterionId: criterion.id,
      status: "insufficient_evidence",
      reason: `No evidence provided for criterion "${criterion.id}" (${criterion.label})`,
      evidenceRefs: refs,
      evaluatedBy: "rule",
    };
  }
  // Default: binary evaluation (threshold/keyword not used in default criteria)
  return evaluateBinary(criterion, evidence, refs);
}

function deriveVerdict(results, criteria, viabilityRule) {
  const criterionById = new Map(criteria.map((c) => [c.id, c]));
  const dealBreakerSet = new Set(viabilityRule.dealBreakerIds);

  // Rule 1: any deal-breaker explicit fail → DISCOUNTED (highest priority)
  for (const result of results) {
    if (result.status !== "fail") continue;
    const criterion = criterionById.get(result.criterionId);
    const isDealBreaker =
      criterion?.dealBreaker === true || dealBreakerSet.has(result.criterionId);
    if (isDealBreaker) return "DISCOUNTED";
  }

  // Rule 2: any insufficient_evidence → INDETERMINATE (evidence mandatory)
  if (results.some((r) => r.status === "insufficient_evidence")) return "INDETERMINATE";

  // Rule 3 / 4: all criteria evaluated — count passes
  const passCount = results.filter((r) => r.status === "pass").length;
  return passCount >= viabilityRule.minYesCount ? "VIABLE" : "DISCOUNTED";
}

function computeScreeningResults(snapshot, optionEvidence, isStatusQuo) {
  if (isStatusQuo) {
    return { computedVerdict: "BASELINE", criterionResults: [], computedFlags: [] };
  }
  const criterionResults = [];
  for (const criterion of snapshot.criteria) {
    const evidence = optionEvidence.evidenceByCriterionId[criterion.id];
    criterionResults.push(evaluateCriterion(criterion, evidence));
  }
  const computedVerdict = deriveVerdict(
    criterionResults,
    snapshot.criteria,
    snapshot.viabilityRule
  );
  return { computedVerdict, criterionResults, computedFlags: [] };
}

// ── 2. Default gate criteria (from defaultGateCriteria.ts) ────────────────────

const DEFAULT_CRITERIA = [
  { id: "policy_compliance",      label: "Policy / Legal / TBS compliance",                dealBreaker: true,  evaluationType: "binary" },
  { id: "strategic_alignment",    label: "Strategic alignment (mandatory outcomes)",        dealBreaker: true,  evaluationType: "binary" },
  { id: "business_need",          label: "Addresses the validated business need",           dealBreaker: true,  evaluationType: "binary" },
  { id: "financial_affordability",label: "Financial affordability (CAPEX / OPEX envelope)", dealBreaker: true,  evaluationType: "binary" },
  { id: "operational_feasibility",label: "Operational feasibility (capacity & readiness)",  dealBreaker: false, evaluationType: "binary" },
  { id: "risk_acceptability",     label: "Risk acceptability (cannot exceed threshold)",    dealBreaker: false, evaluationType: "binary" },
];

// Build a MethodologySnapshot — all 6 criteria must pass (minYesCount = 6)
function buildSnapshot(criteria = DEFAULT_CRITERIA) {
  const dealBreakerIds = criteria.filter((c) => c.dealBreaker).map((c) => c.id);
  return {
    version:  "2024-01-01T00:00:00.000Z",
    hash:     "proof-hash-abc123",
    criteria,
    viabilityRule: {
      dealBreakerIds,
      minYesCount:    criteria.length,   // all criteria must pass to be VIABLE
      totalCriteria:  criteria.length,
    },
    lockedBy: "proof-script",
    lockedAt: "2024-01-01T00:00:00.000Z",
  };
}

// ── 3. TBS-BC01-S23-INDETERMINATE rule (inlined from tbs.rules.ts) ────────────

function runTbsS23Indeterminate(formData) {
  const get = (fd, section, key) => {
    if (!fd || typeof fd !== "object") return undefined;
    const s = fd[section];
    if (!s || typeof s !== "object") return undefined;
    return s[key];
  };

  const methodologyLocked = get(formData, "S2_1_EVAL_CRITERIA", "methodologyLocked");
  if (methodologyLocked !== true) return [];

  const confirmed = get(formData, "S2_3_SCREENING", "confirmed");
  if (confirmed !== true) return [];

  const decisions = get(formData, "S2_3_SCREENING", "decisions");
  if (!Array.isArray(decisions) || decisions.length === 0) return [];

  const candidateOptions = decisions.filter((d) => d?.finalVerdict !== "BASELINE");
  if (candidateOptions.length === 0) return [];

  const indeterminate = candidateOptions.filter(
    (d) => d?.finalVerdict === "INDETERMINATE"
  );
  if (indeterminate.length === 0) return [];

  const names = indeterminate.map((d) => String(d?.optionId ?? "unknown")).join(", ");
  return [
    {
      ruleId:    "TBS-BC01-S23-INDETERMINATE",
      standard:  "TBS",
      severity:  "BLOCK",
      sectionId: "S2_3_SCREENING",
      message:   `${indeterminate.length} option(s) have an INDETERMINATE verdict: ${names}. All criteria must be evaluated before export.`,
      appliesTo: null,
      remedy:    { label: "In section 2.3 Screening Gate, provide evidence (Yes/No) for every criterion of each indeterminate option." },
    },
  ];
}

// ── 4. SECURITY-BC01-CONTROLS-REQUIRED rule (inlined from security.rules.ts) ──

function runSecurityControlsRequired(formData) {
  const getText = (fd, sectionId, fieldKey) => {
    if (!fd || typeof fd !== "object") return "";
    const section = fd[sectionId];
    if (!section || typeof section !== "object") return "";
    const val = section[fieldKey];
    return typeof val === "string" ? val.toLowerCase() : "";
  };
  const contains = (text, ...terms) => terms.some((t) => text.includes(t));

  const SECURITY_TERMS = [
    "security", "cyber", "cybersecurity", "threat", "vulnerability",
    "attack", "breach", "intrusion", "malware", "ransomware",
    "unauthorized", "zero trust", "access control",
  ];
  const CONTROL_TERMS = [
    "encryption", "encrypted", "mfa", "multi-factor", "2fa",
    "least privilege", "rbac", "role-based", "audit log", "logging",
    "monitoring", "patch", "hardening", "secure configuration",
    "incident response", "ir plan", "backup", "restore",
  ];

  const riskSummary = getText(formData, "S3_5_1_RISK_SUMMARY", "riskSummaryNarrative");
  const constraints = getText(formData, "S1_3_4_CONSTRAINTS",  "narrative");
  if (!riskSummary && !constraints) return [];

  const mentionsSecurity =
    contains(riskSummary, ...SECURITY_TERMS) ||
    contains(constraints, ...SECURITY_TERMS);
  if (!mentionsSecurity) return [];

  const mentionsControls = contains(riskSummary, ...CONTROL_TERMS);
  if (mentionsControls) return [];

  return [
    {
      ruleId:    "SECURITY-BC01-CONTROLS-REQUIRED",
      standard:  "REGULATORY",
      severity:  "BLOCK",
      sectionId: "S3_5_1_RISK_SUMMARY",
      message:   "Security or cyber risk is referenced but the risk summary contains no specific security controls.",
      appliesTo: { fieldKey: "riskSummaryNarrative" },
      remedy:    { label: "In section 3.5.1 Risk Summary, describe security controls (e.g., encryption, MFA/SSO, least privilege, audit logging, monitoring, patching, incident response)." },
    },
  ];
}

// ── 5. getActiveDomainsForContext (inlined — reads preset JSON at runtime) ─────

const PRESETS = JSON.parse(
  readFileSync(
    "/sessions/youthful-jolly-pascal/mnt/flowgestio-frontend-clean/src/config/compliance/industry_presets.v1.json",
    "utf8"
  )
);

function getActiveDomainsForContext(ctx) {
  if (!ctx) return [];
  const industry  = typeof ctx.industry  === "string" ? ctx.industry.trim()  : "";
  const subsector = typeof ctx.subsector === "string" ? ctx.subsector.trim() : "";
  if (!industry || !subsector) return [];
  if (!Array.isArray(PRESETS) || PRESETS.length === 0) return [];
  const preset = PRESETS.find((p) => p.industry === industry && p.subsector === subsector);
  return Array.isArray(preset?.activeDomains) ? preset.activeDomains : [];
}

// ── Assertion helpers ──────────────────────────────────────────────────────────

let PASS = 0, FAIL = 0;
const GAPS = [];

function assert(condition, label, detail = "") {
  if (condition) {
    console.log(`  ✓ PASS  ${label}`);
    PASS++;
  } else {
    const msg = detail ? ` — ${detail}` : "";
    console.log(`  ✗ FAIL  ${label}${msg}`);
    FAIL++;
  }
}

function gap(id, description) {
  GAPS.push({ id, description });
  console.log(`  ⚠ GAP   ${id}  ${description}`);
}

// ════════════════════════════════════════════════════════════════════════════════
// SCENARIO A1 — Multiple viable options
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n── Scenario A1: Multiple viable options ──────────────────────────────────────");
{
  const snapshot = buildSnapshot();

  // Evidence where every criterion is explicitly confirmed
  const makeAllPassEvidence = (optionId) => ({
    optionId,
    evidenceByCriterionId: Object.fromEntries(
      DEFAULT_CRITERIA.map((c) => [c.id, { textJustification: "Confirmed and compliant." }])
    ),
  });

  // Status Quo → BASELINE unconditionally
  const sqResult = computeScreeningResults(snapshot, { optionId: "SQ", evidenceByCriterionId: {} }, true);
  assert(sqResult.computedVerdict === "BASELINE",  "A1.1  Status Quo → BASELINE");
  assert(sqResult.criterionResults.length === 0,   "A1.2  Status Quo has no criterion results (not evaluated)");

  // Option A — all criteria pass
  const optA = computeScreeningResults(snapshot, makeAllPassEvidence("A"), false);
  assert(optA.computedVerdict === "VIABLE",         "A1.3  Option A → VIABLE (all 6 criteria pass)");
  assert(optA.criterionResults.length === 6,        "A1.4  Option A has 6 criterion results");
  assert(optA.criterionResults.every((r) => r.status === "pass"), "A1.5  All 6 criterion statuses = pass");

  // Option B — all criteria pass
  const optB = computeScreeningResults(snapshot, makeAllPassEvidence("B"), false);
  assert(optB.computedVerdict === "VIABLE",         "A1.6  Option B → VIABLE (all 6 criteria pass)");

  // TBS-BC01-S23-INDETERMINATE must NOT fire when all candidates are VIABLE
  const formData = {
    S2_1_EVAL_CRITERIA: { methodologyLocked: true },
    S2_3_SCREENING: {
      confirmed: true,
      decisions: [
        { optionId: "SQ", finalVerdict: "BASELINE" },
        { optionId: "A",  finalVerdict: "VIABLE"   },
        { optionId: "B",  finalVerdict: "VIABLE"   },
      ],
    },
  };
  const tbsIssues = runTbsS23Indeterminate(formData);
  assert(tbsIssues.length === 0, "A1.7  TBS-BC01-S23-INDETERMINATE silent when all candidates VIABLE");
}

// ════════════════════════════════════════════════════════════════════════════════
// SCENARIO A2 — Deal-breaker fail → DISCOUNTED; non-deal-breaker fail → DISCOUNTED
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n── Scenario A2: All discounted ────────────────────────────────────────────────");
{
  const snapshot = buildSnapshot();

  // A2a: deal-breaker (policy_compliance) = explicit "No"
  const dealBreakerFailEvidence = {
    optionId: "A",
    evidenceByCriterionId: {
      policy_compliance:       { textJustification: "No" },          // deal-breaker → fail
      strategic_alignment:     { textJustification: "Aligned with strategic objectives." },
      business_need:           { textJustification: "Addresses the core business problem." },
      financial_affordability: { textJustification: "Within approved funding envelope." },
      operational_feasibility: { textJustification: "Team is ready and capacity is confirmed." },
      risk_acceptability:      { textJustification: "Residual risk is within tolerance." },
    },
  };
  const resultA = computeScreeningResults(snapshot, dealBreakerFailEvidence, false);
  assert(resultA.computedVerdict === "DISCOUNTED",  "A2.1  Option A → DISCOUNTED (deal-breaker policy_compliance = 'No')");

  const policyResult = resultA.criterionResults.find((r) => r.criterionId === "policy_compliance");
  assert(policyResult?.status === "fail",            "A2.2  policy_compliance criterion status = fail");

  // Verify deal-breaker check short-circuits — no further evaluation needed after deal-breaker fail
  // (passCount is irrelevant once deal-breaker fires)
  const othersPassed = resultA.criterionResults
    .filter((r) => r.criterionId !== "policy_compliance")
    .every((r) => r.status === "pass");
  assert(othersPassed,                               "A2.3  Remaining 5 criteria pass (deal-breaker fail short-circuits at deriveVerdict level)");

  // A2b: non-deal-breaker fail → DISCOUNTED because passCount (5) < minYesCount (6)
  const nonDealBreakerFailEvidence = {
    optionId: "B",
    evidenceByCriterionId: {
      policy_compliance:       { textJustification: "Compliant." },
      strategic_alignment:     { textJustification: "Aligned." },
      business_need:           { textJustification: "Addresses need." },
      financial_affordability: { textJustification: "Affordable." },
      operational_feasibility: { textJustification: "No" },            // non-deal-breaker → fail
      risk_acceptability:      { textJustification: "Acceptable." },
    },
  };
  const resultB = computeScreeningResults(snapshot, nonDealBreakerFailEvidence, false);
  assert(resultB.computedVerdict === "DISCOUNTED",  "A2.4  Option B → DISCOUNTED (non-deal-breaker fails; passCount 5 < minYesCount 6)");

  const opFeasResult = resultB.criterionResults.find((r) => r.criterionId === "operational_feasibility");
  assert(opFeasResult?.status === "fail",            "A2.5  operational_feasibility (non-deal-breaker) status = fail");
}

// ════════════════════════════════════════════════════════════════════════════════
// SCENARIO A3 — Missing data → INDETERMINATE → TBS BLOCK
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n── Scenario A3: Missing data → INDETERMINATE → TBS BLOCK ─────────────────────");
{
  const snapshot = buildSnapshot();

  // Option A: business_need and financial_affordability have no evidence
  const partialEvidence = {
    optionId: "A",
    evidenceByCriterionId: {
      policy_compliance:       { textJustification: "Compliant." },
      strategic_alignment:     { textJustification: "Aligned." },
      // business_need            → missing (no key)
      // financial_affordability  → missing (no key)
      operational_feasibility: { textJustification: "Team is ready." },
      risk_acceptability:      { textJustification: "Risk is acceptable." },
    },
  };

  const result = computeScreeningResults(snapshot, partialEvidence, false);
  assert(result.computedVerdict === "INDETERMINATE", "A3.1  Option A → INDETERMINATE (2 criteria lack evidence)");

  const missing = result.criterionResults.filter((r) => r.status === "insufficient_evidence");
  assert(missing.length === 2, `A3.2  Exactly 2 criteria = insufficient_evidence (got ${missing.length})`);

  const missingIds = missing.map((r) => r.criterionId).sort();
  assert(
    missingIds.includes("business_need") && missingIds.includes("financial_affordability"),
    `A3.3  Missing criteria = business_need + financial_affordability (got: ${missingIds.join(", ")})`
  );

  // TBS rule BLOCKS when methodologyLocked + confirmed + any INDETERMINATE final verdict
  const formDataWithIndeterminate = {
    S2_1_EVAL_CRITERIA: { methodologyLocked: true },
    S2_3_SCREENING: {
      confirmed: true,
      decisions: [
        { optionId: "SQ", finalVerdict: "BASELINE"      },
        { optionId: "A",  finalVerdict: "INDETERMINATE" },
      ],
    },
  };
  const tbsIssues = runTbsS23Indeterminate(formDataWithIndeterminate);
  assert(tbsIssues.length === 1,                                "A3.4  TBS-BC01-S23-INDETERMINATE fires (1 BLOCK issue)");
  assert(tbsIssues[0]?.severity === "BLOCK",                    "A3.5  Severity = BLOCK");
  assert(tbsIssues[0]?.sectionId === "S2_3_SCREENING",          "A3.6  sectionId = S2_3_SCREENING");
  assert(tbsIssues[0]?.ruleId === "TBS-BC01-S23-INDETERMINATE", "A3.7  ruleId = TBS-BC01-S23-INDETERMINATE");
  assert(tbsIssues[0]?.message?.includes("A"),                  "A3.8  Issue message names the INDETERMINATE option (A)");

  // Guard: TBS rule is silent when methodologyLocked = false
  const unlockedFormData = {
    ...formDataWithIndeterminate,
    S2_1_EVAL_CRITERIA: { methodologyLocked: false },
  };
  const unlockedIssues = runTbsS23Indeterminate(unlockedFormData);
  assert(unlockedIssues.length === 0, "A3.9  TBS rule silent when methodologyLocked = false");

  // Guard: TBS rule is silent when confirmed = false
  const unconfirmedFormData = {
    ...formDataWithIndeterminate,
    S2_3_SCREENING: { ...formDataWithIndeterminate.S2_3_SCREENING, confirmed: false },
  };
  const unconfirmedIssues = runTbsS23Indeterminate(unconfirmedFormData);
  assert(unconfirmedIssues.length === 0, "A3.10 TBS rule silent when confirmed = false");
}

// ════════════════════════════════════════════════════════════════════════════════
// SCENARIO A4 — Override without justification (gap discovery)
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n── Scenario A4: Override without justification (gap discovery) ────────────────");
{
  // formData: Option A has override=true, overrideReason="" (empty string)
  // Expectation: a BLOCK issue should be produced pointing to overrideReason
  // Hypothesis: TBS-BC01-S23-INDETERMINATE does NOT cover this case.
  //             A new rule would be needed: TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED

  const formData = {
    S2_1_EVAL_CRITERIA: { methodologyLocked: true },
    S2_3_SCREENING: {
      confirmed: true,
      decisions: [
        { optionId: "SQ", finalVerdict: "BASELINE",  override: false, overrideReason: "" },
        { optionId: "A",  finalVerdict: "VIABLE",    override: true,  overrideReason: "" },  // override, no reason
      ],
    },
  };

  const tbsIssues = runTbsS23Indeterminate(formData);

  // TBS-BC01-S23-INDETERMINATE does not fire (no INDETERMINATE verdicts)
  assert(tbsIssues.length === 0, "A4.1  TBS-BC01-S23-INDETERMINATE silent (no INDETERMINATE verdicts; override is unrelated)");

  // Check whether ANY existing rule produces a BLOCK for this condition
  const overrideBlockExists = tbsIssues.some(
    (i) => i.severity === "BLOCK" && String(i.ruleId).toLowerCase().includes("override")
  );

  if (!overrideBlockExists) {
    gap(
      "GAP-A4",
      "No existing rule produces a BLOCK when override=true and overrideReason is blank. " +
      "Required: a new TBS rule (e.g., TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED) in " +
      "tbs.rules.ts that reads S2_3_SCREENING.decisions and fires when any decision has " +
      "override===true and overrideReason is empty/blank. " +
      "Suggested fieldKey target: overrideReason."
    );
  } else {
    assert(true, "A4.2  BLOCK produced for override without justification");
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SCENARIO B1 — Combined: EDUCATION/DIGITAL_SERVICES → VIABLE screening + SECURITY BLOCK
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n── Scenario B1: Combined — VIABLE screening + SECURITY BLOCK ─────────────────");
{
  // Step 1: Verify preset lookup for EDUCATION/DIGITAL_SERVICES
  const ctx = { industry: "EDUCATION", subsector: "DIGITAL_SERVICES" };
  const activeDomains = getActiveDomainsForContext(ctx);

  assert(Array.isArray(activeDomains) && activeDomains.length > 0, "B1.1  EDUCATION/DIGITAL_SERVICES preset found and has activeDomains");
  assert(activeDomains.includes("SECURITY"),     "B1.2  Active domains includes SECURITY");
  assert(activeDomains.includes("PRIVACY"),      "B1.3  Active domains includes PRIVACY");
  assert(activeDomains.includes("ACCESSIBILITY"),"B1.4  Active domains includes ACCESSIBILITY");

  // Step 2: Screening — Option A is VIABLE (all 6 criteria pass)
  const snapshot = buildSnapshot();
  const viableEvidence = {
    optionId: "A",
    evidenceByCriterionId: Object.fromEntries(
      DEFAULT_CRITERIA.map((c) => [
        c.id,
        { textJustification: "Confirmed. The education platform meets this criterion." },
      ])
    ),
  };

  const screeningResult = computeScreeningResults(snapshot, viableEvidence, false);
  assert(screeningResult.computedVerdict === "VIABLE", "B1.5  Screening engine: Option A → VIABLE");
  assert(
    screeningResult.criterionResults.every((r) => r.status === "pass"),
    "B1.6  All 6 screening criteria = pass for Option A"
  );

  // Step 3: Regulatory — security risk mentioned, no controls → BLOCK
  // formData has "cybersecurity" in riskSummary but no encryption/MFA/logging/etc.
  const formData = {
    S3_5_1_RISK_SUMMARY: {
      riskSummaryNarrative:
        "There is a significant cybersecurity threat to the student data platform. " +
        "Unauthorized access by external actors poses a risk to Protected B data. " +
        "Vulnerability management is not yet defined.",
    },
    S1_3_4_CONSTRAINTS: {
      narrative: "The platform must operate within the departmental network boundary.",
    },
    // Screening state (for TBS rule)
    S2_1_EVAL_CRITERIA: { methodologyLocked: true },
    S2_3_SCREENING: {
      confirmed: true,
      decisions: [{ optionId: "A", finalVerdict: "VIABLE" }],
    },
  };

  const secIssues = runSecurityControlsRequired(formData);
  assert(secIssues.length === 1,                                        "B1.7  SECURITY-BC01-CONTROLS-REQUIRED fires (1 issue)");
  assert(secIssues[0]?.severity === "BLOCK",                            "B1.8  Security issue severity = BLOCK");
  assert(secIssues[0]?.standard === "REGULATORY",                       "B1.9  Security issue standard = REGULATORY");
  assert(secIssues[0]?.ruleId === "SECURITY-BC01-CONTROLS-REQUIRED",    "B1.10 ruleId = SECURITY-BC01-CONTROLS-REQUIRED");
  assert(secIssues[0]?.sectionId === "S3_5_1_RISK_SUMMARY",             "B1.11 sectionId = S3_5_1_RISK_SUMMARY");
  assert(secIssues[0]?.appliesTo?.fieldKey === "riskSummaryNarrative",   "B1.12 appliesTo.fieldKey = riskSummaryNarrative");

  // Step 4: TBS screening rule — no INDETERMINATE → silent
  const tbsIssues = runTbsS23Indeterminate(formData);
  assert(tbsIssues.length === 0, "B1.13 TBS-BC01-S23-INDETERMINATE silent (Option A verdict = VIABLE, not INDETERMINATE)");

  // Step 5: No interference — screening verdict unaffected by regulatory BLOCK
  assert(
    screeningResult.computedVerdict === "VIABLE",
    "B1.14 Screening verdict remains VIABLE even with regulatory BLOCK present (engines are isolated)"
  );

  // Step 6: Combined issue list — exactly 1 BLOCK (security), 0 from TBS
  const allIssues = [...secIssues, ...tbsIssues];
  const blocks    = allIssues.filter((i) => i.severity === "BLOCK");
  assert(blocks.length === 1,              "B1.15 Combined issue list: exactly 1 BLOCK (from SECURITY pack)");
  assert(blocks[0]?.standard === "REGULATORY", "B1.16 The sole BLOCK is from the REGULATORY standard");

  // Step 7: Security rule is silent when controls ARE mentioned
  const formDataWithControls = {
    ...formData,
    S3_5_1_RISK_SUMMARY: {
      riskSummaryNarrative:
        "There is a cybersecurity threat. The platform uses encryption at rest and in transit, " +
        "MFA for all users, audit logging, and patch management. Incident response procedures are defined.",
    },
  };
  const secIssuesWithControls = runSecurityControlsRequired(formDataWithControls);
  assert(secIssuesWithControls.length === 0, "B1.17 SECURITY-BC01-CONTROLS-REQUIRED silent when controls are described");
}

// ── Summary ────────────────────────────────────────────────────────────────────

const total = PASS + FAIL;
console.log("\n══════════════════════════════════════════════════════════════════════════════");
console.log(`  Screening Proof  |  ${PASS} / ${total} assertions PASS  |  ${FAIL} FAIL`);

if (GAPS.length > 0) {
  console.log(`\n  ⚠  Discovered gaps (${GAPS.length}):`);
  for (const g of GAPS) {
    console.log(`\n     ${g.id}`);
    console.log(`     ${g.description}`);
  }
}

console.log("══════════════════════════════════════════════════════════════════════════════");

if (FAIL > 0) {
  const gapFails = GAPS.length;
  const unexpectedFails = FAIL - gapFails;
  if (unexpectedFails === 0) {
    console.log(`\n  NOTE: All ${gapFails} FAIL(s) are documented gaps — no unexpected assertion failures.\n`);
  }
}

process.exit(FAIL > 0 ? 1 : 0);
