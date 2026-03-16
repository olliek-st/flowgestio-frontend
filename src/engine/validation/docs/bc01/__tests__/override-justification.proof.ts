// override-justification.proof.ts
// REAL PROOF — TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED
//
// Run with: npx tsx src/engine/validation/docs/bc01/__tests__/override-justification.proof.ts
//
// Imports the ACTUAL collectIssues() entry-point — no inlining, no mocking.
// The full validation pipeline runs: PMI + TBS rules (including the new rule).

import { collectIssues } from "../../../collectIssues";
import type { ValidationIssue } from "../../../types";

// ── Assertion helpers ─────────────────────────────────────────────────────────

let PASS = 0, FAIL = 0;
function assert(condition: boolean, label: string, detail = ""): void {
  if (condition) {
    console.log(`  ✓ PASS  ${label}`);
    PASS++;
  } else {
    console.log(`  ✗ FAIL  ${label}${detail ? " — " + detail : ""}`);
    FAIL++;
  }
}

const TARGET = "TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED";

function pick(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.ruleId === TARGET);
}

// ── Base formData — passes all other rules so only the target rule fires ───────
function base(
  decisions: Array<{
    optionId: string;
    finalVerdict: string;
    override: boolean;
    overrideReason: unknown;
  }>,
  extra: { confirmed?: boolean } = {}
): unknown {
  return {
    S1_1_2_BUSINESS_NEED: { narrative: "Replace the legacy grants management system." },
    S2_1_EVAL_CRITERIA:   { methodologyLocked: true },
    S2_3_SCREENING: {
      confirmed: extra.confirmed ?? true,
      decisions,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── P1  override=true, reason=\"\" → 1 BLOCK ───────────────────────────────────");
{
  const fd = base([
    { optionId: "SQ", finalVerdict: "BASELINE",  override: false, overrideReason: "" },
    { optionId: "A",  finalVerdict: "VIABLE",    override: true,  overrideReason: "" },
  ]);
  const issues = pick(collectIssues(fd));
  assert(issues.length === 1,             "P1.1  Exactly 1 issue produced");
  assert(issues[0]?.severity === "BLOCK", "P1.2  Severity = BLOCK");
}

console.log("\n── P2  override=true, reason=null → 1 BLOCK ─────────────────────────────────");
{
  const fd = base([
    { optionId: "A", finalVerdict: "VIABLE", override: true, overrideReason: null },
  ]);
  const issues = pick(collectIssues(fd));
  assert(issues.length === 1,             "P2.1  Null reason treated as blank → 1 BLOCK");
  assert(issues[0]?.severity === "BLOCK", "P2.2  Severity = BLOCK");
}

console.log("\n── P3  override=true, reason=\"   \" (whitespace only) → 1 BLOCK ───────────────");
{
  const fd = base([
    { optionId: "A", finalVerdict: "DISCOUNTED", override: true, overrideReason: "   " },
  ]);
  const issues = pick(collectIssues(fd));
  assert(issues.length === 1,             "P3.1  Whitespace-only reason treated as blank → 1 BLOCK");
  assert(issues[0]?.severity === "BLOCK", "P3.2  Severity = BLOCK");
}

console.log("\n── P4  override=true, reason supplied → rule silent ─────────────────────────");
{
  const fd = base([
    {
      optionId: "A", finalVerdict: "VIABLE", override: true,
      overrideReason: "Deputy Minister approved escalation on 2025-03-15 (ADM memo #2025-DM-041).",
    },
  ]);
  const issues = pick(collectIssues(fd));
  assert(issues.length === 0, "P4.1  Written justification → rule produces 0 issues");
}

console.log("\n── P5  override=false → rule silent ─────────────────────────────────────────");
{
  const fd = base([
    { optionId: "A", finalVerdict: "VIABLE", override: false, overrideReason: "" },
  ]);
  const issues = pick(collectIssues(fd));
  assert(issues.length === 0, "P5.1  override=false → 0 issues regardless of blank reason");
}

console.log("\n── P6  confirmed=false → rule silent (draft guard) ──────────────────────────");
{
  const fd = base(
    [{ optionId: "A", finalVerdict: "VIABLE", override: true, overrideReason: "" }],
    { confirmed: false }
  );
  const issues = pick(collectIssues(fd));
  assert(issues.length === 0, "P6.1  confirmed=false → rule silent (don't nag in draft)");
}

console.log("\n── P7  2 unjustified overrides → 1 BLOCK listing both IDs ──────────────────");
{
  const fd = base([
    { optionId: "SQ", finalVerdict: "BASELINE",   override: false, overrideReason: "" },
    { optionId: "A",  finalVerdict: "VIABLE",     override: true,  overrideReason: "" },
    { optionId: "B",  finalVerdict: "DISCOUNTED", override: true,  overrideReason: null },
    { optionId: "C",  finalVerdict: "VIABLE",     override: true,  overrideReason: "Justified by CTO." },
  ]);
  const issues = pick(collectIssues(fd));
  assert(issues.length === 1,                       "P7.1  1 BLOCK issue (not one per option)");
  assert(issues[0]?.message?.includes("2 option(s)"), "P7.2  Message mentions '2 option(s)'");
  assert(issues[0]?.message?.includes("A"),           "P7.3  Message names option A");
  assert(issues[0]?.message?.includes("B"),           "P7.4  Message names option B");
  assert(!issues[0]?.message?.includes("C"),          "P7.5  Message does NOT name justified option C");
  assert(!issues[0]?.message?.includes("SQ"),         "P7.6  Message does NOT name status quo SQ");
}

console.log("\n── P8  Exact metadata fields ────────────────────────────────────────────────");
{
  const fd = base([
    { optionId: "A", finalVerdict: "VIABLE", override: true, overrideReason: "" },
  ]);
  const issue = pick(collectIssues(fd))[0];
  assert(issue?.ruleId === TARGET,                             "P8.1  ruleId = TBS-BC01-S23-OVERRIDE-JUSTIFICATION-REQUIRED");
  assert(issue?.standard === "TBS",                           "P8.2  standard = TBS");
  assert(issue?.sectionId === "S2_3_SCREENING",               "P8.3  sectionId = S2_3_SCREENING");
  assert(issue?.appliesTo?.fieldKey === "overrideReason",     "P8.4  appliesTo.fieldKey = overrideReason");
  assert(typeof issue?.remedy?.label === "string" && issue.remedy.label.length > 0,
                                                              "P8.5  remedy.label is non-empty string");
}

console.log("\n── P9  Regression: TBS-BC01-NEED-REQUIRED unaffected ────────────────────────");
{
  const fd = {
    S1_1_2_BUSINESS_NEED: { narrative: "" },         // blank → triggers existing rule
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
  assert(needBlock.length === 1,                  "P9.1  TBS-BC01-NEED-REQUIRED still fires on blank Business Need");
  assert(needBlock[0]?.severity === "BLOCK",      "P9.2  TBS-BC01-NEED-REQUIRED severity = BLOCK");
  assert(pick(all).length === 0,                  "P9.3  New rule does NOT fire (no override active)");
}

console.log("\n── P10 Regression: TBS-BC01-S23-INDETERMINATE unaffected ────────────────────");
{
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
  assert(indetBlock.length === 1,                "P10.1 TBS-BC01-S23-INDETERMINATE still fires on INDETERMINATE verdict");
  assert(indetBlock[0]?.severity === "BLOCK",    "P10.2 TBS-BC01-S23-INDETERMINATE severity = BLOCK");
  assert(pick(all).length === 0,                 "P10.3 New rule does NOT fire (no override active)");
}

console.log("\n── P11 Both rules can co-exist on the same formData ─────────────────────────");
{
  // An option has override=true+blank AND another has finalVerdict=INDETERMINATE
  const fd = {
    S1_1_2_BUSINESS_NEED: { narrative: "Replace the legacy system." },
    S2_1_EVAL_CRITERIA:   { methodologyLocked: true },
    S2_3_SCREENING: {
      confirmed: true,
      decisions: [
        { optionId: "A", finalVerdict: "INDETERMINATE", override: false, overrideReason: "" },
        { optionId: "B", finalVerdict: "VIABLE",        override: true,  overrideReason: "" },
      ],
    },
  };
  const all = collectIssues(fd);
  const indetBlock    = all.filter((i) => i.ruleId === "TBS-BC01-S23-INDETERMINATE");
  const overrideBlock = pick(all);
  assert(indetBlock.length === 1,     "P11.1 TBS-BC01-S23-INDETERMINATE fires for option A");
  assert(overrideBlock.length === 1,  "P11.2 New rule fires for option B (unjustified override)");
  assert(
    all.filter((i) => i.severity === "BLOCK").length >= 2,
    "P11.3 At least 2 BLOCK issues in combined output"
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────

const total = PASS + FAIL;
console.log("\n═══════════════════════════════════════════════════════════════════════════════");
console.log(`  Override Justification Proof  |  ${PASS} / ${total} assertions PASS  |  ${FAIL} FAIL`);
console.log("═══════════════════════════════════════════════════════════════════════════════");

process.exit(FAIL > 0 ? 1 : 0);
