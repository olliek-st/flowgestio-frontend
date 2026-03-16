// src/engine/validation/registry/types.ts
// ─── Rule Interface ───────────────────────────────────────────────────────────

import type { ValidationIssue, ValidationStandard } from "../types";

/** Opaque wrapper around raw formData — keeps rules honest about what they access. */
export interface ValidationInput {
  formData: unknown;
}

/**
 * A single deterministic validation rule.
 *
 * Rules MUST:
 *   - Be pure functions (no side effects, no I/O)
 *   - Return an array (0 = no issue, 1..n = issues found)
 *   - Use only `input.formData` for their logic
 *   - Never throw (guard defensively)
 *
 * Rules MUST NOT:
 *   - Call AI / LLM
 *   - Read from any external state
 *   - Access DOM / browser APIs
 */
export interface ValidationRule {
  /** Stable, namespaced rule ID (e.g. "TBS-BC01-NEED-REQUIRED"). Uppercase only. */
  id: string;
  /** Which standard governs this rule. Used for selective execution. */
  standard: ValidationStandard;
  /** Execute the rule against the given input. Returns 0..n issues. */
  apply: (input: ValidationInput) => ValidationIssue[];
}
