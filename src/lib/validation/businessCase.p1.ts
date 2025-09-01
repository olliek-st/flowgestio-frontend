// src/lib/validation/businessCase.p1.ts
import type {
  BusinessCaseStep3_P1, Option, KPI, ProjectRisk, ValidationResult, ProjectType,
  OrganizationalSettings, BaselineRequirements
} from "../../types/businessCase";

function result(): ValidationResult { return { isValid: true, errors: [], warnings: [] }; }
function pushErr(r:ValidationResult, field:string, message:string, code?:string, severity:"error"|"warning"|"info"="error"){
  r.isValid = false; r.errors.push({ field, message, severity, code });
}
function pushWarn(r:ValidationResult, field:string, message:string, recommendation?:string){
  r.warnings.push({ field, message, recommendation });
}

/** 1) Financial threshold checks */
export function validateFinancialThresholds(bc: BusinessCaseStep3_P1): ValidationResult {
  const r = result();
  const capex = bc.options
    .filter(o => !o.isBaseline)
    .flatMap(o => o.lineItems)
    .filter(li => li.category === "capex")
    .reduce((s, li) => s + li.amount, 0);

  if (capex >= bc.organizational.npvThreshold && !bc.financial.requireNPV) {
    pushWarn(r, "financial.requireNPV",
      "NPV is recommended above the organizational threshold.",
      "Enable NPV for this analysis.");
  }
  if (capex >= bc.organizational.irrThreshold && !bc.financial.requireMIRR) {
    pushWarn(r, "financial.requireMIRR",
      "MIRR is recommended above the organizational threshold.",
      "Enable MIRR for stability on complex cashflows.");
  }
  return r;
}

/** 2) Exactly one baseline, and realistic baseline content */
export function validateOptionComparison(
  options: Option[], projectType: ProjectType, org: OrganizationalSettings
): ValidationResult {
  const r = result();
  const baselines = options.filter(o => o.isBaseline);
  if (baselines.length !== 1) {
    pushErr(r, "options", "Exactly one baseline option is required", "BASELINE_COUNT");
    return r;
  }
  const base = baselines[0];

  // Warn if baseline has benefits (usually should be 0)
  const anyBenefits = base.lineItems.some(li => li.kind === "benefit");
  if (anyBenefits) {
    pushWarn(r, `options.${base.id}`,
      "Baseline includes benefits; verify this reflects the true status quo.");
  }

  // Must have at least one recurring cost (status quo burden)
  const hasRecurringCost = base.lineItems.some(li =>
    li.kind === "cost" && li.recurrence !== "one-time"
  );
  if (!hasRecurringCost) {
    pushWarn(r, `options.${base.id}`,
      "Baseline should include recurring status-quo costs (maintenance/opex, etc.).",
      "Add monthly/annual costs that exist today.");
  }

  // Project-type baseline category requirements
  const req = org.baselineRequirements[projectType];
  if (req?.requiredCategories?.length) {
    const cats = new Set(base.lineItems.filter(li=>li.kind==="cost").map(li => li.category));
    for (const c of req.requiredCategories) {
      if (!cats.has(c)) {
        pushWarn(r, `options.${base.id}`,
          `Baseline missing required category: ${c}`,
          req.description);
      }
    }
  }
  return r;
}

/** 3) Risk completeness (basic P1 rule) */
export function validateRiskAssessment(
  risks: ProjectRisk[], tolerance: OrganizationalSettings["riskToleranceLevel"]
): ValidationResult {
  const r = result();
  risks.forEach((rk, i) => {
    if (!rk.mitigation) pushErr(r, `projectRisks[${i}].mitigation`, "Mitigation is required");
    if (!rk.owner) pushErr(r, `projectRisks[${i}].owner`, "Owner is required");
  });
  if (tolerance === "Low") {
    const veryHigh = risks.filter(x => x.residualRisk === "Very High").length;
    if (veryHigh > 0) pushWarn(r, "projectRisks", "Residual Very High risks present under Low tolerance.");
  }
  return r;
}

/** 4) KPI completeness */
export function validateKPICompleteness(kpis: KPI[]): ValidationResult {
  const r = result();
  kpis.forEach((k, i) => {
    if (!k.baseline) pushWarn(r, `successKPIs[${i}].baseline`, "Baseline missing");
    if (!k.target) pushWarn(r, `successKPIs[${i}].target`, "Target missing");
    if (!k.owner) pushWarn(r, `successKPIs[${i}].owner`, "Owner missing");
  });
  return r;
}

/** 5) Assumptions validation trail */
export function validateAssumptions(
  assumptions: BusinessCaseStep3_P1["strategic"]["keyAssumptions"]
): ValidationResult {
  const r = result();
  assumptions.forEach((a, i) => {
    if (!a.validation) pushWarn(r, `keyAssumptions[${i}].validation`, "Add a validation method.");
    if (a.validationStatus === "pending")
      pushWarn(r, `keyAssumptions[${i}].validationStatus`, "Validation pending.");
  });
  return r;
}

/** 6) Cashflow integrity across options */
export function validateCashFlowIntegrity(options: Option[]): ValidationResult {
  const r = result();
  options.forEach((o, i) => {
    o.lineItems.forEach((li, j) => {
      if (li.amount <= 0) pushErr(r, `options[${i}].lineItems[${j}].amount`, "Amount must be > 0");
      if (li.recurrence !== "one-time" && li.endMonth !== undefined && li.endMonth <= li.startMonth) {
        pushErr(r, `options[${i}].lineItems[${j}].endMonth`, "endMonth must be > startMonth for recurring items");
      }
    });
  });
  return r;
}

/** Convenience wrapper to run all core validations */
export function validateAllP1(bc: BusinessCaseStep3_P1): ValidationResult {
  const v = result();

  const vs = [
    validateFinancialThresholds(bc),
    validateOptionComparison(bc.options, bc.projectType, bc.organizational),
    validateRiskAssessment(bc.projectRisks, bc.organizational.riskToleranceLevel),
    validateKPICompleteness(bc.strategic.successKPIs),
    validateAssumptions(bc.strategic.keyAssumptions),
    validateCashFlowIntegrity(bc.options)
  ];
  for (const res of vs) {
    if (!res.isValid) v.isValid = false;
    v.errors.push(...res.errors);
    v.warnings.push(...res.warnings);
  }
  return v;
}