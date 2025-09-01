// src/lib/analyze/businessCase.p1.ts
import type { BusinessCaseStep3_P1, Option } from "../../types/businessCase";
import { Calculator } from "../finance/calculator";
import { computeRiskScore } from "../risk/score";

export function analyzeBusinessCaseP1(model: BusinessCaseStep3_P1): BusinessCaseStep3_P1 {
  const { financial, organizational } = model;
  const { 
    horizonMonths, 
    discountRatePct, 
    includeInflation, 
    inflationRatePct, 
    includeTaxes, 
    taxRatePct, 
    requireNPV, 
    requireMIRR 
  } = financial;

  // Calculate effective discount rate if inflation is included
  const effectiveDiscount =
    includeInflation && typeof inflationRatePct === "number"
      ? (() => {
          const real = ((1 + discountRatePct / 100) / (1 + inflationRatePct / 100) - 1) * 100;
          return real;
        })()
      : discountRatePct;

  // Analyze each option
  const options = model.options.map((o: Option) => {
    // Generate monthly cashflow from line items
    const cf = Calculator.generateMonthlyCashflow(o.lineItems, horizonMonths, organizational);
    
    // Calculate financial metrics
    const roiPct = Calculator.calculateROI(cf.totals.costs, cf.totals.benefits);
    const payback = Calculator.calculatePaybackPeriod(cf.series);
    
    // NPV calculation (only if required)
    const npv = requireNPV
      ? Calculator.calculateNPV(cf.series, effectiveDiscount, includeTaxes ? taxRatePct : undefined)
      : null;
    
    // MIRR calculation (only if required)
    const mirrRes = requireMIRR
      ? Calculator.calculateMIRR(
          cf.series, 
          organizational.financeRatePct, 
          organizational.reinvestRatePct
        )
      : { mirr: null, warnings: [] };

    // Collect warnings
    const warnings = [...(mirrRes.warnings || [])];
    if (cf.metadata.hasIrregularFlow) {
      warnings.push("Irregular cashflow detected (multiple sign changes).");
    }
    if (cf.totals.costs === 0 && cf.totals.benefits > 0) {
      warnings.push("Option has benefits but no costs - verify this is correct.");
    }
    if (cf.totals.costs > 0 && cf.totals.benefits === 0) {
      warnings.push("Option has costs but no benefits - this may not be viable.");
    }

    // Additional financial ratios
    const bcr = cf.totals.costs > 0 ? cf.totals.benefits / cf.totals.costs : null;
    const pi = (npv !== null && cf.totals.costs > 0) 
      ? (npv + cf.totals.costs) / cf.totals.costs 
      : null;

    // Calculate risk scores for option-specific risks
    const optionSpecificRisks = o.optionSpecificRisks.map(r => ({
      ...r,
      riskScore: computeRiskScore(r.probability, r.impact, organizational.riskMatrix)
    }));

    return {
      ...o,
      optionSpecificRisks,
      _calc: {
        horizonMonths,
        currency: financial.currency,
        totalCosts: cf.totals.costs,
        totalBenefits: cf.totals.benefits,
        netBenefit: cf.totals.net,
        roiPct,
        paybackMonths: payback.months,
        npv,
        mirrPct: mirrRes.mirr ?? null,
        benefitCostRatio: bcr,
        profitabilityIndex: pi,
        breakEvenMonth: payback.breakEvenMonth,
        warnings,
        
        // Cashflow analysis metadata
        hasIrregularCashFlow: cf.metadata.hasIrregularFlow,
        signChanges: cf.metadata.signChanges,
        
        // Keep monthly cashflow undefined by default for performance
        // Can be generated on demand if needed for detailed analysis
        monthlyCashFlow: undefined
      }
    };
  });

  // Calculate risk scores for project-level risks
  const projectRisks = model.projectRisks.map(r => ({
    ...r,
    riskScore: computeRiskScore(r.probability, r.impact, organizational.riskMatrix)
  }));

  return { 
    ...model, 
    options, 
    projectRisks 
  };
}