// src/engine/validation/docs/bc01/__tests__/override-justification.test.ts
//
// REAL PROOF — TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED
//
// Imports the actual collectIssues() entry point and exercises the new rule
// through the full validation pipeline. No logic is inlined or mocked.
//
// Coverage:
//   P1  override=true, reason=""             → 1 BLOCK (new rule fires)
//   P2  override=true, reason=null           → 1 BLOCK (new rule fires)
//   P3  override=true, reason="  "  (spaces) → 1 BLOCK (isBlank catches whitespace-only)
//   P4  override=true, reason="Approved…"   → 0 issues from new rule (justified override)
//   P5  override=false, reason=""            → 0 issues from new rule (no override active)
//   P6  confirmed=false, override=true, blank → 0 issues (don't nag during draft)
//   P7  Multiple options — 2 unjustified     → 1 BLOCK listing both optionIds
//   P8  ruleId / standard / sectionId / appliesTo.fieldKey exact match
//   P9  Existing rules unaffected — TBS-BC01-NEED-REQUIRED still fires on blank need
//   P10 Existing rules unaffected — TBS-BC01-S23-INDETERMINATE still fires on INDETERMINATE

import { describe, it, expect } from "vitest";
import { collectIssues } from "../../../collectIssues";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal formData that will not trigger any other rule.
 *  Business Need is filled; methodology is locked; screening is confirmed.
 *  Adjust the `decisions` array per test case.
 */
function makeFormData(
  decisions: Array<{
    optionId: string;
    finalVerdict: string;
    override: boolean;
    overrideReason: unknown;
  }>,
  overrides: { confirmed?: boolean } = {}
): unknown {
  return {
    S1_1_2_BUSINESS_NEED: {
      narrative: "Replace the legacy grants management system.",
    },
    S2_1_EVAL_CRITERIA: {
      methodologyLocked: true,
    },
    S2_3_SCREENING: {
      confirmed: overrides.confirmed ?? true,
      decisions,
    },
  };
}

const TARGET_RULE = "TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED";

function overrideIssues(formData: unknown) {
  return collectIssues(formData).filter((i) => i.ruleId === TARGET_RULE);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED", () => {
  // ── P1: override=true, reason="" → BLOCK ────────────────────────────────────
  it("P1  override=true with empty string reason → 1 BLOCK", () => {
    const fd = makeFormData([
      { optionId: "SQ", finalVerdict: "BASELINE",  override: false, overrideReason: "" },
      { optionId: "A",  finalVerdict: "VIABLE",    override: true,  overrideReason: "" },
    ]);
    const issues = overrideIssues(fd);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("BLOCK");
  });

  // ── P2: override=true, reason=null → BLOCK ──────────────────────────────────
  it("P2  override=true with null reason → 1 BLOCK", () => {
    const fd = makeFormData([
      { optionId: "A", finalVerdict: "VIABLE", override: true, overrideReason: null },
    ]);
    const issues = overrideIssues(fd);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("BLOCK");
  });

  // ── P3: override=true, reason="  " (whitespace only) → BLOCK ────────────────
  it("P3  override=true with whitespace-only reason → 1 BLOCK", () => {
    const fd = makeFormData([
      { optionId: "A", finalVerdict: "DISCOUNTED", override: true, overrideReason: "   " },
    ]);
    const issues = overrideIssues(fd);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("BLOCK");
  });

  // ── P4: override=true with substantive reason → 0 issues ────────────────────
  it("P4  override=true with written justification → rule silent", () => {
    const fd = makeFormData([
      {
        optionId: "A",
        finalVerdict: "VIABLE",
        override: true,
        overrideReason: "Deputy Minister approved escalation on 2025-03-15 (ADM memo ref #2025-DM-041).",
      },
    ]);
    const issues = overrideIssues(fd);
    expect(issues).toHaveLength(0);
  });

  // ── P5: override=false → rule silent regardless of blank reason ───────────────
  it("P5  override=false → rule silent (override not active)", () => {
    const fd = makeFormData([
      { optionId: "A", finalVerdict: "VIABLE", override: false, overrideReason: "" },
    ]);
    const issues = overrideIssues(fd);
    expect(issues).toHaveLength(0);
  });

  // ── P6: confirmed=false → rule silent (don't nag in draft) ───────────────────
  it("P6  confirmed=false → rule silent even when override=true and reason blank", () => {
    const fd = makeFormData(
      [{ optionId: "A", finalVerdict: "VIABLE", override: true, overrideReason: "" }],
      { confirmed: false }
    );
    const issues = overrideIssues(fd);
    expect(issues).toHaveLength(0);
  });

  // ── P7: multiple unjustified overrides → single BLOCK naming both ─────────────
  it("P7  2 unjustified overrides → 1 BLOCK listing both option IDs", () => {
    const fd = makeFormData([
      { optionId: "SQ", finalVerdict: "BASELINE",   override: false, overrideReason: "" },
      { optionId: "A",  finalVerdict: "VIABLE",     override: true,  overrideReason: "" },
      { optionId: "B",  finalVerdict: "DISCOUNTED", override: true,  overrideReason: null },
      {
        optionId: "C",
        finalVerdict: "VIABLE",
        override: true,
        overrideReason: "Justified by CTO sign-off.",
      },
    ]);
    const issues = overrideIssues(fd);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("2 option(s)");
    expect(issues[0].message).toContain("A");
    expect(issues[0].message).toContain("B");
    expect(issues[0].message).not.toContain("C");   // C has a justification
    expect(issues[0].message).not.toContain("SQ");  // SQ has no override
  });

  // ── P8: exact metadata fields ────────────────────────────────────────────────
  it("P8  issue has exact ruleId / standard / sectionId / appliesTo.fieldKey", () => {
    const fd = makeFormData([
      { optionId: "A", finalVerdict: "VIABLE", override: true, overrideReason: "" },
    ]);
    const issue = overrideIssues(fd)[0];
    expect(issue.ruleId).toBe("TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED");
    expect(issue.standard).toBe("TBS");
    expect(issue.sectionId).toBe("S2_3_SCREENING");
    expect(issue.appliesTo?.fieldKey).toBe("overrideReason");
    expect(issue.remedy?.label).toBeTruthy();
  });

  // ── P9: existing TBS-BC01-NEED-REQUIRED unaffected ──────────────────────────
  it("P9  TBS-BC01-NEED-REQUIRED still fires when Business Need is blank", () => {
    const fd = {
      S1_1_2_BUSINESS_NEED: { narrative: "" },    // blank — triggers existing rule
      S2_1_EVAL_CRITERIA:   { methodologyLocked: true },
      S2_3_SCREENING: {
        confirmed: true,
        decisions: [
          { optionId: "A", finalVerdict: "VIABLE", override: false, overrideReason: "" },
        ],
      },
    };
    const all = collectIssues(fd);
    const needBlock = all.filter((i) => i.ruleId === "TBS-BC01-NEED-REQUIRED");
    expect(needBlock).toHaveLength(1);
    expect(needBlock[0].severity).toBe("BLOCK");

    // New rule must NOT fire (no override)
    expect(all.filter((i) => i.ruleId === TARGET_RULE)).toHaveLength(0);
  });

  // ── P10: existing TBS-BC01-S23-INDETERMINATE unaffected ─────────────────────
  it("P10 TBS-BC01-S23-INDETERMINATE still fires on INDETERMINATE verdict", () => {
    const fd = {
      S1_1_2_BUSINESS_NEED: { narrative: "Replace the legacy system." },
      S2_1_EVAL_CRITERIA:   { methodologyLocked: true },
      S2_3_SCREENING: {
        confirmed: true,
        decisions: [
          { optionId: "A", finalVerdict: "INDETERMINATE", override: false, overrideReason: "" },
        ],
      },
    };
    const all = collectIssues(fd);
    const indetBlock = all.filter((i) => i.ruleId === "TBS-BC01-S23-INDETERMINATE");
    expect(indetBlock).toHaveLength(1);
    expect(indetBlock[0].severity).toBe("BLOCK");

    // New rule must NOT fire (no override active)
    expect(all.filter((i) => i.ruleId === TARGET_RULE)).toHaveLength(0);
  });
});
