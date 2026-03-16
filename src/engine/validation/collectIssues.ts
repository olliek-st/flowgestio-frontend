// src/engine/validation/collectIssues.ts
// ─── Public Validation Entry Point ───────────────────────────────────────────
//
// This is the ONLY function Step3Generate (and any future consumer) should call
// to obtain registry-based validation issues.
//
// Timing contract:
//   collectIssues() MUST be called on-save only — NOT reactively on keystrokes.
//   The caller (Step3Generate) owns the stale-flag lifecycle.
//
// Shape contract:
//   Returns ValidationIssue[] — compatible with the merged issue array in
//   Step3Generate (same fields as simpleValidator / ruleEngine output).
//
// Regulatory gating contract (pack-level — NOT rule-level):
//   PMI + TBS packs always run via runValidation.
//   REGULATORY packs are enumerated in REGULATORY_PACKS below.
//   A pack runs ONLY IF its declared domain appears in getActiveDomainsForContext(context).
//   If context is absent, or industry/subsector are missing, or no preset matches → 0 REG issues.
//   Registry types (ValidationRule, runValidation) are NOT modified by this gating.

import type { ValidationIssue, ValidationContext } from "./types";
import type { ValidationRule } from "./registry/types";
import { runValidation } from "./registry";
import { getActiveDomainsForContext } from "./registry/getActiveDomainsForContext";
import { privacyBC01Rules }      from "./docs/bc01/regulatory/privacy.rules";
import { procurementBC01Rules }  from "./docs/bc01/regulatory/procurement.rules";
import { securityBC01Rules }      from "./docs/bc01/regulatory/security.rules";
import { accessibilityBC01Rules }  from "./docs/bc01/regulatory/accessibility.rules";
import { environmentalBC01Rules }  from "./docs/bc01/regulatory/environmental.rules";
import { safetyHseBC01Rules }      from "./docs/bc01/regulatory/safety_hse.rules";
import { qualityRegBC01Rules }     from "./docs/bc01/regulatory/quality_reg.rules";
import { financialRegBC01Rules }   from "./docs/bc01/regulatory/financial_reg.rules";
import { exportControlBC01Rules }  from "./docs/bc01/regulatory/export_control.rules";

// ─── Regulatory pack registry ─────────────────────────────────────────────────
// Each entry pairs a domain label with its rule array.
// Domain labels MUST exactly match the activeDomains values in industry_presets.v1.json.
// Gating is at this level: the entire pack is included or excluded; no per-rule mutation.
//
// Phase 2 packs (active):
//   PRIVACY          — 7 rules (5 BLOCK + 2 WARN)
//   PUBLIC_PROCUREMENT — 7 rules (4 BLOCK + 3 WARN)
//
// Phase 3+: add further domain packs here (SECURITY, FINANCIAL_REG, SAFETY_HSE, …)

interface RegulatoryPack {
  domain: string;
  rules: ValidationRule[];
}

const REGULATORY_PACKS: RegulatoryPack[] = [
  { domain: "PRIVACY",            rules: privacyBC01Rules        },
  { domain: "PUBLIC_PROCUREMENT", rules: procurementBC01Rules    },
  { domain: "SECURITY",           rules: securityBC01Rules       },
  { domain: "ACCESSIBILITY",      rules: accessibilityBC01Rules  },
  { domain: "ENVIRONMENTAL",      rules: environmentalBC01Rules  },
  { domain: "SAFETY_HSE",         rules: safetyHseBC01Rules      },
  { domain: "QUALITY_REG",        rules: qualityRegBC01Rules     },
  { domain: "FINANCIAL_REG",      rules: financialRegBC01Rules   },
  { domain: "EXPORT_CONTROL",     rules: exportControlBC01Rules  },
];

// ─── Stable sort (mirrors runValidation order) ────────────────────────────────
const SEVERITY_ORDER: Record<string, number> = { BLOCK: 0, WARN: 1, INFO: 2 };

function sortIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.slice().sort((a, b) => {
    const sA = SEVERITY_ORDER[a.severity] ?? 9;
    const sB = SEVERITY_ORDER[b.severity] ?? 9;
    if (sA !== sB) return sA - sB;
    const secCmp = (a.sectionId ?? "").localeCompare(b.sectionId ?? "");
    if (secCmp !== 0) return secCmp;
    return a.ruleId.localeCompare(b.ruleId);
  });
}

/**
 * Run BC-01 validation rules.
 *
 * PMI + TBS packs always run.
 * REGULATORY packs run only when:
 *   (a) context provides non-empty industry + subsector,
 *   (b) the pair matches a preset in industry_presets.v1.json,
 *   (c) that preset's activeDomains is non-empty, AND
 *   (d) the pack's domain is listed in activeDomains.
 *
 * Gating is at pack enumeration level inside this function.
 * Registry types and runValidation are not modified.
 *
 * @param formData  Raw formData object from Step3Generate state.
 * @param context   Optional industry context for regulatory gating.
 * @returns         Sorted ValidationIssue[].
 */
export function collectIssues(
  formData: unknown,
  context?: ValidationContext | null
): ValidationIssue[] {
  // ── 1. PMI + TBS: always run ────────────────────────────────────────────────
  const baseIssues = runValidation({
    docType: "BC01",
    standards: ["PMI", "TBS"],
    formData,
  });

  // ── 2. REGULATORY: pack-level gating ───────────────────────────────────────
  // Short-circuit: no packs registered yet (Phase 1), or context absent.
  if (REGULATORY_PACKS.length === 0) return baseIssues;

  const activeDomains = getActiveDomainsForContext(context);
  if (activeDomains.length === 0) return baseIssues;

  // Execute only the packs whose domain is in the active set.
  const regIssues: ValidationIssue[] = [];
  for (const pack of REGULATORY_PACKS) {
    if (!activeDomains.includes(pack.domain)) continue;
    for (const rule of pack.rules) {
      try {
        regIssues.push(...rule.apply({ formData }));
      } catch {
        // Never crash the UI — swallow rule errors silently
      }
    }
  }

  if (regIssues.length === 0) return baseIssues;

  // ── 3. Merge + re-sort ──────────────────────────────────────────────────────
  return sortIssues([...baseIssues, ...regIssues]);
}
