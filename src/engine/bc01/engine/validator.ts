import type { BC01Snapshot } from "../types/bc01.types";

export function hasValue(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true; // number/boolean (0 ok)
}

export function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

export function hasDependencies(bc: BC01Snapshot, paths?: string[]): boolean {
  if (!paths || paths.length === 0) return true;
  return paths.every((p) => hasValue(getNestedValue(bc, p)));
}

export function calculateCoverage(
  matrix: any,
  optionIds: string[],
  criteriaIds: string[]
): number {
  if (!matrix?.evaluations || optionIds.length === 0 || criteriaIds.length === 0) return 0;

  const optionSet = new Set(optionIds);
  const critSet = new Set(criteriaIds);

  const filled = new Set<string>();
  for (const ev of matrix.evaluations) {
    if (!optionSet.has(ev.optionId) || !critSet.has(ev.criterionId)) continue;

    const hasScore = ev.score !== undefined && ev.score !== null; // 0 OK
    const hasRating = typeof ev.rating === "string" && ev.rating.trim().length > 0;

    if (hasScore || hasRating) filled.add(`${ev.optionId}::${ev.criterionId}`);
  }

  const totalCells = optionIds.length * criteriaIds.length;
  return totalCells === 0 ? 0 : filled.size / totalCells;
}
