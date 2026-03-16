// src/engine/bc01/index.ts

// ✅ i18n default locale (English-first)
import { setLocale } from "./messages/messages";
setLocale("en-CA");

export { BC01Engine } from "./engine/runner";
export { RuleRegistry } from "./engine/registry";

export type {
  BC01Snapshot,
  BC01Meta,
  BC01Sections,
  Section2_ProblemDefinition,
  Section3_ProjectOverview,
  Section4_EconomicAnalysis,
  Section5_FinancialAnalysis,
  Section6_RiskAnalysis,
  Section7_OptionsAnalysis,
  Section8_Recommendation,
  Section9_ImplementationReadiness,
} from "./types/bc01.types";

export type { EngineResult, Finding, FindingEvidence, Severity } from "./types/finding.types";
export type { Rule, RuleSet, EngineContext, RulePriority } from "./types/rule.types";

export { hasValue, getNestedValue, hasDependencies, calculateCoverage } from "./engine/validator";
