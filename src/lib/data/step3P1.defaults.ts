// src/lib/data/step3P1.defaults.ts
import type { BusinessCaseStep3_P1 } from "../../types/businessCase";
import { DEFAULT_ORGANIZATIONAL_SETTINGS } from "../schemas/businessCaseSchema";

export const DEFAULT_BC_P1: BusinessCaseStep3_P1 = {
  schemaVersion: "1.0",
  projectType: "process_improvement",
  
  strategic: {
    businessNeed: "",
    problemStatement: "",
    opportunityDescription: "",
    strategicAlignment: [],
    keyAssumptions: [
      { 
        id: "a1", 
        assumption: "Current demand patterns will remain stable", 
        impact: "Medium", 
        validation: "Monitor market trends and user feedback", 
        validationStatus: "pending" 
      }
    ],
    successKPIs: [],
    constraints: []
  },
  
  financial: {
    currency: "CAD",
    horizonMonths: 36,
    discountRatePct: 8,
    requireNPV: false,
    requireMIRR: false,
    includeTaxes: false,
    includeInflation: false
  },
  
  organizational: DEFAULT_ORGANIZATIONAL_SETTINGS,
  
  options: [
    {
      id: "baseline",
      name: "Do Nothing (Status Quo)",
      description: "Maintain current operating state with existing processes and systems.",
      isBaseline: true,
      implementationComplexity: "Low",
      lineItems: [
        { 
          id: "b1", 
          label: "Existing operational burden", 
          kind: "cost", 
          category: "opex", 
          amount: 3000, 
          recurrence: "monthly", 
          startMonth: 0, 
          confidence: "Medium",
          notes: "Current ongoing operational costs"
        },
        {
          id: "b2",
          label: "Maintenance and support costs",
          kind: "cost",
          category: "maintenance",
          amount: 1500,
          recurrence: "monthly",
          startMonth: 0,
          confidence: "High",
          notes: "Regular maintenance requirements"
        }
      ],
      optionSpecificRisks: [
        {
          id: "br1",
          statement: "Continuing with status quo may lead to competitive disadvantage",
          category: "operational",
          probability: "Medium",
          impact: "High",
          mitigation: "Monitor competitive landscape and be prepared to act",
          owner: "Business Owner",
          status: "identified"
        }
      ]
    },
    {
      id: "proposed",
      name: "Proposed Solution",
      description: "Implement improved workflow, tooling, and processes to address current challenges.",
      isBaseline: false,
      implementationComplexity: "Medium",
      lineItems: [
        { 
          id: "p1", 
          label: "Implementation and setup costs", 
          kind: "cost", 
          category: "capex", 
          amount: 40000, 
          recurrence: "one-time", 
          startMonth: 0, 
          confidence: "High",
          notes: "One-time setup and implementation"
        },
        { 
          id: "p2", 
          label: "Software licensing", 
          kind: "cost", 
          category: "licensing", 
          amount: 1200, 
          recurrence: "monthly", 
          startMonth: 1, 
          confidence: "High",
          notes: "Monthly software subscription costs"
        },
        { 
          id: "p3", 
          label: "Productivity improvements", 
          kind: "benefit", 
          category: "productivity", 
          amount: 5000, 
          recurrence: "monthly", 
          startMonth: 4, 
          confidence: "Medium",
          notes: "Expected efficiency gains after implementation"
        },
        {
          id: "p4",
          label: "Cost savings from process optimization",
          kind: "benefit",
          category: "cost_savings",
          amount: 2000,
          recurrence: "monthly",
          startMonth: 6,
          confidence: "Medium",
          notes: "Operational cost reductions"
        }
      ],
      optionSpecificRisks: [
        {
          id: "pr1",
          statement: "Implementation may face user adoption challenges",
          category: "operational",
          probability: "Medium",
          impact: "Medium",
          mitigation: "Comprehensive training and change management program",
          owner: "Project Manager",
          status: "identified"
        }
      ]
    }
  ],
  
  projectRisks: [
    {
      id: "r1",
      statement: "Budget constraints may limit implementation scope",
      category: "financial",
      probability: "Low",
      impact: "High",
      mitigation: "Secure budget approval early and identify alternative funding sources",
      owner: "Finance Team",
      status: "identified",
      affectsAllOptions: true,
      responseStrategy: "mitigate",
      responseOwner: "Project Sponsor"
    }
  ],
  
  workflow: {
    currentStatus: "draft",
    approvals: [],
    version: "v1.0",
    lastModified: new Date().toISOString(),
    createdBy: "system"
  },
  
  nextSteps: [
    "Complete stakeholder analysis",
    "Refine financial estimates",
    "Develop detailed implementation plan"
  ]
};