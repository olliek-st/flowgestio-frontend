import type { Rule } from "../../types/rule.types";
import { getMessage } from "../../messages/messages";
import { calculateCoverage } from "../../engine/validator";

export const rule_7_4_BLOCK_02: Rule = {
  id: "BC01-S7-7.4-BLOCK-02",
  section: "S7",
  decision: "7.4",
  level: "BLOCK",
  priority: "P0",
  phase: "MVP",
  dependsOnPaths: ["sections.s7.comparisonMatrix", "sections.s7.options", "sections.s7.criteria"],

  triggersWhen: (bc) => {
    const s7 = bc.sections.s7;
    if (!s7?.comparisonMatrix || !s7.options || !s7.criteria) return false;

    const optionIds = s7.options.map((o) => o.id);
    const criteriaIds = s7.criteria.map((c) => c.id);
    const coverage = calculateCoverage(s7.comparisonMatrix, optionIds, criteriaIds);

    const hasDoNothing = s7.options.some((o) => o.isDoNothing);
    const threshold = hasDoNothing ? 0.5 : 0.7;

    return coverage < threshold;
  },

  buildFinding: (bc, ctx) => {
    const locale = ctx.locale ?? "en-CA";

    const s7 = bc.sections.s7!;
    const optionIds = s7.options!.map((o) => o.id);
    const criteriaIds = s7.criteria!.map((c) => c.id);
    const coverage = calculateCoverage(s7.comparisonMatrix!, optionIds, criteriaIds);

    const hasDoNothing = s7.options!.some((o) => o.isDoNothing);
    const threshold = hasDoNothing ? 0.5 : 0.7;

    return {
      id: "BC01-S7-7.4-BLOCK-02",
      level: "BLOCK",
      section: "S7",
      decision: "7.4",
      phase: "MVP",
      title: getMessage("BC01-S7-7.4-BLOCK-02", "title", locale),
      message: getMessage("BC01-S7-7.4-BLOCK-02", "message", locale, {
        coverage: `${Math.round(coverage * 100)}%`,
        threshold: `${Math.round(threshold * 100)}%`,
      }),
      evidence: { fields: ["sections.s7.comparisonMatrix"], metrics: { coverage, threshold, hasDoNothing } },
      suggestedFix: getMessage("BC01-S7-7.4-BLOCK-02", "fix", locale),
    };
  },
};
