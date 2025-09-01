// src/lib/schemas/businessCaseSchema.js
import { z } from "zod";

// Legacy schema for existing form (keep existing)
export const BusinessCaseInputs = z.object({
  meta: z.object({
    title: z.string().min(3, "Add a project title"),
    date: z.string().optional(),
    author: z.string().optional(),
    version: z.string().optional(),
  }),
  org: z.object({
    sponsor: z.string().min(3, "Add a sponsor"),
    department: z.string().optional(),
  }),
  context: z.object({
    problem: z.string().min(10, "Briefly describe the problem or opportunity"),
    goals: z.array(z.string()).min(1, "Add at least one goal"),
    background: z.string().optional(),
  }),
  scope: z.object({ in: z.array(z.string()).optional(), out: z.array(z.string()).optional() }),
  options: z.array(z.object({
    name: z.string(),
    summary: z.string(),
    cost_estimate: z.number().optional(),
    benefits: z.string().optional(),
  })).optional(),
  recommended: z.object({ option: z.string().optional(), rationale: z.string().optional() }).optional(),
  benefits: z.object({
    financial: z.string().optional(),
    nonFinancial: z.string().optional(),
    kpis: z.array(z.string()).optional(),
    timeHorizon: z.string().optional(),
  }).optional(),
  costs: z.object({
    capex: z.number().optional(),
    opex_annual: z.number().optional(),
    funding: z.string().optional(),
  }).optional(),
  risks: z.array(z.object({
    risk: z.string(),
    impact: z.string(),
    mitigation: z.string(),
  })).optional(),
  schedule: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    milestones: z.array(z.object({ name: z.string(), date: z.string().optional() })).optional(),
  }).optional(),
  stakeholders: z.array(z.object({
    name: z.string(),
    role: z.string(),
    interest: z.string().optional(),
  })).optional(),
  approvals: z.array(z.object({
    name: z.string(),
    role: z.string(),
    signature: z.string().optional(),
    date: z.string().optional(),
  })).optional(),
});

export const defaultInputs = {
  meta: { title: "Untitled Initiative", date: new Date().toISOString().slice(0,10) },
  org: { sponsor: "" },
  context: { problem: "", goals: [] },
  scope: { in: [], out: [] },
  options: [],
  recommended: { option: "", rationale: "" },
  benefits: { kpis: [] },
  costs: {},
  risks: [],
  schedule: { milestones: [] },
  stakeholders: [],
  approvals: [],
};

// Phase 1 Schema - New structured approach
const zCurrency = z.enum(["CAD", "USD", "EUR", "GBP", "ZAR", "BWP", "CDF"]);
const zRecurrence = z.enum(["one-time", "monthly", "quarterly", "annual"]);
const zRiskLevel = z.enum(["Very Low", "Low", "Medium", "High", "Very High"]);
const zProjectType = z.enum(["new_development", "infrastructure", "process_improvement", "compliance", "maintenance"]);
const zLineItemCategory = z.enum([
  "capex", "opex", "licensing", "maintenance", "compliance",
  "revenue", "cost_savings", "risk_avoidance", "productivity"
]);

const zLineItem = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["cost", "benefit"]),
  category: zLineItemCategory,
  amount: z.number().positive(),
  recurrence: zRecurrence,
  startMonth: z.number().int().min(0),
  endMonth: z.number().int().min(0).optional(),
  confidence: z.enum(["Low", "Medium", "High"]),
  notes: z.string().optional(),
  recurrenceBehavior: z.object({
    endsAtHorizon: z.boolean().default(true),
    totalOccurrences: z.number().int().min(1).optional()
  }).optional()
});

const zRiskEntry = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  category: z.enum(["financial", "technical", "operational", "regulatory", "market"]),
  probability: zRiskLevel,
  impact: zRiskLevel,
  mitigation: z.string().min(1),
  owner: z.string().min(1),
  status: z.enum(["identified", "mitigating", "monitoring", "closed"]),
  residualRisk: zRiskLevel.optional(),
  riskScore: z.number().optional()
});

const zKPI = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseline: z.string().min(1),
  target: z.string().min(1),
  unit: z.string().min(1),
  measurementMethod: z.string().min(1),
  priority: z.enum(["Critical", "Important", "Nice-to-Have"]),
  measurementFrequency: z.enum(["Weekly", "Monthly", "Quarterly", "Annual"]),
  owner: z.string().min(1),
  baselineValidated: z.boolean().default(false),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  baselineValidationDate: z.string().optional(),
  baselineValidationNotes: z.string().optional()
});

const zOption = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  isBaseline: z.boolean(),
  implementationComplexity: z.enum(["Low", "Medium", "High"]),
  lineItems: z.array(zLineItem).min(1),
  optionSpecificRisks: z.array(zRiskEntry).default([]),
  _calc: z.any().optional()
});

// Risk matrix validation helper
const riskMatrixSchema = z.object({
  values: z.array(z.array(z.number().min(1).max(25)).length(5)).length(5)
    .refine(matrix => {
      // Validate monotonic increase
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 4; j++) {
          if (matrix[i][j] > matrix[i][j + 1]) return false;
        }
      }
      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 4; i++) {
          if (matrix[i][j] > matrix[i + 1][j]) return false;
        }
      }
      return true;
    }, "Risk matrix values must increase monotonically"),
  description: z.string().optional()
});

// Phase 1 Business Case Schema
export const businessCaseStep3Schema = z.object({
  schemaVersion: z.literal("1.0").default("1.0"),
  projectType: zProjectType.default("process_improvement"),
  
  strategic: z.object({
    businessNeed: z.string().min(10),
    problemStatement: z.string().min(10),
    opportunityDescription: z.string().optional(),
    strategicAlignment: z.array(z.string()).default([]),
    keyAssumptions: z.array(z.object({
      id: z.string().min(1),
      assumption: z.string().min(2),
      impact: z.enum(["High", "Medium", "Low"]),
      validation: z.string().min(2),
      validationStatus: z.enum(["pending", "validated", "invalidated", "partial"]).default("pending"),
      validationDate: z.string().optional(),
      validationNotes: z.string().optional()
    })).min(1),
    successKPIs: z.array(zKPI).default([]),
    constraints: z.array(z.object({
      type: z.enum(["scope", "time", "budget", "resource", "regulatory", "technical"]),
      description: z.string().min(1),
      impact: z.string().min(1),
      mitigation: z.string().optional()
    })).default([])
  }),
  
  financial: z.object({
    currency: zCurrency.default("CAD"),
    horizonMonths: z.number().int().min(6).max(120).default(36),
    discountRatePct: z.number().min(0).max(100).default(8),
    minimumROI: z.number().min(0).optional(),
    maximumPaybackMonths: z.number().int().min(1).optional(),
    requireNPV: z.boolean().default(false),
    requireMIRR: z.boolean().default(false),
    includeTaxes: z.boolean().default(false),
    includeInflation: z.boolean().default(false),
    taxRatePct: z.number().min(0).max(100).optional(),
    inflationRatePct: z.number().min(0).max(100).optional(),
    riskContingencyPct: z.number().min(0).max(50).optional()
  }),
  
  organizational: z.object({
    requiresRegulatory: z.boolean().default(false),
    defaultCurrency: zCurrency.default("CAD"),
    defaultDiscountRate: z.number().min(0).max(100).default(8),
    npvThreshold: z.number().min(0).default(50000),
    irrThreshold: z.number().min(0).default(50000),
    mandatoryApprovers: z.array(z.string()).default([]),
    riskToleranceLevel: z.enum(["Low", "Medium", "High"]).default("Medium"),
    riskMatrix: riskMatrixSchema.default({
      values: [
        [1,  2,  4,  6,  8],
        [2,  4,  6,  9,  12],
        [4,  6,  9,  12, 16],
        [6,  9,  12, 16, 20],
        [8,  12, 16, 20, 25],
      ]
    }),
    financeRatePct: z.number().min(0).max(100).default(8),
    reinvestRatePct: z.number().min(0).max(100).default(8),
    defaultRecurrenceEnd: z.enum(["horizon", "explicit"]).default("horizon"),
    baselineRequirements: z.record(z.object({
      requiredCategories: z.array(zLineItemCategory),
      description: z.string()
    })).default({})
  }),
  
  options: z.array(zOption).min(2),
  
  projectRisks: z.array(zRiskEntry.extend({
    affectsAllOptions: z.boolean().default(true),
    contingencyAmount: z.number().min(0).optional(),
    responseStrategy: z.enum(["avoid", "mitigate", "transfer", "accept"]).default("mitigate"),
    responseOwner: z.string().min(1),
    responseDeadline: z.string().optional()
  })).default([]),
  
  workflow: z.object({
    currentStatus: z.enum(["draft", "review", "approved", "rejected", "on_hold"]).default("draft"),
    approvals: z.array(z.object({
      role: z.string().min(1),
      name: z.string().min(1),
      status: z.enum(["pending", "approved", "rejected"]),
      date: z.string().optional(),
      comments: z.string().optional(),
      approvalLevel: z.enum(["required", "advisory"]).default("required")
    })).default([]),
    version: z.string().default("v1"),
    lastModified: z.string(),
    createdBy: z.string().min(1)
  }),
  
  recommendedOption: z.string().optional(),
  recommendationRationale: z.string().optional(),
  nextSteps: z.array(z.string()).default([]),
  lastFinancialReview: z.string().optional(),
  
  complianceChecks: z.array(z.object({
    checkType: z.string(),
    status: z.enum(["passed", "failed", "pending"]),
    date: z.string(),
    notes: z.string().optional()
  })).default([])
})
.refine(
  bc => bc.options.filter(o => o.isBaseline).length === 1,
  { message: "Exactly one baseline option is required", path: ["options"] }
);

// Default organizational settings
export const DEFAULT_ORGANIZATIONAL_SETTINGS = {
  requiresRegulatory: false,
  defaultCurrency: "CAD",
  defaultDiscountRate: 8,
  npvThreshold: 50000,
  irrThreshold: 50000,
  mandatoryApprovers: [],
  riskToleranceLevel: "Medium",
  riskMatrix: {
    values: [
      [1,  2,  4,  6,  8],   // Very Low probability
      [2,  4,  6,  9,  12],  // Low probability  
      [4,  6,  9,  12, 16],  // Medium probability
      [6,  9,  12, 16, 20],  // High probability
      [8,  12, 16, 20, 25],  // Very High probability
    ],
    description: "Standard 5x5 risk matrix with non-linear progression"
  },
  baselineRequirements: {
    new_development: {
      requiredCategories: ["maintenance", "opex", "risk_avoidance"],
      description: "New projects must show ongoing operational costs and avoided risks"
    },
    infrastructure: {
      requiredCategories: ["maintenance", "opex", "compliance"],
      description: "Infrastructure projects must include maintenance and compliance costs"
    },
    process_improvement: {
      requiredCategories: ["opex", "productivity"],
      description: "Process improvements must show current operational inefficiencies"
    },
    compliance: {
      requiredCategories: ["compliance", "risk_avoidance"],
      description: "Compliance projects must show regulatory costs and avoided penalties"
    },
    maintenance: {
      requiredCategories: ["maintenance", "risk_avoidance"],
      description: "Maintenance projects must show current maintenance burden and failure risks"
    }
  },
  financeRatePct: 8,
  reinvestRatePct: 8,
  defaultRecurrenceEnd: "horizon"
};