import type { Rule } from "../../types/rule.types";
import { getMessage } from "../../messages/messages";
import { hasValue } from "../../engine/validator";

export const rule_7_4_WARN_01: Rule = {
  id: "BC01-S7-7.4-WARN-01",
  section: "S7",
  decision: "7.4",
  level: "WARN",
  severity: "High",
  priority: "P1",
  phase: "MVP",
  dependsOnPaths: ["sections.s7.comparisonMatrix"],

  triggersWhen: (bc) => {
    const s7 = bc.sections.s7;
    if (!s7) return false;

    if (!hasValue(s7.synthesis)) return true;

    const synthesis = String(s7.synthesis).toLowerCase();
    const tradeOffKeywords = ["trade-off", "compromis", "contre", "mais", "cependant", "toutefois", "limitation"];
    return !tradeOffKeywords.some((kw) => synthesis.includes(kw));
  },

  buildFinding: (bc, ctx) => {
    const locale = ctx.locale ?? "en-CA";

    return {
      id: "BC01-S7-7.4-WARN-01",
      level: "WARN",
      severity: "High",
      section: "S7",
      decision: "7.4",
      phase: "MVP",
      title: getMessage("BC01-S7-7.4-WARN-01", "title", locale),
      message: getMessage("BC01-S7-7.4-WARN-01", "message", locale),
      evidence: {
        fields: ["sections.s7.synthesis"],
        metrics: { synthesisLength: bc.sections.s7?.synthesis?.length ?? 0, tradeOffsDetected: false },
      },
      suggestedFix: getMessage("BC01-S7-7.4-WARN-01", "fix", locale),
    };
  },
};
