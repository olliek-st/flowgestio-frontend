// src/engine/validation/docs/bc01/pmi.rules.ts
// ─── PMI Rules for BC-01 ─────────────────────────────────────────────────────
// Standard: Project Management Institute (PMBOK 7th Edition)
// Severity: WARN — advisory, does not block export.
//
// Rule IDs are stable, namespaced, and audit-safe.

import type { ValidationRule, ValidationInput } from "../../registry/types";
import type { ValidationIssue } from "../../types";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function get(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

/**
 * Count sentences in a text string.
 * A sentence ends with . ! or ? followed by whitespace or end-of-string.
 * Defensively handles edge cases (abbreviations, ellipsis, empty strings).
 */
function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Split on sentence-ending punctuation followed by space or EOL
  const parts = trimmed.split(/[.!?]+(?:\s|$)/);
  // Filter out empty fragments from trailing punctuation
  return parts.filter((p) => p.trim().length > 0).length;
}

// ─── Rule: PMI-BC01-NEED-LENGTH ──────────────────────────────────────────────
// PMI PMBOK recommends that problem/opportunity statements be concise (1–2
// sentences). Excessively long statements may bury the core need in detail
// better suited to the Strategic Environment section.

const needLength: ValidationRule = {
  id: "PMI-BC01-NEED-LENGTH",
  standard: "PMI",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const narrative = get(formData, "S1_1_2_BUSINESS_NEED", "narrative");
    if (typeof narrative !== "string" || narrative.trim().length === 0) return [];

    const sentences = countSentences(narrative);
    if (sentences <= 2) return [];

    return [
      {
        ruleId: "PMI-BC01-NEED-LENGTH",
        standard: "PMI",
        severity: "WARN",
        sectionId: "S1_1_2_BUSINESS_NEED",
        message: `Business Need is ${sentences} sentences long. PMI recommends 1–2 sentences for a focused problem statement.`,
        appliesTo: { fieldKey: "narrative" },
        remedy: {
          label:
            "Trim the Business Need to 1–2 sentences. Move supporting context to section 1.1.1 (Organizational Overview) or 1.1.3 (Drivers for Change).",
        },
      },
    ];
  },
};

// ─── Rule: PMI-BC01-METHODOLOGY-NOT-LOCKED ───────────────────────────────────
// PMI best practice: the evaluation methodology (weights, criteria) should be
// locked before options are scored, to prevent post-hoc rationalization.
// An unlocked methodology is an advisory warning, not a blocker.

const methodologyNotLocked: ValidationRule = {
  id: "PMI-BC01-METHODOLOGY-NOT-LOCKED",
  standard: "PMI",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const locked = get(formData, "S2_1_EVAL_CRITERIA", "methodologyLocked");
    // Only warn if the user has started filling in the section (i.e. it exists)
    const hasSection =
      get(formData, "S2_1_EVAL_CRITERIA") !== undefined &&
      get(formData, "S2_1_EVAL_CRITERIA") !== null;

    if (!hasSection) return [];
    if (locked === true) return [];

    return [
      {
        ruleId: "PMI-BC01-METHODOLOGY-NOT-LOCKED",
        standard: "PMI",
        severity: "WARN",
        sectionId: "S2_1_EVAL_CRITERIA",
        message:
          "Evaluation methodology is not locked. PMI recommends locking weights and criteria before scoring options.",
        appliesTo: { fieldKey: "methodologyLocked" },
        remedy: {
          label:
            "In section 2.1 Evaluation Criteria, toggle 'Lock methodology' once weights and criteria are confirmed.",
        },
      },
    ];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const pmiBC01Rules: ValidationRule[] = [needLength, methodologyNotLocked];
