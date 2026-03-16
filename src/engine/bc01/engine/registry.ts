import type { Rule, RulePriority, RuleSet, EngineContext } from "../types/rule.types";
import type { BC01Snapshot } from "../types/bc01.types";
import type { SectionCode } from "../types/finding.types";

import { s2Rules } from "../rules/s2";
import { s3Rules } from "../rules/s3";
import { s4Rules } from "../rules/s4";
import { s5Rules } from "../rules/s5";
import { s6Rules } from "../rules/s6";
import { s7Rules } from "../rules/s7";
import { s8Rules } from "../rules/s8";
import { s9Rules } from "../rules/s9";

export class RuleRegistry {
  private readonly ruleSets: RuleSet[] = [
    s2Rules,
    s3Rules,
    s4Rules,
    s5Rules,
    s6Rules,
    s7Rules,
    s8Rules,
    s9Rules,
  ];

  getAllRules(): Rule[] {
    return this.ruleSets.flatMap((rs) => rs.rules);
  }

  getRulesBySection(section: SectionCode): Rule[] {
    return this.ruleSets.find((rs) => rs.section === section)?.rules ?? [];
  }

  getApplicableRules(
    bc: BC01Snapshot,
    ctx: EngineContext,
    opts?: {
      phase?: EngineContext["phase"];
      priorities?: RulePriority[];
      section?: SectionCode;
    }
  ): Rule[] {
    const phase = opts?.phase ?? ctx.phase;
    let rules = opts?.section ? this.getRulesBySection(opts.section) : this.getAllRules();

    rules = rules.filter((r) => r.phase === phase);

    if (opts?.priorities?.length) {
      const set = new Set(opts.priorities);
      rules = rules.filter((r) => set.has(r.priority));
    }

    // Standard mechanism for exceptions: appliesWhen
    rules = rules.filter((r) => (r.appliesWhen ? r.appliesWhen(bc, ctx) : true));

    return rules;
  }
}
