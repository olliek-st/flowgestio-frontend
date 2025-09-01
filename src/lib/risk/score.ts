// src/lib/risk/score.ts
import type { RiskLevel5, OrganizationalSettings } from "@/types/businessCase";

const IDX: Record<RiskLevel5, number> = {
  "Very Low": 0, "Low": 1, "Medium": 2, "High": 3, "Very High": 4
};

export function computeRiskScore(
  probability: RiskLevel5,
  impact: RiskLevel5,
  matrix: OrganizationalSettings["riskMatrix"]
): number {
  return matrix.values[IDX[probability]][IDX[impact]];
}
