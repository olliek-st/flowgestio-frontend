// src/engine/validation/registry/getActiveDomainsForContext.ts
// ─── Preset-based Domain Lookup ───────────────────────────────────────────────
//
// Pure helper — no side effects, no I/O.
//
// Contract:
//   • Returns [] whenever industry or subsector is absent / empty.
//   • Returns [] when no preset matches the (industry, subsector) pair.
//   • Returns preset.activeDomains when a match is found.
//
// Safety: all array/object accesses are guarded; never throws.
//
// Note on import: we import the JSON directly (not via CONFIG_V1) because
// config/index.js is an untyped JS module and tsconfig has allowJs: false.
// resolveJsonModule: true guarantees the JSON import is fully typed.

import type { ValidationContext } from "../types";
import presetsJson from "../../../config/compliance/industry_presets.v1.json";

interface IndustryPreset {
  id: string;
  industry: string;
  subsector: string;
  activeDomains: string[];
}

// Type assertion: the JSON structure matches IndustryPreset[].
const INDUSTRY_PRESETS = presetsJson as IndustryPreset[];

/**
 * Returns the `activeDomains` for the given ValidationContext.
 *
 * Used by `collectIssues` to determine whether REGULATORY packs run at all,
 * and which domain-labelled rules within those packs are eligible.
 *
 * @example
 *   getActiveDomainsForContext({ industry: "HEALTH", subsector: "CLINIC" })
 *   // → ["PRIVACY", "SECURITY", "QUALITY_REG"]
 *
 *   getActiveDomainsForContext({ industry: "HEALTH" })
 *   // → []  (subsector missing)
 *
 *   getActiveDomainsForContext(null)
 *   // → []
 */
export function getActiveDomainsForContext(
  ctx: ValidationContext | null | undefined
): string[] {
  // Guard 1: context must have both fields (non-empty strings)
  if (!ctx) return [];
  const industry  = typeof ctx.industry  === "string" ? ctx.industry.trim()  : "";
  const subsector = typeof ctx.subsector === "string" ? ctx.subsector.trim() : "";
  if (!industry || !subsector) return [];

  // Guard 2: presets array must be non-empty (JSON import is always defined,
  // but guard defensively in case of a broken build or test environment)
  if (!Array.isArray(INDUSTRY_PRESETS) || INDUSTRY_PRESETS.length === 0) return [];

  // Guard 3: exact match on both industry + subsector (case-sensitive)
  const preset = INDUSTRY_PRESETS.find(
    (p) => p.industry === industry && p.subsector === subsector
  );

  return Array.isArray(preset?.activeDomains) ? preset!.activeDomains : [];
}
