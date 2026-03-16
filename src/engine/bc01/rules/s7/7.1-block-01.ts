import type { Rule } from "../../types/rule.types";
import { getMessage } from "../../messages/messages";

export const rule_7_1_BLOCK_01: Rule = {
  id: "BC01-S7-7.1-BLOCK-01",
  section: "S7",
  decision: "7.1",
  level: "BLOCK",
  priority: "P0",
  phase: "MVP",
  dependsOnPaths: ["sections.s7"],

  triggersWhen: (bc) => {
    const s7 = bc.sections.s7;
    if (!s7) return false;
    return !s7.options || s7.options.length < 2;
  },

  buildFinding: (bc, ctx) => {
    const locale = ctx.locale ?? "en-CA";

    return {
      id: "BC01-S7-7.1-BLOCK-01",
      level: "BLOCK",
      section: "S7",
      decision: "7.1",
      phase: "MVP",
      title: getMessage("BC01-S7-7.1-BLOCK-01", "title", locale),
      message: getMessage("BC01-S7-7.1-BLOCK-01", "message", locale),
      evidence: {
        fields: ["sections.s7.options"],
        metrics: { optionCount: bc.sections.s7?.options?.length ?? 0, minimum: 2 },
      },
      suggestedFix: getMessage("BC01-S7-7.1-BLOCK-01", "fix", locale),
    };
  },
};
