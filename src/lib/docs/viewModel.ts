// FlowGestio — ViewModel Builder v1
// Purpose: convert raw package → print-ready ViewModel; provide isEmpty() for SectionTree
// Keep templates dumb: they only consume strings/arrays already filtered

import type { SectionNode, EmptinessPredicate } from "./sectionTree";
import { pruneTree, numberTree, xrefSection, type SectionIndex } from "./sectionTree";

// ──────────────────────────────────────────────────────────────────────────────
// Raw shapes (subset) — align with your Zod types names if different
// ──────────────────────────────────────────────────────────────────────────────
export type Objective = { id: string; text?: string; metric?: string; target?: string; deadline?: string };
export type Milestone = { id: string; name?: string; date?: string };
export type Risk = { id: string; cause?: string; event?: string; impactDesc?: string; probability?: string; impact?: string; response?: string };
export type Stakeholder = { id: string; name?: string; role?: string; interest?: string; influence?: string };

export type RawPkg = {
  project: { name: string; dates: { start: string; finish: string }; pm?: string; sponsor?: string };
  charter: {
    businessCase?: string;
    objectives?: Objective[];
    highLevelScope?: { inclusions?: string[]; exclusions?: string[] };
    successCriteria?: string[];
    assumptions?: string[];
    constraints?: string[];
    milestones?: Milestone[];
    initialRisks?: Risk[];
    stakeholders?: Stakeholder[];
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Guards — type-aware row validation to avoid empty rows
// ──────────────────────────────────────────────────────────────────────────────
const trim = (s?: string) => (s ?? "").trim();
const hasAny = (arr?: any[]) => Array.isArray(arr) && arr.length > 0;

export const guards = {
  objective: (r?: Objective) => !!r && !!trim(r.text) && !!trim(r.metric) && !!trim(r.target),
  milestone: (r?: Milestone) => !!r && !!trim(r.name) && !!trim(r.date),
  risk: (r?: Risk) => !!r && !!trim(r.cause) && !!trim(r.event) && !!trim(r.impactDesc),
  stakeholder: (r?: Stakeholder) => !!r && !!trim(r.name) && !!trim(r.role),
};

function filter<T>(rows: T[] | undefined, guard: (r?: T) => boolean): T[] {
  return (rows ?? []).filter((r) => guard(r));
}

// ──────────────────────────────────────────────────────────────────────────────
// ViewModel — only printable data
// ──────────────────────────────────────────────────────────────────────────────
export type ViewModel = {
  header: { name: string; start: string; finish: string; pm?: string; sponsor?: string };
  charter: {
    projectPurpose?: string;
    objectives: Objective[];
    highLevelRequirements: string[];
    scope: { inclusions: string[]; exclusions: string[] };
    successCriteria: string[];
    assumptions: string[];
    constraints: string[];
    milestones: Milestone[];
    risks: Risk[];
    stakeholders: Stakeholder[];
    budgetSummary?: { currency?: string; capex?: number; opex?: number; contingency?: number; total?: number };
    pmAuthority?: string;
    approvals?: { sponsorName?: string; sponsorRole?: string; pmName?: string; approvalDate?: string };
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Build ViewModel from raw data
// ──────────────────────────────────────────────────────────────────────────────
export function buildViewModel(raw: RawPkg): ViewModel {
  return {
    header: {
      name: raw.project.name,
      start: raw.project.dates.start,
      finish: raw.project.dates.finish,
      pm: raw.project.pm,
      sponsor: raw.project.sponsor,
    },
    charter: {
      projectPurpose: trim((raw as any).charter?.projectPurpose),
      objectives: filter((raw as any).charter?.objectives, guards.objective),
      highLevelRequirements: ((raw as any).charter?.highLevelRequirements ?? []).filter((s: string) => !!trim(s)),
      scope: {
        inclusions: ((raw as any).charter?.highLevelScope?.inclusions ?? []).filter((s: string) => !!trim(s)),
        exclusions: ((raw as any).charter?.highLevelScope?.exclusions ?? []).filter((s: string) => !!trim(s)),
      },
      successCriteria: ((raw as any).charter?.successCriteria ?? []).filter((s: string) => !!trim(s)),
      assumptions: ((raw as any).charter?.assumptions ?? []).filter((s: string) => !!trim(s)),
      constraints: ((raw as any).charter?.constraints ?? []).filter((s: string) => !!trim(s)),
      milestones: filter((raw as any).charter?.milestones, guards.milestone),
      risks: filter((raw as any).charter?.initialRisks, guards.risk), // map RAW.initialRisks → VM.risks
      stakeholders: filter((raw as any).charter?.stakeholders, guards.stakeholder),
      budgetSummary: (raw as any).charter?.budgetSummary,
      pmAuthority: trim((raw as any).charter?.pmAuthority),
      approvals: (raw as any).charter?.approvals,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Emptiness predicate wired to the ViewModel content
// ──────────────────────────────────────────────────────────────────────────────
export function makeIsEmpty(vm: ViewModel): EmptinessPredicate {
  return (sectionId: string) => {
    switch (sectionId) {
      case "CH-EXEC":
        return false; // always include Exec Summary in v1
      case "CH-CHARTER": {
        const c = vm.charter;
        return !trim(c.businessCase) &&
          !hasAny(c.objectives) &&
          !hasAny(c.scope.inclusions) &&
          !hasAny(c.successCriteria) &&
          !hasAny(c.assumptions) &&
          !hasAny(c.constraints) &&
          !hasAny(c.milestones) &&
          !hasAny(c.risks) &&
          !hasAny(c.stakeholders);
      }
      case "CH-ASSUMPTIONS":
        return !hasAny(vm.charter.assumptions) && !hasAny(vm.charter.constraints);
      case "CH-MILESTONES":
        return !hasAny(vm.charter.milestones);
      case "CH-RISKS":
        return !hasAny(vm.charter.risks);
      case "CH-STAKEHOLDERS":
        return !hasAny(vm.charter.stakeholders);
      default:
        return false; // keep others by default; plans will add their own rules later
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Orchestrator convenience for you: build → prune → number
// ──────────────────────────────────────────────────────────────────────────────
export function buildNumbered(
  raw: RawPkg,
  tree: SectionNode
): { vm: ViewModel; pruned: SectionNode; index: SectionIndex } {
  const vm = buildViewModel(raw);
  const isEmpty = makeIsEmpty(vm);
  const pruned = pruneTree(tree, isEmpty)!;
  const { index } = numberTree(pruned);
  return { vm, pruned, index };
}

// ──────────────────────────────────────────────────────────────────────────────
// Simple test helper (for manual runs)
// ──────────────────────────────────────────────────────────────────────────────
export function demoXref(index: SectionIndex, sectionId: string) {
  return xrefSection(index, sectionId, { label: "see", format: "both" });
}
