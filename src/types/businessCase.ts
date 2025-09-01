// src/types/businessCase.ts
import { z } from "zod";
import { businessCaseStep3Schema } from "../lib/schemas/businessCaseSchema";

// Extract TypeScript types from Zod schemas
export type BusinessCaseStep3_P1 = z.infer<typeof businessCaseStep3Schema>;
export type Option = BusinessCaseStep3_P1['options'][0];
export type LineItem = Option['lineItems'][0];
export type ProjectRisk = BusinessCaseStep3_P1['projectRisks'][0];
export type KPI = BusinessCaseStep3_P1['strategic']['successKPIs'][0];
export type OrganizationalSettings = BusinessCaseStep3_P1['organizational'];

// Additional types
export type CurrencyCode = "CAD" | "USD" | "EUR" | "GBP" | "ZAR" | "BWP" | "CDF";
export type RiskLevel5 = "Very Low" | "Low" | "Medium" | "High" | "Very High";
export type ProjectType = "new_development" | "infrastructure" | "process_improvement" | "compliance" | "maintenance";

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: "error" | "warning" | "info";
    code?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    recommendation?: string;
  }>;
}

// Financial Calculator Interface
export interface FinancialCalculator {
  calculateROI(costs: number, benefits: number): number | null;
  calculateNPV(cashflows: number[], discountRate: number, taxRate?: number): number;
  calculateMIRR(
    cashflows: number[], 
    financeRate: number, 
    reinvestRate: number
  ): { mirr: number | null; warnings: string[] };
  calculatePaybackPeriod(cashflows: number[]): { 
    months: number | null; 
    breakEvenMonth: number | null;
    discountedPayback?: number | null;
  };
  generateMonthlyCashflow(
    lineItems: LineItem[], 
    horizonMonths: number,
    orgSettings: OrganizationalSettings
  ): {
    series: number[];
    totals: { costs: number; benefits: number; net: number };
    metadata: {
      signChanges: number;
      hasIrregularFlow: boolean;
      maxDrawdown: number;
      peakCashFlow: number;
    };
  };
  computeRiskScore(
    probability: RiskLevel5, 
    impact: RiskLevel5, 
    matrix: OrganizationalSettings['riskMatrix']
  ): number;
}

export interface BaselineRequirements {
  requiredCategories: Array<LineItem['category']>;
  description: string;
}