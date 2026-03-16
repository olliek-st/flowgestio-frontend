// src/engine/validation/types.ts
// ─── Shared Validation Types ──────────────────────────────────────────────────
// Phase 1: BC-01 + PMI + TBS only.
// Phase 2+: Regulatory packs, Industry presets (add here; zero-touch registry/index).

// ─── ValidationIssue (shape exposed to UI) ───────────────────────────────────
// Intentionally compatible with the existing simpleValidator / ruleEngine output
// so Step3Generate can merge sources without any adapter layer.
export type ValidationIssue = {
  /** Stable, namespaced rule identifier — audit-safe. */
  ruleId: string;
  /** BLOCK = blocks export; WARN = advisory only. */
  severity: "BLOCK" | "WARN" | "INFO";
  /** Human-readable description of the issue. */
  message: string;
  /** Section where the issue should surface. */
  sectionId: string;
  /** Field within the section, if applicable. */
  appliesTo?: { fieldKey?: string } | null;
  /** Remediation hint shown in tooltip. */
  remedy?: { label: string } | null;
  /** Which standard produced this issue. */
  standard?: ValidationStandard;
};

// ─── Extensibility hooks (Phase 1: defined but not consumed) ─────────────────

export type ValidationStandard = "PMI" | "TBS" | "REGULATORY";

/** Phase 1 documents. CH01 is a placeholder only — no rules registered. */
export type DocType = "BC01" | "CH01";

/**
 * Context for future regulatory / industry pack filtering.
 * Not consumed in Phase 1; passed through for forward compat.
 */
export interface ValidationContext {
  industry?: string;
  subsector?: string;
  jurisdiction?: string;
}
