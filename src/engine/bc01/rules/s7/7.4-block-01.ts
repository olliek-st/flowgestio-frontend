import type { Rule } from "../../types/rule.types";
import { getMessage } from "../../messages/messages";
import { hasValue } from "../../engine/validator";

export const rule_7_4_BLOCK_01: Rule = {
  id: "BC01-S7-7.4-BLOCK-01",
  section: "S7",
  decision: "7.4",
  level: "BLOCK",
  priority: "P0",
  phase: "MVP",
  dependsOnPaths: ["sections.s7"],

  triggersWhen: (bc) => {
    const s7 = bc.sections.s7;
    if (!s7) return false;
    return !hasValue(s7.comparisonMatrix);
  },

  buildFinding: (_bc, ctx) => {
    const locale = ctx.locale ?? "en-CA";

    return {
      id: "BC01-S7-7.4-BLOCK-01",
      level: "BLOCK",
      section: "S7",
      decision: "7.4",
      phase: "MVP",
      title: getMessage("BC01-S7-7.4-BLOCK-01", "title", locale),
      message: getMessage("BC01-S7-7.4-BLOCK-01", "message", locale),
      evidence: { fields: ["sections.s7.comparisonMatrix"], metrics: { matrixPresent: false } },
      suggestedFix: getMessage("BC01-S7-7.4-BLOCK-01", "fix", locale),
    };
  },
};
