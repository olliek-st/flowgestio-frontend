// src/lib/docs/mapBusinessCase.p1.ts
import type { BusinessCaseStep3_P1 } from "@/types/businessCase";

export function toDocumentBuilderInputP1(model: BusinessCaseStep3_P1, projectTitle: string) {
  const { currency, horizonMonths } = model.financial;
  return {
    meta: { title: `${projectTitle} — Business Case`, currency, horizonMonths },
    strategicSummary: {
      businessNeed: model.strategic.businessNeed,
      problemStatement: model.strategic.problemStatement,
      keyAssumptions: model.strategic.keyAssumptions.map(a => ({
        text: a.assumption, status: a.validationStatus, validation: a.validation
      })),
      successKPIs: model.strategic.successKPIs.map(k => ({
        name: k.name, baseline: k.baseline, target: k.target, unit: k.unit, method: k.measurementMethod
      })),
      constraints: model.strategic.constraints
    },
    options: model.options.map(o => ({
      id: o.id,
      name: o.name,
      description: o.description,
      isBaseline: o.isBaseline,
      totals: {
        totalCosts: o._calc?.totalCosts ?? 0,
        totalBenefits: o._calc?.totalBenefits ?? 0,
        net: o._calc?.netBenefit ?? 0,
        roiPct: o._calc?.roiPct ?? null,
        paybackMonths: o._calc?.paybackMonths ?? null,
        npv: o._calc?.npv ?? null,
        mirrPct: o._calc?.mirrPct ?? null,
        bcr: o._calc?.benefitCostRatio ?? null,
        pi: o._calc?.profitabilityIndex ?? null
      },
      topRisks: o.optionSpecificRisks.slice(0,3).map(r => ({
        statement: r.statement, score: r.riskScore
      }))
    })),
    recommendation: {
      selectedOptionId: model.recommendedOption,
      rationale: model.recommendationRationale
    }
  };
}
