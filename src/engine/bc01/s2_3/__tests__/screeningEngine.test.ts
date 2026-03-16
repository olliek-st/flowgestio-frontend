// src/engine/bc01/s2_3/__tests__/screeningEngine.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  computeScreeningResults,
  hasInsufficientEvidence,
} from "../screeningEngine";
import {
  screeningReducer,
  SCREENING_EMPTY_STATE,
} from "../screeningReducer";
import { createMethodologySnapshot } from "../screeningSnapshot";
import type {
  MethodologySnapshot,
  OptionEvidence,
  ScreeningCriterion,
} from "../screeningTypes";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const CRITERIA: ScreeningCriterion[] = [
  {
    id: "strategic_alignment",
    label: "Strategic Alignment",
    dealBreaker: true,
    evaluationType: "binary",
  },
  {
    id: "business_need",
    label: "Business Need",
    dealBreaker: true,
    evaluationType: "binary",
  },
  {
    id: "legal",
    label: "Legal Feasibility",
    dealBreaker: true,
    evaluationType: "binary",
  },
  {
    id: "operational",
    label: "Operational Feasibility",
    dealBreaker: false,
    evaluationType: "binary",
  },
  {
    id: "cost",
    label: "Cost Order of Magnitude",
    dealBreaker: false,
    evaluationType: "binary",
  },
  {
    id: "risk",
    label: "Risk Profile",
    dealBreaker: false,
    evaluationType: "binary",
  },
];

const VIABILITY_RULE = {
  dealBreakerIds: ["strategic_alignment", "business_need", "legal"],
  minYesCount: 5,
  totalCriteria: 6,
};

let snapshot: MethodologySnapshot;

beforeEach(() => {
  snapshot = createMethodologySnapshot(
    CRITERIA,
    VIABILITY_RULE,
    undefined,
    "test_actor"
  );
});

function makeEvidence(
  overrides: Record<string, string | undefined> = {}
): OptionEvidence {
  const evidenceByCriterionId: Record<string, { textJustification?: string }> =
    {};
  for (const c of CRITERIA) {
    evidenceByCriterionId[c.id] = {
      textJustification: overrides[c.id] ?? "Confirmed — meets criterion",
    };
  }
  return { optionId: "opt-1", evidenceByCriterionId };
}

// ── Status Quo → BASELINE ─────────────────────────────────────────────────────

describe("Status Quo", () => {
  it("returns BASELINE with no criteria evaluated when isStatusQuo=true", () => {
    const result = computeScreeningResults(
      snapshot,
      makeEvidence(),
      true // isStatusQuo
    );
    expect(result.computedVerdict).toBe("BASELINE");
    expect(result.criterionResults).toHaveLength(0);
    expect(result.computedFlags).toHaveLength(0);
  });
});

// ── VIABLE path ───────────────────────────────────────────────────────────────

describe("Viable options", () => {
  it("returns VIABLE when all criteria pass", () => {
    const result = computeScreeningResults(snapshot, makeEvidence(), false);
    expect(result.computedVerdict).toBe("VIABLE");
    expect(result.criterionResults).toHaveLength(CRITERIA.length);
    expect(result.criterionResults.every((r) => r.status === "pass")).toBe(true);
  });

  it("passes even if one non-deal-breaker fails (only 5 of 6 pass)", () => {
    const evidence = makeEvidence({ risk: "no" }); // explicit fail on non-deal-breaker
    const result = computeScreeningResults(snapshot, evidence, false);
    // 5 pass, 1 fail non-deal-breaker → VIABLE if minYesCount = 5
    const passCount = result.criterionResults.filter(
      (r) => r.status === "pass"
    ).length;
    expect(passCount).toBe(5);
    expect(result.computedVerdict).toBe("VIABLE");
  });
});

// ── DISCOUNTED path ───────────────────────────────────────────────────────────

describe("Discounted options — deal-breaker fail", () => {
  it("returns DISCOUNTED when strategic_alignment (deal-breaker) fails", () => {
    const evidence = makeEvidence({ strategic_alignment: "no" });
    const result = computeScreeningResults(snapshot, evidence, false);
    expect(result.computedVerdict).toBe("DISCOUNTED");
  });

  it("returns DISCOUNTED when business_need (deal-breaker) fails", () => {
    const evidence = makeEvidence({ business_need: "false" });
    const result = computeScreeningResults(snapshot, evidence, false);
    expect(result.computedVerdict).toBe("DISCOUNTED");
  });

  it("marks the failed criterion as evaluatedBy='rule' and status='fail'", () => {
    const evidence = makeEvidence({ legal: "no" });
    const result = computeScreeningResults(snapshot, evidence, false);
    const legalResult = result.criterionResults.find(
      (r) => r.criterionId === "legal"
    );
    expect(legalResult?.status).toBe("fail");
    expect(legalResult?.evaluatedBy).toBe("rule");
  });

  it("returns DISCOUNTED when too few criteria pass (3 of 6, threshold=5)", () => {
    const evidence = makeEvidence({
      // deal-breakers pass (strategic, business, legal have default "pass")
      operational: "no",
      cost: "non",
      risk: "false",
    });
    const result = computeScreeningResults(snapshot, evidence, false);
    expect(result.computedVerdict).toBe("DISCOUNTED");
  });
});

// ── insufficient_evidence path ────────────────────────────────────────────────

describe("insufficient_evidence", () => {
  it("returns insufficient_evidence status for criteria with no evidence", () => {
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        strategic_alignment: { textJustification: "Yes, fully aligned" },
        // other criteria have no evidence
      },
    };
    const result = computeScreeningResults(snapshot, evidence, false);
    const insufficientResults = result.criterionResults.filter(
      (r) => r.status === "insufficient_evidence"
    );
    expect(insufficientResults.length).toBe(CRITERIA.length - 1);
  });

  it("returns INDETERMINATE (not DISCOUNTED) when some criteria have no evidence and no deal-breaker fails", () => {
    // 3 deal-breakers pass, 3 have insufficient_evidence.
    // Level 5: absence of evidence is NOT pass. Evidence mandatory before verdict.
    // Expected: INDETERMINATE (not DISCOUNTED — no explicit deal-breaker fail).
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        strategic_alignment: { textJustification: "Aligned" },
        business_need: { textJustification: "Addresses need" },
        legal: { textJustification: "Compliant" },
        // operational, cost, risk → no evidence → insufficient_evidence
      },
    };
    const result = computeScreeningResults(snapshot, evidence, false);

    // INDETERMINATE: unevaluated criteria block verdict (Level 5 zero-optimistic-fallback)
    expect(result.computedVerdict).toBe("INDETERMINATE");

    // Verify: no deal-breaker explicitly failed
    const failedDealBreakers = result.criterionResults.filter(
      (r) =>
        r.status === "fail" &&
        VIABILITY_RULE.dealBreakerIds.includes(r.criterionId)
    );
    expect(failedDealBreakers).toHaveLength(0);

    // Verify: 3 criteria have insufficient_evidence
    const unevaluated = result.criterionResults.filter(
      (r) => r.status === "insufficient_evidence"
    );
    expect(unevaluated).toHaveLength(3);
  });

  it("hasInsufficientEvidence returns true when any result is insufficient", () => {
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        strategic_alignment: { textJustification: "Yes" },
      },
    };
    const result = computeScreeningResults(snapshot, evidence, false);
    expect(hasInsufficientEvidence(result.criterionResults)).toBe(true);
  });

  it("hasInsufficientEvidence returns false when all results are pass or fail", () => {
    const result = computeScreeningResults(snapshot, makeEvidence(), false);
    expect(hasInsufficientEvidence(result.criterionResults)).toBe(false);
  });
});

// ── Threshold evaluation ──────────────────────────────────────────────────────

describe("Threshold evaluation", () => {
  const thresholdCriteria: ScreeningCriterion[] = [
    {
      id: "cost_threshold",
      label: "Cost Threshold",
      dealBreaker: false,
      evaluationType: "threshold",
      thresholdConfig: { min: 0, max: 1000000, unit: "CAD" },
    },
    {
      id: "deal_breaker_threshold",
      label: "Mandatory Threshold",
      dealBreaker: true,
      evaluationType: "threshold",
      thresholdConfig: { min: 1, max: 100 },
    },
  ];

  const thresholdSnapshot = createMethodologySnapshot(
    thresholdCriteria,
    { dealBreakerIds: ["deal_breaker_threshold"], minYesCount: 2, totalCriteria: 2 },
    undefined,
    "actor"
  );

  it("passes when numericValue is within range", () => {
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        cost_threshold: { numericValue: 500000 },
        deal_breaker_threshold: { numericValue: 50 },
      },
    };
    const result = computeScreeningResults(thresholdSnapshot, evidence, false);
    expect(result.computedVerdict).toBe("VIABLE");
  });

  it("fails deal-breaker when numericValue exceeds max", () => {
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        cost_threshold: { numericValue: 500000 },
        deal_breaker_threshold: { numericValue: 150 }, // > max 100
      },
    };
    const result = computeScreeningResults(thresholdSnapshot, evidence, false);
    expect(result.computedVerdict).toBe("DISCOUNTED");
  });

  it("returns insufficient_evidence when numericValue missing for threshold criterion", () => {
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        cost_threshold: { textJustification: "expensive" }, // no numericValue
        deal_breaker_threshold: { numericValue: 50 },
      },
    };
    const result = computeScreeningResults(thresholdSnapshot, evidence, false);
    const costResult = result.criterionResults.find(
      (r) => r.criterionId === "cost_threshold"
    );
    expect(costResult?.status).toBe("insufficient_evidence");
  });
});

// ── Flag collection ───────────────────────────────────────────────────────────

describe("Flag rules", () => {
  it("collects flags when keyword rule triggers", () => {
    const criteriaWithFlag: ScreeningCriterion[] = [
      {
        id: "risk_criterion",
        label: "Risk",
        dealBreaker: false,
        evaluationType: "keyword",
        flagRules: [
          {
            condition: "keyword",
            keywords: ["high risk", "unproven"],
            flagLabel: "High Risk Detected",
            severity: "warning",
          },
          {
            condition: "keyword",
            keywords: ["illegal", "prohibited"],
            flagLabel: "Legal Blocker",
            severity: "critical",
          },
        ],
      },
    ];

    const flagSnapshot = createMethodologySnapshot(
      criteriaWithFlag,
      { dealBreakerIds: [], minYesCount: 1, totalCriteria: 1 },
      undefined,
      "actor"
    );

    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        risk_criterion: {
          textJustification: "This is a high risk but feasible approach",
        },
      },
    };

    const result = computeScreeningResults(flagSnapshot, evidence, false);
    expect(result.computedFlags).toHaveLength(1);
    expect(result.computedFlags[0].label).toBe("High Risk Detected");
    expect(result.computedFlags[0].severity).toBe("warning");
  });

  it("critical keyword causes fail verdict on deal-breaker", () => {
    const criteriaWithCriticalFlag: ScreeningCriterion[] = [
      {
        id: "legal_criterion",
        label: "Legal",
        dealBreaker: true,
        evaluationType: "keyword",
        flagRules: [
          {
            condition: "keyword",
            keywords: ["prohibited"],
            flagLabel: "Legal Blocker",
            severity: "critical",
          },
        ],
      },
    ];

    const flagSnapshot = createMethodologySnapshot(
      criteriaWithCriticalFlag,
      { dealBreakerIds: ["legal_criterion"], minYesCount: 1, totalCriteria: 1 },
      undefined,
      "actor"
    );

    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        legal_criterion: {
          textJustification: "This approach is prohibited by Treasury Board policy",
        },
      },
    };

    const result = computeScreeningResults(flagSnapshot, evidence, false);
    expect(result.computedVerdict).toBe("DISCOUNTED");
    const legalResult = result.criterionResults[0];
    expect(legalResult.status).toBe("fail");
  });
});

// ── No hardcoded criteria ─────────────────────────────────────────────────────

describe("No hardcoded criteria", () => {
  it("works with completely custom criterion ids (no C1–C6)", () => {
    const customCriteria: ScreeningCriterion[] = [
      { id: "pol-alignment", label: "Policy Alignment", dealBreaker: true, evaluationType: "binary" },
      { id: "env-impact",    label: "Environmental Impact", dealBreaker: false, evaluationType: "binary" },
      { id: "equity",       label: "Equity Considerations", dealBreaker: false, evaluationType: "binary" },
    ];

    const customSnapshot = createMethodologySnapshot(
      customCriteria,
      { dealBreakerIds: ["pol-alignment"], minYesCount: 3, totalCriteria: 3 },
      undefined,
      "actor"
    );

    const evidence: OptionEvidence = {
      optionId: "opt-custom",
      evidenceByCriterionId: {
        "pol-alignment": { textJustification: "Fully aligned with policy" },
        "env-impact":    { textJustification: "Minimal environmental impact" },
        equity:          { textJustification: "Positive equity outcome" },
      },
    };

    const result = computeScreeningResults(customSnapshot, evidence, false);
    expect(result.computedVerdict).toBe("VIABLE");
    expect(result.criterionResults).toHaveLength(3);
  });
});

// ── evaluatedBy field ─────────────────────────────────────────────────────────

describe("CriterionResult.evaluatedBy", () => {
  it("returns evaluatedBy='rule' for all rule-based evaluations", () => {
    const result = computeScreeningResults(snapshot, makeEvidence(), false);
    expect(result.criterionResults.every((r) => r.evaluatedBy === "rule")).toBe(true);
  });
});

// ── TEST 1: Zero evidence → INDETERMINATE ─────────────────────────────────────

describe("Level 5 — INDETERMINATE: no evidence at all", () => {
  it("returns INDETERMINATE when evidenceByCriterionId is completely empty", () => {
    // TEST 1: Option sans évidence → tous critères Pending → verdict INDETERMINATE
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {}, // zero evidence
    };
    const result = computeScreeningResults(snapshot, evidence, false);

    expect(result.computedVerdict).toBe("INDETERMINATE");
    // All criteria must be insufficient_evidence
    expect(
      result.criterionResults.every((r) => r.status === "insufficient_evidence")
    ).toBe(true);
    expect(result.criterionResults).toHaveLength(CRITERIA.length);
  });
});

// ── TEST 2: Partial evidence → INDETERMINATE ──────────────────────────────────

describe("Level 5 — INDETERMINATE: partial evidence", () => {
  it("returns INDETERMINATE when only some criteria have evidence and none fail", () => {
    // TEST 2: Option avec évidence partielle → verdict INDETERMINATE
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        strategic_alignment: { textJustification: "Fully aligned" },
        // business_need, legal, operational, cost, risk → no evidence
      },
    };
    const result = computeScreeningResults(snapshot, evidence, false);

    expect(result.computedVerdict).toBe("INDETERMINATE");
    const insufficient = result.criterionResults.filter(
      (r) => r.status === "insufficient_evidence"
    );
    expect(insufficient.length).toBe(CRITERIA.length - 1);
  });

  it("returns DISCOUNTED (not INDETERMINATE) when a deal-breaker explicitly fails, regardless of other missing evidence", () => {
    // Deal-breaker fail takes priority over INDETERMINATE (Rule 1 before Rule 2)
    const evidence: OptionEvidence = {
      optionId: "opt-1",
      evidenceByCriterionId: {
        strategic_alignment: { textJustification: "no" }, // explicit fail — deal-breaker
        // all others: no evidence
      },
    };
    const result = computeScreeningResults(snapshot, evidence, false);

    // Rule 1 fires before Rule 2: deal-breaker fail → DISCOUNTED
    expect(result.computedVerdict).toBe("DISCOUNTED");
    const stratResult = result.criterionResults.find(
      (r) => r.criterionId === "strategic_alignment"
    );
    expect(stratResult?.status).toBe("fail");
  });
});

// ── TEST 7: Override non-regression — justification required + audit trail ────

describe("Level 5 — Override non-regression", () => {
  it("APPLY_OVERRIDE creates OverrideRecord with mandatory audit fields", () => {
    // TEST 7: Override exige justification et garde audit trail.
    // Justification enforcement: OverridePanel.jsx (canApply = justification.trim().length > 0).
    // Audit trail: screeningReducer APPLY_OVERRIDE creates a full OverrideRecord.
    const optionId = "opt-override";
    const baseState = {
      ...SCREENING_EMPTY_STATE,
      decisionsByOptionId: {
        [optionId]: {
          optionId,
          criteriaById: {},
          computedVerdict: "DISCOUNTED" as const,
          finalVerdict: "DISCOUNTED" as const,
          override: false,
          overrideReason: "",
        },
      },
    };

    const nextState = screeningReducer(baseState, {
      type: "APPLY_OVERRIDE",
      optionId,
      finalVerdict: "VIABLE",
      overrideReason: "Option meets revised strategic objectives per ADM memo.",
      overriddenBy: "analyst_review",
    });

    const record = nextState.overrideRecordsByOptionId[optionId];

    // Audit trail fields all present
    expect(record).toBeDefined();
    expect(record.overrideReason.trim().length).toBeGreaterThan(0); // justification present
    expect(record.overriddenBy).toBe("analyst_review");             // who applied
    expect(record.overriddenAt).toBeTruthy();                       // when applied (ISO)
    expect(record.methodologyVersion).toBeDefined();                // methodology version
    expect(record.stale).toBe(false);                               // not yet stale
    expect(record.finalVerdict).toBe("VIABLE");                     // stored verdict

    // Legacy decision also synced
    const d = nextState.decisionsByOptionId[optionId];
    expect(d?.override).toBe(true);
    expect(d?.finalVerdict).toBe("VIABLE");
    expect(d?.overrideReason).toBe("Option meets revised strategic objectives per ADM memo.");
  });

  it("override becomes stale after LOCK_METHODOLOGY with a different hash", () => {
    // Override goes stale on methodology change — blocks CONFIRM until re-applied
    const optionId = "opt-stale";
    const baseState = {
      ...SCREENING_EMPTY_STATE,
      overrideRecordsByOptionId: {
        [optionId]: {
          finalVerdict: "VIABLE" as const,
          overrideReason: "Approved by director.",
          overriddenBy: "director",
          overriddenAt: new Date().toISOString(),
          methodologyVersion: "v1",
          stale: false,
        },
      },
    };

    const snapshot1 = {
      version: "v1",
      hash: "aaaa",
      criteria: [],
      viabilityRule: { dealBreakerIds: [], minYesCount: 0, totalCriteria: 0 },
      lockedBy: "analyst",
      lockedAt: new Date().toISOString(),
    };
    const snapshot2 = { ...snapshot1, version: "v2", hash: "bbbb" };

    // Lock with first snapshot (hash aaaa)
    const stateAfterLock1 = screeningReducer(baseState, {
      type: "LOCK_METHODOLOGY",
      snapshot: snapshot1,
    });
    // Lock with second snapshot (hash bbbb) — Reset A triggers
    const stateAfterLock2 = screeningReducer(stateAfterLock1, {
      type: "LOCK_METHODOLOGY",
      snapshot: snapshot2,
    });

    const record = stateAfterLock2.overrideRecordsByOptionId[optionId];
    expect(record?.stale).toBe(true);               // override is stale
    expect(stateAfterLock2.hasStaleOverrides).toBe(true); // blocks CONFIRM
  });
});
