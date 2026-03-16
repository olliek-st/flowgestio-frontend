import type { BC01Snapshot } from "./bc01.types";
import type { Finding, SectionCode, Severity, FindingLevel } from "./finding.types";

export type EngineContext = {
  nowISO: string;
  phase: "MVP" | "Phase2Plus";
  locale?: "fr-CA" | "en-CA";
  strictness?: "Default" | "High";
};

export type RulePriority = "P0" | "P1" | "P2";

export type Rule = {
  id: string;
  section: SectionCode;
  decision: string;
  level: FindingLevel;
  severity?: Severity;
  priority: RulePriority;
  phase: "MVP" | "Phase2Plus";
  dependsOnPaths?: string[];
  appliesWhen?: (bc: BC01Snapshot, ctx: EngineContext) => boolean;
  triggersWhen: (bc: BC01Snapshot, ctx: EngineContext) => boolean;
  buildFinding: (bc: BC01Snapshot, ctx: EngineContext) => Finding;
  tags?: string[];
};

export type RuleSet = { section: SectionCode; rules: Rule[] };
