export type EvaluationProfileType = "balanced" | "transformation" | "efficiency" | "compliance";

export type TierWeights = {
  financial: number;
  strategic: number;
  feasibility: number;
};

export type RubricCriterion = {
  id: string;
  name: string;
  description?: string;
  weight: number;
  sourceSection?: string;
  referenceSections?: string[];
  requiresJustificationAbove?: number;
  minJustificationLength?: number;
  complianceMode?: "tiered" | "binary" | "rubric";
};

export type OptionFinancialInputs = {
  capex?: number;
  opexAnnual?: number;
  benefitsAnnual?: number;
  oneTimeBenefits?: number;
  capexByYear?: number[];
  opexByYear?: number[];
  benefitsByYear?: number[];
};

export type OptionScoreEntry = {
  score: number; // 1..5
  justification?: string;
  evidenceRefs?: string[];
  complianceTier?: "FULL" | "PARTIAL" | "NON_COMPLIANT";
};

export type OptionQualitativeScores = {
  strategic?: Record<string, OptionScoreEntry>;
  feasibility?: Record<string, OptionScoreEntry>;
};

export type OptionEntry = {
  optionId: string;
  name: string;
  description?: string;
  financialInputs?: OptionFinancialInputs;
  qualitativeScores?: OptionQualitativeScores;
};

export type Section2_1_Input = {
  discountRate: number;
  timeHorizonYears: number;
  inflationRate?: number;
  currencyUnit?: string;

  profileType: EvaluationProfileType;
  weights: TierWeights;
  methodologyLocked: boolean;

  strategicCriteria: RubricCriterion[];
  feasibilityCriteria: RubricCriterion[];
};

export type EngineInput = {
  section2_1: Section2_1_Input;
  options: OptionEntry[];
};

export type FinancialMetrics = {
  tco: number;
  npv: number;
  roi: number | null;
  paybackYears: number | null;
};

export type ScoredOption = {
  optionId: string;
  name: string;

  financial: FinancialMetrics;
  financialScore1to5: number;

  strategicScore1to5: number;
  feasibilityScore1to5: number;

  finalScore0to100: number;
  rank: number;

  flags: Array<{ level: "WARN" | "BLOCK"; code: string; message: string }>;
};

export type EngineOutput = {
  scoredOptions: ScoredOption[];
  comparativeTable: Array<{
    optionId: string;
    name: string;
    financialScore1to5: number;
    strategicScore1to5: number;
    feasibilityScore1to5: number;
    finalScore0to100: number;
    rank: number;
    flags: string[];
  }>;
};
