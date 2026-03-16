// src/lib/mappings/UniversalToBC01Mapper.js

import { DEFAULT_ORGANIZATIONAL_SETTINGS } from "../schemas/businessCaseSchema";

/**
 * UniversalToBC01Mapper
 * Maps universal project data (from Step 1) to BC-01 Phase 1 schema format.
 * 
 * TBS-Compliant Strategy:
 * - Section 1: High-level executive summary (outcomes-focused, 2 paragraphs)
 * - 1.1.2: Concise problem statement (1-2 sentences, factual)
 * - 1.1.3: Drivers for change (list)
 * - 1.1.4: Business outcomes (list)
 */
export class UniversalToBC01Mapper {
  
  /**
   * Main mapping function
   * 
   * @param {Object} universalData - Data from Step 1 (UniversalProjectSchema)
   * @returns {Object} - Partial businessCaseStep3Schema (pre-filled)
   */
  map(universalData) {
    console.log("[UniversalToBC01Mapper] Mapping universal data to BC-01 schema");
    
    return {
      schemaVersion: "1.0",
      projectType: universalData.project?.type || "process_improvement",
      
      // Strategic section (TBS-compliant separation)
      strategic: this._mapStrategic(universalData),
      
      // Financial settings (defaults + currency from universal)
      financial: this._mapFinancial(universalData),
      
      // Organizational settings (defaults)
      organizational: this._mapOrganizational(universalData),
      
      // Options: Create baseline from universal financial data
      options: this._mapOptions(universalData),
      
      // Project risks (empty - user fills in Step 3)
      projectRisks: [],
      
      // Workflow
      workflow: this._mapWorkflow(universalData),
      
      // Recommendation (empty - user fills in Step 3)
      recommendedOption: undefined,
      recommendationRationale: undefined,
      nextSteps: [],
      
      // Compliance
      lastFinancialReview: undefined,
      complianceChecks: []
    };
  }
  
  /**
   * Map strategic section (TBS-Compliant)
   * 
   * Creates 4 distinct outputs:
   * - businessNeed: Executive summary (2 paragraphs, outcomes-focused)
   * - problemStatement: Concise problem (1-2 sentences)
   * - drivers: List of change drivers
   * - outcomes: List of business outcomes
   */
  _mapStrategic(universalData) {
    const rawProblem = universalData.businessNeed?.problemStatement || "";
    const outcomes = universalData.businessNeed?.outcomes || [];
    const rawDrivers = universalData.businessNeed?.drivers || [];
    
    // TBS Section 1: Executive summary (high-level, outcomes-focused)
    const businessNeed = this._makeExecutiveSummary(rawProblem, outcomes);
    
    // TBS 1.1.2: Concise problem statement (1-2 sentences)
    const problemStatement = this._makeConciseStatement(rawProblem);
    
    // TBS 1.1.3: Drivers (formatted list)
    const drivers = Array.isArray(rawDrivers) 
      ? rawDrivers 
      : (rawDrivers ? [rawDrivers] : []);
    
    // TBS 1.1.4: Outcomes (from universal outcomes)
    const outcomesList = outcomes.map((outcome, idx) => ({
      id: `outcome-${idx + 1}`,
      description: outcome.description || outcome.outcome,
      type: 'business',
      metrics: outcome.metrics || []
    }));
    
    return {
      // TBS-compliant fields
      businessNeed,          // Section 1 (executive summary)
      problemStatement,      // 1.1.2 (concise)
      drivers,              // 1.1.3 (list)
      outcomes: outcomesList, // 1.1.4 (list)
      
      // Empty - user fills in Step 3
      opportunityDescription: "",
      strategicAlignment: [],
      
      // Transform outcomes → successKPIs (with placeholders)
      successKPIs: outcomes.map((outcome, idx) => ({
        id: `KPI-${String(idx + 1).padStart(3, '0')}`,
        name: outcome.description,
        baseline: outcome.measurement || "",
        target: "",
        unit: "",
        measurementMethod: outcome.measurement || "",
        priority: "Important",
        measurementFrequency: "Monthly",
        owner: universalData.project?.manager || "",
        baselineValidated: false,
        description: "",
        targetDate: "",
        baselineValidationDate: "",
        baselineValidationNotes: ""
      })),
      
      // Empty - user fills in Step 3
      keyAssumptions: [],
      constraints: []
    };
  }
  
  /**
   * TBS Helper: Create executive summary (Section 1)
   * - High-level, outcomes-focused
   * - 2 paragraphs maximum
   * - No technical details or specific numbers
   */
  _makeExecutiveSummary(rawProblem, outcomes) {
    if (!rawProblem && outcomes.length === 0) return "";
    
    let summary = String(rawProblem || "")
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove overly specific details (TBS prefers high-level in Section 1)
    summary = summary
      // Remove specific percentages
      .replace(/\b\d{1,3}%\b/g, 'significantly')
      // Remove dollar amounts
      .replace(/\$\s?\d[\d,]*(\.\d+)?[KMB]?\b/gi, '')
      // Remove precise numbers with units
      .replace(/\b\d[\d,]*\s*(applications?|hours?|days?|users?)\b/gi, 'many $1')
      // Normalize technical terms
      .replace(/\bEOL\b/gi, 'end-of-life')
      .replace(/\bv\.\d+(\.\d+)?\b/gi, '')
      .replace(/\bTBS\s?\d{4}\s?/gi, 'Treasury Board ')
      .replace(/\bCybersecurity Standards?\b/gi, 'security requirements');
    
    // Extract first 2-3 sentences for executive summary
    const sentences = summary
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 20);
    
    let executiveSummary = sentences.slice(0, 3).join(' ').trim();
    
    // Add outcomes context if available
    if (outcomes.length > 0 && executiveSummary) {
      const outcomesPhrase = outcomes.length === 1 
        ? "This initiative will enable enhanced service delivery and operational efficiency."
        : `This initiative will deliver ${outcomes.length} key business outcomes including improved service delivery and operational efficiency.`;
      
      executiveSummary = `${executiveSummary} ${outcomesPhrase}`;
    }
    
    return executiveSummary;
  }
  
  /**
   * TBS Helper: Create concise problem statement (1.1.2)
   * - Factual and specific
   * - 1-2 sentences maximum
   * - Focus on core problem
   */
  _makeConciseStatement(rawProblem) {
    if (!rawProblem) return "";
    
    let statement = String(rawProblem)
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove numbered sections and bullets
    statement = statement
      .replace(/^\d+\.\s*(.+?)(?=\d+\.|$)/gm, '$1')
      .replace(/^[•\-\*]\s*/gm, '');
    
    // Extract core problem (first substantive sentences)
    const sentences = statement
      .split(/(?<=[.!?])\s+/)
      .filter(s => {
        // Filter out section headers
        return s.trim().length > 20 && 
               !s.match(/^(Problem Statement|Business Need|The Pain Point|Drivers?)/i);
      });
    
    // Return first 1-2 sentences
    return sentences.slice(0, 2).join(' ').trim();
  }
  
  /**
   * Map financial section
   */
  _mapFinancial(universalData) {
    return {
      currency: universalData.financial?.currency || "CAD",
      horizonMonths: 36, // Default 3 years
      discountRatePct: 8, // Default discount rate
      minimumROI: undefined,
      maximumPaybackMonths: undefined,
      requireNPV: false,
      requireMIRR: false,
      includeTaxes: false,
      includeInflation: false,
      taxRatePct: undefined,
      inflationRatePct: undefined,
      riskContingencyPct: undefined
    };
  }
  
  /**
   * Map organizational section (mostly defaults)
   */
  _mapOrganizational(universalData) {
    return {
      ...DEFAULT_ORGANIZATIONAL_SETTINGS
    };
  }
  
  /**
   * Map options section
   * Creates baseline option from universal financial data
   */
  _mapOptions(universalData) {
    const options = [];
    
    // Baseline option (Status Quo)
    const baselineOption = {
      id: "opt-baseline",
      name: "Status Quo (Baseline)",
      description: "Continue current operations with no major investment",
      isBaseline: true,
      implementationComplexity: "Low",
      lineItems: this._createBaselineLineItems(universalData),
      optionSpecificRisks: [],
      _calc: null // Will be calculated when user adds line items
    };
    
    options.push(baselineOption);
    
    return options;
  }
  
  /**
   * Create baseline line items from universal financial data
   */
  _createBaselineLineItems(universalData) {
    const lineItems = [];
    const capex = universalData.financial?.capex;
    const opex = universalData.financial?.opex_annual;
    
    // CapEx (one-time cost)
    if (capex && capex > 0) {
      lineItems.push({
        id: "li-baseline-capex",
        label: "Current system capital costs",
        kind: "cost",
        category: "capex",
        amount: capex,
        recurrence: "one-time",
        startMonth: 0,
        confidence: "Medium",
        notes: "Imported from Step 1 - Please verify and update if needed",
        recurrenceBehavior: undefined
      });
    }
    
    // OpEx (annual recurring)
    if (opex && opex > 0) {
      lineItems.push({
        id: "li-baseline-opex",
        label: "Annual operating costs",
        kind: "cost",
        category: "opex",
        amount: opex,
        recurrence: "annual",
        startMonth: 0,
        confidence: "Medium",
        notes: "Imported from Step 1 - Please verify and update if needed",
        recurrenceBehavior: {
          endsAtHorizon: true,
          totalOccurrences: undefined
        }
      });
    }
    
    // If no financial data provided, create placeholder
    if (lineItems.length === 0) {
      lineItems.push({
        id: "li-baseline-placeholder",
        label: "Baseline operating costs (to be specified)",
        kind: "cost",
        category: "opex",
        amount: 1, // Minimal placeholder
        recurrence: "annual",
        startMonth: 0,
        confidence: "Low",
        notes: "⚠️ Please update with actual baseline costs for accurate comparison",
        recurrenceBehavior: {
          endsAtHorizon: true,
          totalOccurrences: undefined
        }
      });
    }
    
    return lineItems;
  }
  
  /**
   * Map workflow section
   */
  _mapWorkflow(universalData) {
    return {
      currentStatus: "draft",
      approvals: this._createApprovals(universalData),
      version: "v1",
      lastModified: new Date().toISOString(),
      createdBy: universalData.project?.manager || "Unknown"
    };
  }
  
  /**
   * Create approvals from stakeholders
   */
  _createApprovals(universalData) {
    const approvals = [];
    
    // Add sponsor as first required approver
    const sponsor = universalData.project?.sponsor;
    if (sponsor && sponsor.trim()) {
      approvals.push({
        role: "Sponsor",
        name: sponsor,
        status: "pending",
        date: undefined,
        comments: undefined,
        approvalLevel: "required"
      });
    }
    
    // Add stakeholders with role "Sponsor" or "Owner" as approvers
    const stakeholders = universalData.stakeholders || [];
    stakeholders.forEach(stakeholder => {
      if (stakeholder.role === "Owner" || stakeholder.role === "Sponsor") {
        // Don't duplicate if already added above
        if (!approvals.find(a => a.name === stakeholder.name)) {
          approvals.push({
            role: stakeholder.role,
            name: stakeholder.name,
            status: "pending",
            date: undefined,
            comments: undefined,
            approvalLevel: "required"
          });
        }
      }
    });
    
    return approvals;
  }
  
  /**
   * Helper: Get summary of what was mapped
   */
  getMappingSummary(universalData, mappedData) {
    const summary = {
      preFilled: [],
      needsInput: []
    };
    
    // Check what was pre-filled
    if (mappedData.strategic.businessNeed) {
      summary.preFilled.push("Business Need (Executive Summary)");
    }
    if (mappedData.strategic.problemStatement) {
      summary.preFilled.push("Problem Statement (1.1.2)");
    }
    if (mappedData.strategic.drivers && mappedData.strategic.drivers.length > 0) {
      summary.preFilled.push(`${mappedData.strategic.drivers.length} Driver(s)`);
    }
    if (mappedData.strategic.outcomes && mappedData.strategic.outcomes.length > 0) {
      summary.preFilled.push(`${mappedData.strategic.outcomes.length} Outcome(s)`);
    }
    if (mappedData.strategic.successKPIs.length > 0) {
      summary.preFilled.push(`${mappedData.strategic.successKPIs.length} Success KPI(s)`);
    }
    if (mappedData.options[0].lineItems.length > 0) {
      summary.preFilled.push(`Baseline with ${mappedData.options[0].lineItems.length} line item(s)`);
    }
    if (mappedData.workflow.approvals.length > 0) {
      summary.preFilled.push(`${mappedData.workflow.approvals.length} Approval(s)`);
    }
    
    // Check what needs input
    if (mappedData.strategic.keyAssumptions.length === 0) {
      summary.needsInput.push("Key Assumptions");
    }
    if (mappedData.strategic.constraints.length === 0) {
      summary.needsInput.push("Constraints");
    }
    if (mappedData.options.length === 1) {
      summary.needsInput.push("Alternative Options");
    }
    if (mappedData.projectRisks.length === 0) {
      summary.needsInput.push("Project Risks");
    }
    
    return summary;
  }
}

/**
 * Singleton instance export for convenience
 */
export const universalToBC01Mapper = new UniversalToBC01Mapper();
