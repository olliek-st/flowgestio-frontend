import type { BC01Snapshot } from "../types/bc01.types";
import type { EngineContext, Rule, RulePriority } from "../types/rule.types";
import type { EngineResult, Finding, SectionCode } from "../types/finding.types";

import { RuleRegistry } from "./registry";
import { hasDependencies } from "./validator";

const SECTION_ORDER: readonly SectionCode[] = ["S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"] as const;
const ENGINE_VERSION = "1.0.0-mvp";
const PRIORITY_ORDER: Record<RulePriority, number> = { P0: 0, P1: 1, P2: 2 };

function sortRulesDeterministically(rules: Rule[]): Rule[] {
  return [...rules].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.id.localeCompare(b.id)
  );
}

export class BC01Engine {
  private readonly registry = new RuleRegistry();

  validate(
    bc: BC01Snapshot,
    ctx?: Partial<EngineContext>,
    opts?: { priorities?: RulePriority[]; phase?: EngineContext["phase"] }
  ): EngineResult {
    const context: EngineContext = {
      nowISO: new Date().toISOString(),
      phase: "MVP",
      locale: "fr-CA",
      strictness: "Default",
      ...ctx,
    };

    const findings: Finding[] = [];
    const sectionScores: Record<SectionCode, "OK" | "WARN" | "BLOCKED"> = {
      S2: "OK",
      S3: "OK",
      S4: "OK",
      S5: "OK",
      S6: "OK",
      S7: "OK",
      S8: "OK",
      S9: "OK",
    };

    for (const section of SECTION_ORDER) {
      const sectionFindings = this.validateSection(bc, context, section, opts);
      findings.push(...sectionFindings);

      const hasBlocks = sectionFindings.some((f) => f.level === "BLOCK");
      const hasWarns = sectionFindings.some((f) => f.level === "WARN");
      sectionScores[section] = hasBlocks ? "BLOCKED" : hasWarns ? "WARN" : "OK";
    }

    const blocks = findings.filter((f) => f.level === "BLOCK").length;
    const warns = findings.filter((f) => f.level === "WARN").length;
    const criticalWarns = findings.filter((f) => f.level === "WARN" && f.severity === "Critical").length;

    const sectionsBlocked = SECTION_ORDER.filter((s) => sectionScores[s] === "BLOCKED");

    const topFindingsToAddress = [...findings]
      .sort((a, b) => {
        const rank = (f: Finding) => {
          if (f.level === "BLOCK") return 0;
          if (f.severity === "Critical") return 1;
          if (f.severity === "High") return 2;
          if (f.severity === "Medium") return 3;
          return 4;
        };
        return rank(a) - rank(b) || a.id.localeCompare(b.id);
      })
      .slice(0, 5)
      .map((f) => f.id);

    const status: EngineResult["status"] = blocks > 0 ? "BLOCKED" : warns > 0 ? "WARN" : "OK";

    return {
      status,
      findings: findings.sort((a, b) => a.id.localeCompare(b.id)),
      summary: { blocks, warns, criticalWarns, sectionsBlocked, topFindingsToAddress },
      sectionScores,
      executedAt: context.nowISO,
      engineVersion: ENGINE_VERSION,
    };
  }

  validateGatesOnly(bc: BC01Snapshot, ctx?: Partial<EngineContext>): EngineResult {
    return this.validate(bc, ctx, { priorities: ["P0"], phase: "MVP" });
  }

  private validateSection(
    bc: BC01Snapshot,
    ctx: EngineContext,
    section: SectionCode,
    opts?: { priorities?: RulePriority[]; phase?: EngineContext["phase"] }
  ): Finding[] {
    const phase = opts?.phase ?? ctx.phase;
    const priorities = opts?.priorities;

    const rules = sortRulesDeterministically(
      this.registry.getApplicableRules(bc, ctx, { phase, priorities, section })
    );

    const findings: Finding[] = [];
    for (const rule of rules) {
      if (!hasDependencies(bc, rule.dependsOnPaths)) continue;
      if (rule.triggersWhen(bc, ctx)) findings.push(rule.buildFinding(bc, ctx));
    }
    return findings;
  }
}
