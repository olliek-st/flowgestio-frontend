// src/engine/validation/docs/bc01/tbs.rules.ts
// ─── TBS Rules for BC-01 ─────────────────────────────────────────────────────
// Standard: Treasury Board of Canada Secretariat (TBS)
// Severity: BLOCK — these must be resolved before export.
//
// Rule IDs are stable, namespaced, and audit-safe.
// Never rename a rule ID once deployed — create a new one instead.

import type { ValidationRule, ValidationInput } from "../../registry/types";
import type { ValidationIssue } from "../../types";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Safely resolve a nested key path in an unknown object. */
function get(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  return false;
}

// ─── Rule: TBS-BC01-NEED-REQUIRED ────────────────────────────────────────────
// The Business Need field is mandatory per TBS Guide to Preparing Treasury Board
// Submissions (section 1.1.2). An empty Business Need blocks document approval.

const needRequired: ValidationRule = {
  id: "TBS-BC01-NEED-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    const narrative = get(formData, "S1_1_2_BUSINESS_NEED", "narrative");
    if (isBlank(narrative)) {
      return [
        {
          ruleId: "TBS-BC01-NEED-REQUIRED",
          standard: "TBS",
          severity: "BLOCK",
          sectionId: "S1_1_2_BUSINESS_NEED",
          message:
            "Business Need is required (TBS §1.1.2). Provide a clear statement of the problem or opportunity.",
          appliesTo: { fieldKey: "narrative" },
          remedy: {
            label:
              "In section 1.1.2 Business Need, write a concise 1–2 sentence statement describing the problem or opportunity.",
          },
        },
      ];
    }
    return [];
  },
};

// ─── Rule: TBS-BC01-S23-INDETERMINATE ────────────────────────────────────────
// TBS requires that all option verdicts be conclusive (VIABLE, DISCOUNTED, or
// BASELINE) before the document is approved. An INDETERMINATE verdict means
// insufficient evidence was provided to evaluate the option against the criteria.
//
// Guards (all three must pass before the rule fires):
//   1. methodologyLocked === true  — criteria are finalized; verdicts are meaningful
//   2. confirmed === true          — user explicitly confirmed the screening run
//   3. decisions.length > 0       — there are options to evaluate
//
// BASELINE options (status quo) are excluded — they never require criterion scoring.

const s23Indeterminate: ValidationRule = {
  id: "TBS-BC01-S23-INDETERMINATE",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    // Guard 1: screening criteria must be locked before verdicts are considered final.
    // An unlocked methodology means weights/criteria are still being edited — no BLOCK.
    const methodologyLocked = get(formData, "S2_1_EVAL_CRITERIA", "methodologyLocked");
    if (methodologyLocked !== true) return [];

    // Guard 2: the user must have explicitly confirmed the screening run.
    // `confirmed` is only set to true by the CONFIRM reducer action — it is the clean
    // "screening was actually executed" signal. An unconfirmed screening may still have
    // INDETERMINATE defaults and must not block the document.
    const confirmed = get(formData, "S2_3_SCREENING", "confirmed");
    if (confirmed !== true) return [];

    // Guard 3: decisions array must exist and be non-empty.
    const decisions = get(formData, "S2_3_SCREENING", "decisions");
    if (!Array.isArray(decisions) || decisions.length === 0) return [];

    // Exclude BASELINE options (status quo) — they are evaluated differently
    // and are expected to carry a BASELINE verdict, not a scored one.
    const candidateOptions = (decisions as Array<Record<string, unknown>>).filter(
      (d) => d?.finalVerdict !== "BASELINE"
    );
    if (candidateOptions.length === 0) return [];

    // BLOCK if any candidate option still carries an INDETERMINATE verdict
    // after the screening was confirmed. This means scoring is incomplete.
    const indeterminate = candidateOptions.filter(
      (d) => d?.finalVerdict === "INDETERMINATE"
    );
    if (indeterminate.length === 0) return [];

    const names = indeterminate
      .map((d) => String(d?.optionId ?? "unknown"))
      .join(", ");

    return [
      {
        ruleId: "TBS-BC01-S23-INDETERMINATE",
        standard: "TBS",
        severity: "BLOCK",
        sectionId: "S2_3_SCREENING",
        message: `${indeterminate.length} option(s) have an INDETERMINATE verdict: ${names}. All criteria must be evaluated before export.`,
        appliesTo: null,
        remedy: {
          label:
            "In section 2.3 Screening Gate, provide evidence (Yes/No) for every criterion of each indeterminate option.",
        },
      },
    ];
  },
};

// ─── Rule: TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED ──────────────────────
// TBS audit requirements mandate that any verdict override be accompanied by a
// written justification. An override without explanation is not auditable and
// must be resolved before the document is exported.
//
// Guards (all must pass before the rule fires):
//   1. confirmed === true      — screening has been executed; overrides are meaningful
//   2. decisions is a non-empty array
//
// Fires when ANY decision has override === true AND overrideReason is blank/missing.
// Returns a single BLOCK issue listing all affected option IDs.
//
// Note: no methodologyLocked guard — an unjustified override must be flagged
// regardless of whether criteria are still being edited, because the override
// record is written independently of the methodology lock.

const s23OverrideJustificationRequired: ValidationRule = {
  id: "TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED",
  standard: "TBS",
  apply({ formData }: ValidationInput): ValidationIssue[] {
    // Guard 1: section must exist
    const section = get(formData, "S2_3_SCREENING");
    if (!section || typeof section !== "object") return [];

    // Guard 2: screening must be confirmed — don't nag during draft
    const confirmed = get(formData, "S2_3_SCREENING", "confirmed");
    if (confirmed !== true) return [];

    // Guard 3: decisions array must exist and be non-empty
    const decisions = get(formData, "S2_3_SCREENING", "decisions");
    if (!Array.isArray(decisions) || decisions.length === 0) return [];

    // Collect all options that have override=true but blank/missing overrideReason
    const unjustified = (decisions as Array<Record<string, unknown>>).filter(
      (d) => d?.override === true && isBlank(d?.overrideReason)
    );
    if (unjustified.length === 0) return [];

    const names = unjustified
      .map((d) => String(d?.optionId ?? "unknown"))
      .join(", ");

    return [
      {
        ruleId: "TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED",
        standard: "TBS",
        severity: "BLOCK",
        sectionId: "S2_3_SCREENING",
        message: `Override is enabled for ${unjustified.length} option(s) but no override justification is provided: ${names}.`,
        appliesTo: { fieldKey: "overrideReason" },
        remedy: {
          label:
            "In section 2.3 Screening Gate, provide a written justification for each overridden verdict.",
        },
      },
    ];
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const tbsBC01Rules: ValidationRule[] = [
  needRequired,
  s23Indeterminate,
  s23OverrideJustificationRequired,
];
