// src/engine/validation/registry/index.ts
// ─── Registry Runner ─────────────────────────────────────────────────────────
// Responsibilities:
//   1. Load rule set for the requested docType
//   2. Filter by active standards
//   3. Execute rules (no business logic here)
//   4. Flatten issues
//   5. Stable sort: BLOCK before WARN/INFO, then sectionId, then ruleId
//
// This module has NO business logic — it is a pure orchestrator.

import type { ValidationIssue, DocType, ValidationStandard, ValidationContext } from "../types";
import { getBC01Rules } from "../docs/bc01";

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RunValidationArgs {
  docType: DocType;
  standards: ValidationStandard[];
  formData: unknown;
  /** Forward-compat: not consumed in Phase 1. */
  context?: ValidationContext;
}

const SEVERITY_ORDER: Record<string, number> = { BLOCK: 0, WARN: 1, INFO: 2 };

export function runValidation({
  docType,
  standards,
  formData,
}: RunValidationArgs): ValidationIssue[] {
  // 1. Load rule set for this document type
  const allRules = loadRules(docType);

  // 2. Filter to active standards only
  const activeRules = allRules.filter((r) => standards.includes(r.standard));

  // 3. Execute + flatten
  const issues: ValidationIssue[] = [];
  for (const rule of activeRules) {
    try {
      const found = rule.apply({ formData });
      issues.push(...found);
    } catch {
      // Never crash the UI — swallow rule errors silently in production
      // (a failing rule is not worse than no rule)
    }
  }

  // 4. Stable sort: BLOCK → WARN → INFO, then sectionId ASC, then ruleId ASC
  issues.sort((a, b) => {
    const sA = SEVERITY_ORDER[a.severity] ?? 9;
    const sB = SEVERITY_ORDER[b.severity] ?? 9;
    if (sA !== sB) return sA - sB;
    const secCmp = (a.sectionId ?? "").localeCompare(b.sectionId ?? "");
    if (secCmp !== 0) return secCmp;
    return a.ruleId.localeCompare(b.ruleId);
  });

  return issues;
}

// ─── Internal: rule loader per docType ───────────────────────────────────────
// Add new docTypes here. CH01 returns [] until Phase 2.

function loadRules(docType: DocType) {
  switch (docType) {
    case "BC01":
      return getBC01Rules(["PMI", "TBS", "REGULATORY"]);
    case "CH01":
      return []; // placeholder — no rules in Phase 1
    default:
      return [];
  }
}
