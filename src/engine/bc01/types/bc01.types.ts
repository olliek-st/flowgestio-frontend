export type BC01Snapshot = {
  meta: BC01Meta;
  sections: BC01Sections;
  derived?: BC01Derived;
};

export type BC01Meta = {
  version: "BC-01";
  projectId?: string;
  projectType?:
    | "Technology"
    | "Infrastructure"
    | "Process"
    | "Regulatory"
    | "Compliance"
    | "Strategic";
  projectComplexity?: "Simple" | "Moderate" | "High" | "Very High";
  sector?: "Public" | "Private" | "Nonprofit";
  currency?: string;
  financialThreshold?: number;
};

export type BC01Sections = {
  s2?: Section2_ProblemDefinition;
  s3?: Section3_ProjectOverview;
  s4?: Section4_EconomicAnalysis;
  s5?: Section5_FinancialAnalysis;
  s6?: Section6_RiskAnalysis;
  s7?: Section7_OptionsAnalysis;
  s8?: Section8_Recommendation;
  s9?: Section9_ImplementationReadiness;
};

export type BC01Derived = {
  totals?: { capex?: number; opex?: number; benefits?: number };
  horizonMonths?: number;
  frontRunnerOptionId?: string;
  optionCount?: number;
  criteriaCount?: number;
  riskCount?: number;
};

export type Section2_ProblemDefinition = {
  problemStatement?: string;
  impacts?: {
    type: "Financial" | "Operational" | "Strategic" | "Reputational";
    description: string;
    quantified?: boolean;
  }[];
  stakeholders?: string[];
};

export type Section3_ProjectOverview = {
  description?: string;
  objectives?: string[];
  scope?: string;
  assumptions?: string[];
  constraints?: string[];
  milestones?: { name: string; date?: string }[];
  performance?: { kpis?: string[]; successCriteria?: string[] };
};

export type Section4_EconomicAnalysis = {
  framework?: "CBA" | "CEA" | "MCA" | "Custom";
  benefits?: string[];
  costs?: string[];
  externalImpacts?: string[];
  resources?: string[];
};

export type Section5_FinancialAnalysis = {
  scope?: { costs?: boolean; benefits?: boolean; timeHorizon?: number };
  costs?: {
    capex?: { total: number; breakdown?: Record<string, number> };
    opex?: { annual?: number; breakdown?: Record<string, number> };
  };
  benefits?: { tangible?: Record<string, number>; intangible?: string[] };
  timeline?: { capexPeriod?: [number, number]; opexStart?: number; benefitsStart?: number };
};

export type Section6_RiskAnalysis = { riskRegister?: Risk[]; categories?: string[] };

export type Risk = {
  id: string;
  description: string;
  category?: string;
  probability?: "Low" | "Medium" | "High";
  impact?: "Low" | "Medium" | "High";
  response?: { strategy?: "Mitigate" | "Accept" | "Transfer" | "Avoid"; plan?: string };
};

export type Section7_OptionsAnalysis = {
  options?: Option[];
  criteria?: Criterion[];
  comparisonMatrix?: ComparisonMatrix;
  synthesis?: string;
};

export type Option = {
  id: string;
  name: string;
  description?: string;
  approach?: string;
  isDoNothing?: boolean;
};

export type Criterion = { id: string; name: string; weight?: number; alignsWithObjectives?: boolean };

export type ComparisonMatrix = {
  evaluations?: {
    optionId: string;
    criterionId: string;
    score?: number;
    rating?: string;
    rationale?: string;
  }[];
};

export type Section8_Recommendation = {
  type?: "Go" | "Conditional Go" | "No Clear Winner" | "Further Analysis";
  selectedOption?: string;
  rationale?: string;
  confidenceLevel?: "High" | "Moderate" | "Low";
  conditions?: { condition: string; owner?: string; verificationCriteria?: string; deadline?: string }[];
  tradeOffsAcknowledged?: boolean;
};

export type Section9_ImplementationReadiness = {
  summary?: {
    overallLevel?: "High" | "Medium" | "Low";
    dimensionRatings?: {
      organizationalCapacity?: "High" | "Medium" | "Low";
      governance?: "High" | "Medium" | "Low";
      resources?: "High" | "Medium" | "Low";
      externalDeps?: "High" | "Medium" | "Low";
      executionRisk?: "High" | "Medium" | "Low";
    };
    criticalGaps?: string[];
  };
  conclusion?: {
    conclusionType?: "Go" | "Conditional Go" | "Further Analysis Required";
    readinessRationale?: string;
    preconditions?: { condition: string; owner?: string; verificationCriteria?: string; deadline?: string }[];
    acknowledgedRisks?: string[];
    nextSteps?: string;
  };
};
