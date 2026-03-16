// src/utils/validationUtils.ts
// ─── Validation UI Helpers ────────────────────────────────────────────────────
// Pure, stateless helpers consumed by Step3Generate (and any future consumer).
// These functions do NOT run any validation logic — they operate on an
// already-computed ValidationIssue[] array produced by collectIssues().
//
// Previously hosted in simpleValidator.js (now deleted).

import type { ValidationIssue } from "../engine/validation/types";

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface ValidationSummary {
  hasBlocks: boolean;
  hasWarns: boolean;
  blockCount: number;
  warnCount: number;
  infoCount: number;
  isValid: boolean;
  blocks: ValidationIssue[];
  warns: ValidationIssue[];
  infos: ValidationIssue[];
}

/**
 * Compute a flat summary from a ValidationIssue[] array.
 * Consumed by Step3Generate to drive the header BLOCK/WARN counts.
 */
export function getValidationSummary(results: ValidationIssue[]): ValidationSummary {
  const list = Array.isArray(results) ? results : [];
  const blocks = list.filter((r) => r.severity === "BLOCK");
  const warns = list.filter((r) => r.severity === "WARN");
  const infos = list.filter((r) => r.severity === "INFO");
  return {
    hasBlocks: blocks.length > 0,
    hasWarns: warns.length > 0,
    blockCount: blocks.length,
    warnCount: warns.length,
    infoCount: infos.length,
    isValid: blocks.length === 0,
    blocks,
    warns,
    infos,
  };
}

// ─── Section filter ───────────────────────────────────────────────────────────

/**
 * Filter a ValidationIssue[] to those matching a specific sectionId.
 * Exact match only — callers that need remapping should normalise first.
 *
 * Supports two call signatures (both are common in Step3Generate):
 *   getValidationForSection(sectionId, allResults)
 *   getValidationForSection(allResults, sectionId)
 */
export function getValidationForSection(
  a: ValidationIssue[] | string,
  b: ValidationIssue[] | string
): ValidationIssue[] {
  const sectionId = typeof a === "string" ? a : typeof b === "string" ? b : null;
  const allResults = Array.isArray(a) ? a : Array.isArray(b) ? b : [];
  if (!sectionId) return [];
  return allResults.filter((r) => r?.sectionId === sectionId);
}
