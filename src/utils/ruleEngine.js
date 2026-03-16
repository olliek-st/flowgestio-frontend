// src/utils/ruleEngine.js
// ✅ Phase 2 - Rule Engine Orchestrator (Policy + Capabilities, FlowGestio compatible)

import { DATE_RULES } from "./validators/dateValidators.js";
import { FINANCIAL_RULES } from "./validators/financialValidators.js";
import { DEPENDENCY_RULES } from "./validators/dependencyValidators.js";
import { SEMANTIC_RULES } from "./validators/semanticValidators.js";

import { DEFAULT_VALIDATION_POLICY } from "./validationPolicy.default.js";
import { buildPolicyFromCapabilities } from "./complianceCapabilities.js";

/**
 * Normalize rule collections into a registry map: { [ruleId]: ruleObj }
 * Accepts either:
 *  - Object map: { "R-FIN-01": ruleObj, ... }
 *  - Array: [ ruleObj, ... ] (must have rule.id)
 */
function toRuleRegistry(...collections) {
  const registry = {};

  for (const col of collections) {
    if (!col) continue;

    if (Array.isArray(col)) {
      for (const rule of col) {
        if (!rule) continue;
        const id = rule.id;
        if (!id) {
          console.warn("Rule missing id (skipped):", rule);
          continue;
        }
        registry[id] = rule;
      }
      continue;
    }

    if (typeof col === "object") {
      for (const [key, rule] of Object.entries(col)) {
        if (!rule) continue;
        const id = rule.id || key;
        registry[id] = rule;
      }
      continue;
    }

    console.warn("Unknown rules collection type (skipped):", col);
  }

  return registry;
}

/** Core (PMI) rules registry */
const CORE_RULES = toRuleRegistry(DATE_RULES, FINANCIAL_RULES, DEPENDENCY_RULES, SEMANTIC_RULES);

/** Back-compat export name (some code might import ALL_RULES) */
const ALL_RULES = CORE_RULES;

function getCategoryFromRuleId(ruleId) {
  if (typeof ruleId !== "string") return "OTHER";
  if (ruleId.startsWith("R-TIME-")) return "TEMPORAL";
  if (ruleId.startsWith("R-FIN-")) return "FINANCIAL";
  if (ruleId.startsWith("R-DEP-")) return "DEPENDENCY";
  if (ruleId.startsWith("R-SEM-")) return "SEMANTIC";
  // capability rules (examples)
  if (ruleId.startsWith("R-ESI-")) return "SEMANTIC";
  if (ruleId.startsWith("R-FT-")) return "FINANCIAL";
  if (ruleId.startsWith("R-CS-")) return "DEPENDENCY";
  return "OTHER";
}

/** Merge policy safely */
function normalizePolicy(policy) {
  const base =
    DEFAULT_VALIDATION_POLICY || {
      id: "default",
      params: {},
      disabledRuleIds: [],
      overrides: {},
      enabledCapabilities: [],
    };

  if (!policy) return base;

  return {
    id: policy.id || base.id,
    params: { ...(base.params || {}), ...(policy.params || {}) },
    disabledRuleIds: Array.isArray(policy.disabledRuleIds)
      ? policy.disabledRuleIds
      : base.disabledRuleIds || [],
    overrides: { ...(base.overrides || {}), ...(policy.overrides || {}) },
    enabledCapabilities: Array.isArray(policy.enabledCapabilities)
      ? policy.enabledCapabilities
      : base.enabledCapabilities || [],
  };
}

/**
 * Apply per-rule overrides (severity/message/targetField/etc.) without changing rule source.
 * Shallow override by design (predictable).
 */
function applyRuleOverrides(rule, ruleId, overrides) {
  const ov = overrides?.[ruleId];
  if (!ov) return rule;
  return { ...rule, ...ov };
}

/**
 * Determine rule source label for UI badges.
 * - "PMI Core" for CORE_RULES
 * - "Profile/<capabilityId>" or "Capabilities" for extra rules
 */
function getRuleSourceLabel(ruleId, runtimeMeta) {
  if (runtimeMeta?.coreRuleIds?.has(ruleId)) return "PMI Core";
  if (runtimeMeta?.capabilityRuleOwners?.[ruleId]) {
    return `Profile/${runtimeMeta.capabilityRuleOwners[ruleId]}`;
  }
  if (runtimeMeta?.capabilityRuleIds?.has(ruleId)) return "Profile";
  return "Other";
}

/**
 * Build runtime policy + runtime registry from capabilities (minimal, non-breaking)
 */
function buildRuntime(snapshot, effectivePolicy) {
  const safeSnapshot = snapshot ?? {};

  // Build capability fragment (params, overrides, extra rules)
  const capFrag = buildPolicyFromCapabilities(
    safeSnapshot,
    effectivePolicy.enabledCapabilities || []
  );

  // Merge policy pieces
  const mergedParams = {
    ...(effectivePolicy.params || {}),
    ...(capFrag.params || {}),
  };

  const mergedOverrides = {
    ...(effectivePolicy.overrides || {}),
    ...(capFrag.overrides || {}),
  };

  // Runtime rules registry: core + extra rules
  const extraRules = capFrag.extraRules || {};
  const runtimeRules = { ...CORE_RULES, ...extraRules };

  // Runtime meta: useful for UI badges + audit traces
  const coreRuleIds = new Set(Object.keys(CORE_RULES));
  const capabilityRuleIds = new Set(Object.keys(extraRules));

  // If you want owner labels per capability, you can optionally encode it in id prefixes
  // or extend buildPolicyFromCapabilities to return owners. For now, keep simple:
  const capabilityRuleOwners = capFrag.capabilityRuleOwners || {}; // optional future field

  const runtimeMeta = {
    enabledCapabilities: capFrag.enabledCapabilities || [],
    coreRuleIds,
    capabilityRuleIds,
    capabilityRuleOwners,
  };

  return {
    params: mergedParams,
    overrides: mergedOverrides,
    rules: runtimeRules,
    runtimeMeta,
  };
}

/**
 * Validate entire snapshot against all rules
 * @param {Object} snapshot - canonical formData
 * @param {Object} policy - optional (params, overrides, enabledCapabilities, disabledRuleIds)
 * @returns {Array} UI-compatible issues
 */
export function validateSnapshot(snapshot, policy) {
  const safeSnapshot = snapshot ?? {};
  const effectivePolicy = normalizePolicy(policy);

  const runtime = buildRuntime(safeSnapshot, effectivePolicy);

  const ctx = {
    policyId: effectivePolicy.id,
    params: runtime.params || {},
    enabledCapabilities: runtime.runtimeMeta.enabledCapabilities || [],
  };

  const issues = [];

  for (const [registryId, rawRule] of Object.entries(runtime.rules)) {
    const ruleId = rawRule?.id || registryId;

    // Disabled?
    if (effectivePolicy.disabledRuleIds?.includes(ruleId)) continue;

    // Apply overrides (policy + capability merged)
    const rule = applyRuleOverrides(rawRule, ruleId, runtime.overrides);

    try {
      if (!rule || typeof rule.check !== "function") {
        console.warn(`Rule ${ruleId} missing check() (skipped).`, rule);
        continue;
      }

      // Run check (rules may ignore ctx)
      const passed = rule.check(safeSnapshot, ctx);
      if (passed) continue;

      let severity = rule.severity || "WARN";

      // Escalation hook (rules may ignore ctx)
      if (typeof rule.shouldEscalate === "function" && rule.shouldEscalate(safeSnapshot, ctx)) {
        severity = "BLOCK";
      }

      const sectionId = rule.targetSection || rule.sectionId || null;
      const fieldKey = rule.targetField || rule.fieldKey || null;

      const message =
        severity === "BLOCK" && rule.escalatedMessage ? rule.escalatedMessage : rule.message;

      const context =
        typeof rule.getContextData === "function" ? rule.getContextData(safeSnapshot, ctx) : null;

      const source = getRuleSourceLabel(ruleId, runtime.runtimeMeta);

      issues.push({
        // --- required by UI ---
        severity,
        sectionId,
        appliesTo: { fieldKey },
        remedy: { label: rule.remedyLabel || "Review and fix" },

        // --- core metadata ---
        ruleId,
        name: rule.name || ruleId,
        message: message || "Validation failed",
        detailedMessage: rule.detailedMessage || message || "Validation failed",
        category: getCategoryFromRuleId(ruleId),
        context,

        // --- extras ---
        remedySteps: rule.remedySteps || [],
        dependencies: rule.dependencies || [],
        examples: rule.examples || null,

        // --- policy trace / UI badges ---
        source, // e.g. "PMI Core" or "Profile/ESI"
        tags: rule.tags || [], // optional future use
        policyId: effectivePolicy.id,
        enabledCapabilities: runtime.runtimeMeta.enabledCapabilities || [],

        // --- legacy aliases (do not break existing code) ---
        targetSectionId: sectionId,
        targetFieldKey: fieldKey,
        remedyLabel: rule.remedyLabel,
      });
    } catch (error) {
      console.warn(`Rule ${ruleId} execution failed:`, error);
    }
  }

  return issues;
}

export function validateSection(sectionId, snapshot, policy) {
  const allIssues = validateSnapshot(snapshot, policy);
  return allIssues.filter(
    (issue) =>
      issue.sectionId === sectionId ||
      (issue.dependencies && issue.dependencies.includes(sectionId))
  );
}

export function getValidationSummary(issues) {
  const safeIssues = Array.isArray(issues) ? issues : [];

  return {
    total: safeIssues.length,
    blocks: safeIssues.filter((i) => i.severity === "BLOCK").length,
    warns: safeIssues.filter((i) => i.severity === "WARN").length,
    infos: safeIssues.filter((i) => i.severity === "INFO").length,
    byCategory: {
      temporal: safeIssues.filter((i) => i.category === "TEMPORAL").length,
      financial: safeIssues.filter((i) => i.category === "FINANCIAL").length,
      dependency: safeIssues.filter((i) => i.category === "DEPENDENCY").length,
      semantic: safeIssues.filter((i) => i.category === "SEMANTIC").length,
      other: safeIssues.filter((i) => i.category === "OTHER").length,
    },
    bySection: safeIssues.reduce((acc, issue) => {
      const section = issue.sectionId || issue.targetSectionId || "GENERAL";
      acc[section] = (acc[section] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function isReadyForExport(snapshot, policy) {
  const issues = validateSnapshot(snapshot, policy);
  const blockers = issues.filter((i) => i.severity === "BLOCK");

  return {
    ready: blockers.length === 0,
    blockers,
    warnings: issues.filter((i) => i.severity === "WARN").length,
    totalIssues: issues.length,
  };
}

export function getValidationStatus(snapshot, policy) {
  const summary = getValidationSummary(validateSnapshot(snapshot, policy));

  if (summary.blocks > 0) {
    return `❌ ${summary.blocks} blocking issue${summary.blocks > 1 ? "s" : ""} must be resolved`;
  }
  if (summary.warns > 0) {
    return `⚠️ ${summary.warns} warning${summary.warns > 1 ? "s" : ""} (export allowed)`;
  }
  if (summary.infos > 0) {
    return `ℹ️ ${summary.infos} suggestion${summary.infos > 1 ? "s" : ""} for improvement`;
  }
  return "✅ All validations passed";
}

export function executeRule(ruleId, snapshot, policy) {
  // Uses core registry for existence check; capability rules are runtime-only
  const issues = validateSnapshot(snapshot, policy);
  return issues.find((i) => i.ruleId === ruleId) || null;
}

// Export core registry for testing/debugging
export { ALL_RULES, CORE_RULES };

