// src/engine/bc01/s2_3/__tests__/screeningSnapshot.test.ts
import { describe, it, expect } from "vitest";
import {
  stableStringify,
  sha256,
  createMethodologySnapshot,
  validateSnapshot,
} from "../screeningSnapshot";
import type { ScreeningCriterion } from "../screeningTypes";

// ── stableStringify ───────────────────────────────────────────────────────────

describe("stableStringify", () => {
  it("produces deterministic output regardless of key order", () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("produces the same string for nested objects with different key order", () => {
    const a = { outer: { z: 1, a: 2 } };
    const b = { outer: { a: 2, z: 1 } };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("differentiates different values", () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });

  it("handles null", () => {
    expect(stableStringify(null)).toBe("null");
  });

  it("handles arrays (preserves order)", () => {
    expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  it("handles primitives directly", () => {
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(true)).toBe("true");
  });
});

// ── sha256 ────────────────────────────────────────────────────────────────────

describe("sha256", () => {
  it("produces a 64-char lowercase hex string", () => {
    const digest = sha256("hello");
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("known test vector: SHA-256 of empty string", () => {
    // FIPS 180-4 test vector — always correct regardless of platform
    expect(sha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("is self-consistent — same input always produces same output", () => {
    // Property test: determinism is the critical invariant for tamper detection.
    // The pure JS implementation produces consistent digests across calls.
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("TBS BC-01 Level 5")).toBe(sha256("TBS BC-01 Level 5"));
    expect(sha256("{}")).toBe(sha256("{}"));
  });

  it("is deterministic — same input always gives same output", () => {
    const input = "TBS BC-01 Level 5 Methodology";
    expect(sha256(input)).toBe(sha256(input));
  });

  it("is sensitive to input changes", () => {
    expect(sha256("hello")).not.toBe(sha256("Hello"));
    expect(sha256("hello")).not.toBe(sha256("hello "));
    expect(sha256("test1")).not.toBe(sha256("test2"));
  });

  it("handles UTF-8 multi-byte characters", () => {
    const emoji = sha256("🇨🇦");
    expect(emoji).toHaveLength(64);
    expect(sha256("café")).not.toBe(sha256("cafe"));
  });
});

// ── stableStringify + sha256: nested-payload determinism (Fix 3) ──────────────
//
// Verifies that a fully-populated hash payload with flagRules and viabilityRule
// produces an identical sha256 regardless of the key insertion order used to
// build the objects. This is the critical invariant for hash idempotence across
// sessions, serializers, and JSON.parse round-trips.

describe("nested-payload deterministic hash (Level 5 Appendix C)", () => {
  it("produces identical stableStringify for full payload built with different key order", () => {
    // Build payload A — natural insertion order
    const payloadA = {
      criteria: [
        {
          dealBreaker: true,
          evaluationType: "binary" as const,
          flagRules: [
            { condition: "keyword" as const, flagLabel: "Critical risk", keywords: ["loss", "breach"], severity: "critical" as const },
            { condition: "threshold" as const, flagLabel: "Cost overrun", severity: "warning" as const, threshold: 0.3 },
          ],
          id: "strategic_alignment",
          label: "Strategic Alignment",
        },
        {
          dealBreaker: false,
          evaluationType: "threshold" as const,
          id: "cost_magnitude",
          label: "Acceptable Cost Order of Magnitude",
          thresholdConfig: { max: 100000000, min: 0, unit: "CAD" },
        },
      ],
      scoringMatrixSpecMeta: {
        profile: "balanced",
        weights: { feasibility: 0.2, financial: 0.5, strategic: 0.3 },
      },
      viabilityRule: {
        dealBreakerIds: ["strategic_alignment"],
        minYesCount: 2,
        totalCriteria: 2,
      },
    };

    // Build payload B — deliberately different key insertion order at every level
    const payloadB = {
      viabilityRule: {
        totalCriteria: 2,
        dealBreakerIds: ["strategic_alignment"],
        minYesCount: 2,
      },
      scoringMatrixSpecMeta: {
        weights: { strategic: 0.3, financial: 0.5, feasibility: 0.2 },
        profile: "balanced",
      },
      criteria: [
        {
          label: "Strategic Alignment",
          id: "strategic_alignment",
          flagRules: [
            { severity: "warning" as const, flagLabel: "Cost overrun", threshold: 0.3, condition: "threshold" as const },
            { keywords: ["loss", "breach"], flagLabel: "Critical risk", condition: "keyword" as const, severity: "critical" as const },
          ],
          evaluationType: "binary" as const,
          dealBreaker: true,
        },
        {
          thresholdConfig: { unit: "CAD", min: 0, max: 100000000 },
          label: "Acceptable Cost Order of Magnitude",
          evaluationType: "threshold" as const,
          id: "cost_magnitude",
          dealBreaker: false,
        },
      ],
    };

    const strA = stableStringify(payloadA);
    const strB = stableStringify(payloadB);

    // stableStringify must produce identical output despite key insertion order
    expect(strA).toBe(strB);

    // sha256 of both must be identical
    expect(sha256(strA)).toBe(sha256(strB));
  });

  it("createMethodologySnapshot hash is stable across two calls with equivalent inputs", () => {
    const criteria = [
      {
        id: "legal_regulatory",
        label: "Legal/Regulatory Feasibility",
        dealBreaker: true,
        evaluationType: "binary" as const,
        flagRules: [
          { condition: "keyword" as const, flagLabel: "Regulatory breach", keywords: ["prohibited", "illegal"], severity: "critical" as const },
        ],
      },
      {
        id: "operational_feasibility",
        label: "Operational Feasibility",
        dealBreaker: false,
        evaluationType: "threshold" as const,
        thresholdConfig: { min: 0, max: 10, unit: "score" },
      },
    ];

    const viabilityRule = {
      dealBreakerIds: ["legal_regulatory"],
      minYesCount: 2,
      totalCriteria: 2,
    };

    const scoringMatrixSpecMeta = {
      profile: "compliance",
      weights: { feasibility: 0.5, financial: 0.2, strategic: 0.3 },
    };

    // Two independent snapshot calls — different lockedAt timestamps, same hash payload
    const snap1 = createMethodologySnapshot(criteria, viabilityRule, scoringMatrixSpecMeta, "analyst_A");
    const snap2 = createMethodologySnapshot(criteria, viabilityRule, scoringMatrixSpecMeta, "analyst_B");

    // lockedBy and lockedAt differ — hash must NOT depend on them
    expect(snap1.lockedBy).not.toBe(snap2.lockedBy);
    expect(snap1.hash).toBe(snap2.hash);

    // Verify validateSnapshot passes on both (validateSnapshot already imported at top)
    expect(validateSnapshot(snap1).valid).toBe(true);
    expect(validateSnapshot(snap2).valid).toBe(true);
  });
});

// ── createMethodologySnapshot ─────────────────────────────────────────────────

describe("createMethodologySnapshot", () => {
  const mockCriteria: ScreeningCriterion[] = [
    { id: "C1", label: "Strategic Alignment", dealBreaker: true },
    { id: "C2", label: "Business Need", dealBreaker: true },
    { id: "C3", label: "Feasibility", dealBreaker: false },
  ];

  const viabilityRule = {
    dealBreakerIds: ["C1", "C2"],
    minYesCount: 3,
    totalCriteria: 3,
  };

  it("creates a snapshot with a 64-char hash", () => {
    const snap = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "analyst_01"
    );
    expect(snap.hash).toHaveLength(64);
    expect(snap.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("embeds criteria and viabilityRule", () => {
    const snap = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "analyst_01"
    );
    expect(snap.criteria).toEqual(mockCriteria);
    expect(snap.viabilityRule).toEqual(viabilityRule);
    expect(snap.lockedBy).toBe("analyst_01");
  });

  it("produces the SAME hash when called twice with identical inputs", () => {
    const snap1 = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "actor"
    );
    const snap2 = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "actor"
    );
    // Hashes should match (independent of lockedAt timestamp)
    expect(snap1.hash).toBe(snap2.hash);
  });

  it("produces DIFFERENT hashes when criteria differ", () => {
    const snap1 = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "actor"
    );
    const differentCriteria: ScreeningCriterion[] = [
      ...mockCriteria,
      { id: "C4", label: "Extra", dealBreaker: false },
    ];
    const snap2 = createMethodologySnapshot(
      differentCriteria,
      viabilityRule,
      undefined,
      "actor"
    );
    expect(snap1.hash).not.toBe(snap2.hash);
  });

  it("produces DIFFERENT hashes when viabilityRule differs", () => {
    const snap1 = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "actor"
    );
    const snap2 = createMethodologySnapshot(
      mockCriteria,
      { ...viabilityRule, minYesCount: 2 },
      undefined,
      "actor"
    );
    expect(snap1.hash).not.toBe(snap2.hash);
  });
});

// ── validateSnapshot ──────────────────────────────────────────────────────────

describe("validateSnapshot", () => {
  const mockCriteria: ScreeningCriterion[] = [
    { id: "C1", label: "Criterion 1", dealBreaker: true },
  ];
  const viabilityRule = {
    dealBreakerIds: ["C1"],
    minYesCount: 1,
    totalCriteria: 1,
  };

  it("returns valid=true for an untampered snapshot", () => {
    const snap = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "test_actor"
    );
    const result = validateSnapshot(snap);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns valid=false when hash is tampered", () => {
    const snap = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "test_actor"
    );
    const tampered = { ...snap, hash: "0".repeat(64) };
    const result = validateSnapshot(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Hash mismatch");
  });

  it("returns valid=false when criteria are tampered", () => {
    const snap = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "test_actor"
    );
    const tampered = {
      ...snap,
      criteria: [
        ...snap.criteria,
        { id: "INJECTED", label: "Malicious criterion", dealBreaker: true },
      ],
    };
    const result = validateSnapshot(tampered);
    expect(result.valid).toBe(false);
  });

  it("returns valid=false for null/undefined", () => {
    // @ts-expect-error intentional null test
    const result = validateSnapshot(null);
    expect(result.valid).toBe(false);
  });

  it("returns valid=false for empty criteria array", () => {
    const snap = createMethodologySnapshot(
      mockCriteria,
      viabilityRule,
      undefined,
      "actor"
    );
    // Manually empty criteria but keep old hash (tamper)
    const tampered = { ...snap, criteria: [] };
    const result = validateSnapshot(tampered);
    expect(result.valid).toBe(false);
  });
});
