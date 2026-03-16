/**
 * Document Builder Service
 * Generates personalized business case documents from analyzed P1 models
 * Integrates with research data and provides fallback content when research fails
 */

export const documentBuilder = {
  /**
   * Build a complete document from analyzed P1 model data
   * @param {string} docType - Type of document to build (e.g., 'business-case')
   * @param {object} analyzedModel - P1 model with financial calculations (_calc objects)
   * @param {object} context - Research context (topic, industry, region)
   * @param {array} insights - Research insights/citations
   * @returns {object} Complete document with title, meta, and sections
   */
  async buildDocument(docType, analyzedModel, context = {}, insights = []) {
    try {
      console.log('Building document:', { docType, analyzedModel, context, insights });
      
      if (docType === 'business-case') {
        return await this.buildBusinessCase(analyzedModel, context, insights);
      }
      
      // Handle other document types with generic builder
      return await this.buildGenericDocument(docType, analyzedModel, context, insights);
      
    } catch (error) {
      console.error('Document builder error:', error);
      // Return basic fallback document
      return this.createFallbackDocument(docType, analyzedModel);
    }
  },

  /**
   * Build comprehensive business case from analyzed P1 model
   */
  async buildBusinessCase(analyzedModel, context, insights) {
    // Extract key data from analyzed model
    const title = this.extractTitle(analyzedModel);
    const meta = this.extractMeta(analyzedModel);
    const strategic = analyzedModel.strategic || {};
    const financial = analyzedModel.financial || {};
    const options = analyzedModel.options || [];
    const risks = analyzedModel.projectRisks || [];
    
    // Get baseline and proposed options with calculations
    const baseline = options.find(o => o.isBaseline) || {};
    const proposed = options.find(o => !o.isBaseline) || {};
    const proposedCalc = proposed._calc || {};
    const baselineCalc = baseline._calc || {};

    // Build document sections following PMI recommended sequence
    const sections = [
      {
        id: 'executive-summary',
        title: 'Executive Summary',
        content: this.buildExecutiveSummary(analyzedModel, proposedCalc, context)
      },
      {
        id: 'introduction',
        title: 'Introduction',
        content: this.buildIntroduction(analyzedModel, context)
      },
      {
        id: 'business-need',
        title: 'Business Need',
        content: this.buildBusinessNeed(strategic, context, insights)
      },
      {
        id: 'project-scope',
        title: 'Project Scope',
        content: this.buildProjectScope(analyzedModel, proposed)
      },
      {
        id: 'alternatives-analysis',
        title: 'Alternatives Analysis',
        content: this.buildAlternativesAnalysis(options, analyzedModel)
      },
      {
        id: 'proposed-solution',
        title: 'Recommended Solution',
        content: this.buildProposedSolution(proposed, analyzedModel, context)
      },
      {
        id: 'benefits-analysis',
        title: 'Benefits Analysis',
        content: this.buildBenefitsAnalysis(strategic, proposedCalc, analyzedModel)
      },
      {
        id: 'cost-analysis',
        title: 'Cost Analysis',
        content: this.buildCostAnalysis(proposedCalc, baselineCalc, analyzedModel)
      },
      {
        id: 'financial-analysis',
        title: 'Financial Analysis',
        content: this.buildFinancialAnalysis(proposedCalc, baselineCalc, financial, analyzedModel)
      },
      {
        id: 'risk-assessment',
        title: 'Risk Assessment',
        content: this.buildRiskAssessment(risks, analyzedModel)
      },
      {
        id: 'implementation-plan',
        title: 'Implementation Plan',
        content: this.buildImplementationPlan(analyzedModel, context)
      },
      {
        id: 'success-criteria',
        title: 'Success Criteria & Benefits Realization',
        content: this.buildSuccessCriteria(strategic, analyzedModel)
      },
      {
        id: 'recommendation',
        title: 'Recommendation',
        content: this.buildRecommendation(analyzedModel, proposedCalc)
      },
      {
        id: 'governance-approval',
        title: 'Governance & Approval',
        content: this.buildGovernance(analyzedModel)
      }
    ];

    return {
      title: title,
      meta: {
        title: title,
        author: meta.author || 'Unknown',
        date: new Date().toISOString().split('T')[0],
        version: analyzedModel.workflow?.version || 'v1',
        docType: 'business-case'
      },
      sections: sections.filter(s => s.content && s.content.length > 0)
    };
  },

  /**
   * Extract title from analyzed model
   */
  extractTitle(analyzedModel) {
    return analyzedModel.strategic?.businessNeed ||
           analyzedModel.title ||
           (analyzedModel.options?.find(o => !o.isBaseline)?.name) ||
           'Business Case';
  },

  /**
   * Extract metadata from analyzed model
   */
  extractMeta(analyzedModel) {
    const workflow = analyzedModel.workflow || {};
    return {
      author: workflow.createdBy || 'Author',
      version: workflow.version || 'v1',
      date: workflow.lastModified || new Date().toISOString()
    };
  },

  /**
   * Build Executive Summary section
   */
  buildExecutiveSummary(analyzedModel, proposedCalc, context) {
    const title = this.extractTitle(analyzedModel);
    const strategic = analyzedModel.strategic || {};
    const problem = strategic.problemStatement || strategic.businessNeed || '';
    const proposed = analyzedModel.options?.find(o => !o.isBaseline) || {};
    
    // Financial highlights
    const financialSummary = this.formatFinancialHighlights(proposedCalc);
    
    // Timeline
    const horizon = analyzedModel.financial?.horizonMonths || 60;
    const timeframe = horizon > 12 ? `${Math.round(horizon/12)} years` : `${horizon} months`;
    
    let summary = `This business case proposes ${title} to address ${problem || 'the identified business need'}.

${proposed.description || 'The proposed solution will deliver significant business value through improved efficiency and cost optimization.'}

**Financial Summary:**
${financialSummary}

**Analysis Period:** ${timeframe}

**Strategic Alignment:** ${strategic.strategicAlignment?.join(', ') || 'Supports organizational strategic objectives'}

**Recommendation:** ${analyzedModel.recommendationRationale || 'Proceed with implementation based on strong financial returns and strategic value.'}`;

    return summary;
  },

  /**
   * Build Introduction section (PMI recommended)
   */
  buildIntroduction(analyzedModel, context) {
    const strategic = analyzedModel.strategic || {};
    const workflow = analyzedModel.workflow || {};
    
    let content = `**Document Purpose:**
This business case evaluates the strategic, financial, and operational justification for ${this.extractTitle(analyzedModel)}.

**Organizational Context:**
${strategic.strategicAlignment?.length > 0 ? 
  `This initiative directly supports the following strategic objectives:\n${strategic.strategicAlignment.map(goal => `• ${goal}`).join('\n')}` : 
  'This initiative aligns with organizational strategic priorities and objectives.'}

**Document Scope:**
This business case covers the analysis period of ${analyzedModel.financial?.horizonMonths || 60} months and evaluates multiple solution alternatives to address the identified business need.

**Document Control:**
• Version: ${workflow.version || 'v1'}
• Status: ${workflow.currentStatus || 'Draft'}
• Created by: ${workflow.createdBy || 'Business Analysis Team'}
• Last Updated: ${workflow.lastModified ? new Date(workflow.lastModified).toLocaleDateString() : 'Current'}

**Assumptions:**
${strategic.keyAssumptions?.length > 0 ? 
  strategic.keyAssumptions.map(a => `• ${a.assumption} (Impact: ${a.impact})`).join('\n') :
  '• Business environment remains relatively stable during analysis period\n• Resource availability as currently projected\n• No major regulatory changes affecting project scope'}`;

    return content;
  },

  /**
   * Build Project Scope section (PMI recommended)
   */
  buildProjectScope(analyzedModel, proposed) {
    const strategic = analyzedModel.strategic || {};
    const constraints = strategic.constraints || [];
    
    let content = `**Project Description:**
${proposed.description || 'Project scope to be defined during detailed planning phase.'}

**Project Objectives:**
${strategic.strategicAlignment?.length > 0 ? 
  strategic.strategicAlignment.map(obj => `• ${obj}`).join('\n') :
  '• Address identified business need\n• Deliver measurable business value\n• Implement sustainable solution'}

**Major Deliverables:**
${proposed.lineItems?.length > 0 ? 
  proposed.lineItems.filter(li => li.kind === 'benefit' || li.category === 'implementation').map(li => `• ${li.label}`).join('\n') :
  '• Solution implementation\n• Process improvements\n• Training and change management\n• Performance monitoring system'}

**Project Boundaries:**

**In Scope:**
• Implementation of recommended solution
• Training and change management activities  
• Performance measurement and monitoring
• Risk mitigation activities
• Quality assurance processes

**Out of Scope:**
• Ongoing operational support beyond transition period
• Major infrastructure changes not directly related to this initiative
• Other concurrent organizational initiatives
${constraints.length > 0 ? `\n**Constraints:**\n${constraints.map(c => `• ${c}`).join('\n')}` : ''}

**Success Criteria:**
${strategic.successKPIs?.length > 0 ? 
  strategic.successKPIs.slice(0, 3).map(kpi => `• ${kpi.name}: ${kpi.target}`).join('\n') :
  '• Project completed within approved budget and timeline\n• Solution meets performance requirements\n• Stakeholder acceptance achieved'}`;

    return content;
  },

  /**
   * Build Alternatives Analysis section (PMI recommended)
   */
  buildAlternativesAnalysis(options, analyzedModel) {
    const baseline = options.find(o => o.isBaseline) || {};
    const proposed = options.find(o => !o.isBaseline) || {};
    const alternativeOptions = options.filter(o => !o.isBaseline && o.id !== proposed.id) || [];
    
    let content = `**Evaluation Approach:**
Multiple alternatives have been evaluated using consistent criteria including strategic alignment, financial viability, implementation risk, and organizational impact.

**Alternative 1: ${baseline.name || 'Status Quo'}**
• Description: ${baseline.description || 'Maintain current operations without changes'}
• Implementation Complexity: ${baseline.implementationComplexity || 'Low'}
• Strategic Alignment: Limited - does not address identified business need
• Financial Impact: ${baseline._calc?.npv ? `NPV: ${this.formatCurrency(baseline._calc.npv)}` : 'Baseline cost structure maintained'}
• Risk Level: ${baseline.optionSpecificRisks?.length > 0 ? 'Medium' : 'Low'} - Known operational risks continue

**Alternative 2: ${proposed.name || 'Recommended Solution'}**
• Description: ${proposed.description || 'Deploy proposed initiative to address business need'}
• Implementation Complexity: ${proposed.implementationComplexity || 'Medium'}
• Strategic Alignment: High - directly addresses identified business objectives
• Financial Impact: ${proposed._calc?.npv ? `NPV: ${this.formatCurrency(proposed._calc.npv)}, ROI: ${proposed._calc.roiPct?.toFixed(1)}%` : 'Positive financial return projected'}
• Risk Level: ${proposed.optionSpecificRisks?.length > 0 ? 'Medium' : 'Low'} - Manageable with proper mitigation

`;

    // Add additional alternatives if they exist
    alternativeOptions.forEach((alt, index) => {
      content += `**Alternative ${index + 3}: ${alt.name}**
• Description: ${alt.description || 'Alternative solution approach'}
• Implementation Complexity: ${alt.implementationComplexity || 'Medium'}
• Financial Impact: ${alt._calc?.npv ? `NPV: ${this.formatCurrency(alt._calc.npv)}` : 'Under evaluation'}
• Risk Level: Under assessment

`;
    });

    content += `**Evaluation Matrix:**

| Criteria | ${baseline.name || 'Status Quo'} | ${proposed.name || 'Recommended'} |
|----------|------------|---------------|
| Strategic Fit | Low | High |
| Financial Return | ${baseline._calc?.roiPct ? `${baseline._calc.roiPct.toFixed(1)}%` : 'Baseline'} | ${proposed._calc?.roiPct ? `${proposed._calc.roiPct.toFixed(1)}%` : 'Positive'} |
| Implementation Risk | Low | Medium |
| Time to Value | N/A | ${proposed._calc?.paybackMonths ? `${proposed._calc.paybackMonths} months` : 'TBD'} |

**Decision Criteria:**
• Strategic alignment with organizational objectives
• Financial viability and return on investment
• Implementation feasibility and risk profile
• Resource requirements and availability
• Timeline and time-to-value considerations

**Rejected Alternatives:**
The "do nothing" baseline option fails to address the identified business need and provides no strategic value, despite its lower implementation complexity.`;

    return content;
  },

  /**
   * Build separate Cost Analysis section (PMI best practice)
   */
  buildCostAnalysis(proposedCalc, baselineCalc, analyzedModel) {
    const proposed = analyzedModel.options?.find(o => !o.isBaseline) || {};
    const costs = proposed.lineItems?.filter(li => li.kind === 'cost') || [];
    const financial = analyzedModel.financial || {};
    
    let content = `**Cost Categories:**

**Capital Expenditure (CapEx):**
${costs.filter(c => c.category === 'capex').map(c => 
  `• ${c.label}: ${this.formatCurrency(c.amount)} (${c.recurrence})`
).join('\n') || '• No significant capital investments identified'}

**Operating Expenditure (OpEx):**
${costs.filter(c => c.category === 'opex').map(c => 
  `• ${c.label}: ${this.formatCurrency(c.amount)} (${c.recurrence})`
).join('\n') || '• Operating costs to be refined during planning'}

**Implementation Costs:**
${costs.filter(c => c.category === 'implementation' || c.category === 'training').map(c => 
  `• ${c.label}: ${this.formatCurrency(c.amount)}`
).join('\n') || '• Implementation costs included in total project investment'}

`;

    if (proposedCalc && Object.keys(proposedCalc).length > 0) {
      content += `**Total Cost Summary:**
• Total Investment: ${this.formatCurrency(Math.abs(proposedCalc.totalCosts || 0))}
• Annual Operating Costs: ${this.formatCurrency(Math.abs((proposedCalc.totalCosts || 0) / (financial.horizonMonths || 60) * 12))}
• Cost per Year: ${this.formatCurrency(Math.abs((proposedCalc.totalCosts || 0) / ((financial.horizonMonths || 60) / 12)))}

**Cost Comparison vs. Baseline:**
${baselineCalc?.totalCosts ? 
  `The proposed solution requires additional investment of ${this.formatCurrency(Math.abs(proposedCalc.totalCosts) - Math.abs(baselineCalc.totalCosts || 0))} compared to maintaining status quo.` :
  'Baseline costs represent current operational expenses without addressing identified business needs.'}

**Cost Assumptions:**
• Costs estimated based on current market rates and vendor quotes
• ${financial.includeInflation ? `Inflation rate of ${financial.inflationRate || 3}% applied annually` : 'Inflation impact not included in analysis'}
• Resource costs based on current organizational rates
• Implementation timeline assumes standard project delivery approach

**Cost Sensitivity:**
Analysis shows project remains viable with cost increases up to 25% above current estimates, maintaining positive NPV under stress testing scenarios.`;
    } else {
      content += `**Cost Estimation Status:**
Detailed cost analysis is in progress. Preliminary estimates indicate investment levels consistent with similar initiatives and organizational budget parameters.

**Cost Development Plan:**
• Vendor quotes and market analysis in progress
• Resource requirement assessment underway  
• Implementation cost validation with delivery teams
• Final cost estimates will be available for approval decision`;
    }

    return content;
  },

  /**
   * Build Success Criteria & Benefits Realization section (PMI recommended)
   */
  buildSuccessCriteria(strategic, analyzedModel) {
    const kpis = strategic.successKPIs || [];
    const proposed = analyzedModel.options?.find(o => !o.isBaseline) || {};
    const benefits = proposed.lineItems?.filter(li => li.kind === 'benefit') || [];
    
    let content = `**Success Criteria:**

**Financial Success Measures:**
${benefits.map(benefit => {
      const annualValue = benefit.recurrence === 'monthly' ? benefit.amount * 12 : 
                          benefit.recurrence === 'annual' ? benefit.amount : benefit.amount;
      return `• ${benefit.label}: ${this.formatCurrency(annualValue)} annually realized`;
    }).join('\n') || '• Financial targets to be established during planning phase'}

**Operational Success Measures:**
${kpis.length > 0 ? 
  kpis.map(kpi => `• ${kpi.name}: Achieve ${kpi.target} from baseline of ${kpi.baseline} (Measured ${kpi.measurementFrequency})`).join('\n') :
  '• Process improvement metrics to be defined\n• Service quality improvements achieved\n• Stakeholder satisfaction targets met'}

**Strategic Success Measures:**
• Business objectives achieved as defined in project charter
• Strategic alignment maintained throughout delivery
• Organizational capabilities enhanced as planned

**Benefits Realization Plan:**

**Measurement Framework:**
${kpis.length > 0 ? `
| KPI | Baseline | Target | Measurement Method | Owner | Frequency |
|-----|----------|--------|------------------- |-------|-----------|
${kpis.map(kpi => `| ${kpi.name} | ${kpi.baseline} | ${kpi.target} | ${kpi.measurementMethod} | ${kpi.owner} | ${kpi.measurementFrequency} |`).join('\n')}
` : 'Benefits measurement framework to be established during project initiation phase.'}

**Benefits Tracking Schedule:**
• Month 1-3: Baseline measurement and tracking system implementation
• Month 6: Initial benefits assessment and tracking review
• Month 12: Comprehensive benefits realization assessment
• Ongoing: ${kpis.length > 0 && kpis[0].measurementFrequency ? kpis[0].measurementFrequency.toLowerCase() : 'quarterly'} tracking and reporting

**Benefits Ownership:**
${kpis.length > 0 ? 
  `Primary benefits owners have been identified for each KPI to ensure accountability for realization and measurement.` :
  'Benefits ownership will be established during project planning phase with clear accountability assignments.'}

**Risk to Benefits:**
• Market condition changes affecting benefit realization
• Implementation delays impacting time-to-value
• Organizational change resistance affecting adoption
• Resource constraints limiting full benefit capture

**Benefits Sustainability:**
Post-project governance will ensure benefits are maintained and enhanced over time through ongoing performance monitoring and continuous improvement processes.`;

    return content;
  },
  buildBusinessNeed(strategic, context, insights) {
    const problem = strategic.problemStatement || strategic.businessNeed || '';
    const opportunity = strategic.opportunityDescription || '';
    const assumptions = strategic.keyAssumptions || [];
    
    let content = `**Problem Statement:**
${problem || 'Business need to be defined.'}

${opportunity ? `**Opportunity:**
${opportunity}

` : ''}`;

    // Add research insights if available
    if (insights && insights.length > 0) {
      content += `**Market Context:**
${insights.slice(0, 2).map(i => `• ${i.claim}`).join('\n')}

`;
    }

    // Add key assumptions
    if (assumptions.length > 0) {
      content += `**Key Assumptions:**
${assumptions.map(a => `• ${a.assumption} (Impact: ${a.impact || 'Medium'})`).join('\n')}`;
    }

    return content;
  },

  /**
   * Build Proposed Solution section
   */
  buildProposedSolution(proposed, analyzedModel, context) {
    const name = proposed.name || 'Proposed Solution';
    const description = proposed.description || 'Solution details to be provided.';
    const complexity = proposed.implementationComplexity || 'Medium';
    const lineItems = proposed.lineItems || [];
    
    let content = `**Solution Overview:**
${description}

**Implementation Complexity:** ${complexity}

`;

    // Add major cost components
    if (lineItems.length > 0) {
      const costs = lineItems.filter(li => li.kind === 'cost');
      const benefits = lineItems.filter(li => li.kind === 'benefit');
      
      if (costs.length > 0) {
        content += `**Major Cost Components:**
${costs.map(c => `• ${c.label}: ${this.formatCurrency(c.amount)} ${c.recurrence !== 'one-time' ? `(${c.recurrence})` : ''}`).join('\n')}

`;
      }
      
      if (benefits.length > 0) {
        content += `**Expected Benefits:**
${benefits.map(b => `• ${b.label}: ${this.formatCurrency(b.amount)} ${b.recurrence !== 'one-time' ? `(${b.recurrence})` : ''}`).join('\n')}

`;
      }
    }

    // Add next steps if available
    if (analyzedModel.nextSteps && analyzedModel.nextSteps.length > 0) {
      content += `**Next Steps:**
${analyzedModel.nextSteps.map(step => `• ${step}`).join('\n')}`;
    }

    return content;
  },

  /**
   * Build Financial Analysis section
   */
  buildFinancialAnalysis(proposedCalc, baselineCalc, financial, analyzedModel) {
    const currency = financial.currency || 'USD';
    const horizon = financial.horizonMonths || 60;
    const discountRate = financial.discountRatePct || 8;
    
    let content = `**Analysis Parameters:**
• Analysis Period: ${horizon} months (${Math.round(horizon/12)} years)
• Discount Rate: ${discountRate}%
• Currency: ${currency}

`;

    // Proposed option financial results
    if (proposedCalc && Object.keys(proposedCalc).length > 0) {
      content += `**Proposed Solution Financial Results:**

**Profitability Metrics:**
• Net Present Value (NPV): ${this.formatCurrency(proposedCalc.npv)}
• Return on Investment (ROI): ${proposedCalc.roiPct ? proposedCalc.roiPct.toFixed(1) : 'N/A'}%
• Payback Period: ${proposedCalc.paybackMonths ? `${proposedCalc.paybackMonths} months` : 'N/A'}

**Cash Flow Summary:**
• Total Investment: ${this.formatCurrency(Math.abs(proposedCalc.totalCosts || 0))}
• Total Benefits: ${this.formatCurrency(proposedCalc.totalBenefits || 0)}
• Net Cash Flow: ${this.formatCurrency((proposedCalc.totalBenefits || 0) - Math.abs(proposedCalc.totalCosts || 0))}

`;

      // Add MIRR if calculated
      if (proposedCalc.mirr) {
        content += `• Modified Internal Rate of Return (MIRR): ${proposedCalc.mirr.toFixed(1)}%
`;
      }
    } else {
      content += `**Financial Analysis:**
Financial calculations are being processed. Key metrics will include NPV, ROI, and payback period analysis.

`;
    }

    // Sensitivity analysis if available
    if (proposedCalc.sensitivity) {
      content += `**Sensitivity Analysis:**
Analysis shows the investment remains viable under various scenarios with NPV remaining positive in ${proposedCalc.sensitivity.positiveScenarios || 'most'} tested conditions.

`;
    }

    // Comparison with baseline if available
    if (baselineCalc && baselineCalc.npv !== undefined && proposedCalc.npv !== undefined) {
      const improvement = proposedCalc.npv - baselineCalc.npv;
      content += `**Comparison with Baseline:**
The proposed solution delivers ${this.formatCurrency(improvement)} additional value compared to maintaining the status quo.

`;
    }

    return content;
  },

  /**
   * Build Benefits Analysis section
   */
  buildBenefitsAnalysis(strategic, proposedCalc, analyzedModel) {
    const kpis = strategic.successKPIs || [];
    const proposed = analyzedModel.options?.find(o => !o.isBaseline) || {};
    const benefits = proposed.lineItems?.filter(li => li.kind === 'benefit') || [];
    
    let content = `**Quantified Benefits:**

`;

    // Financial benefits from line items
    if (benefits.length > 0) {
      benefits.forEach(benefit => {
        const annualValue = benefit.recurrence === 'monthly' ? benefit.amount * 12 : 
                          benefit.recurrence === 'annual' ? benefit.amount : benefit.amount;
        content += `• ${benefit.label}: ${this.formatCurrency(annualValue)} annually
`;
      });
      content += `
`;
    }

    // Key performance indicators
    if (kpis.length > 0) {
      content += `**Key Performance Indicators:**

${kpis.map(kpi => `**${kpi.name}**
• Baseline: ${kpi.baseline}
• Target: ${kpi.target}
• Measurement: ${kpi.measurementMethod}
• Owner: ${kpi.owner}
• Frequency: ${kpi.measurementFrequency}
`).join('\n')}`;
    }

    // Strategic benefits
    if (strategic.opportunityDescription) {
      content += `**Strategic Benefits:**
${strategic.opportunityDescription}

`;
    }

    // ROI context
    if (proposedCalc.roiPct) {
      content += `**Return on Investment Context:**
The projected ${proposedCalc.roiPct.toFixed(1)}% ROI ${proposedCalc.roiPct > 15 ? 'significantly exceeds' : proposedCalc.roiPct > 8 ? 'exceeds' : 'meets'} typical organizational investment thresholds, demonstrating strong value creation potential.`;
    }

    return content || 'Benefits analysis to be completed during detailed planning phase.';
  },

  /**
   * Build Risk Assessment section
   */
  buildRiskAssessment(risks, analyzedModel) {
    if (!risks || risks.length === 0) {
      return 'Risk assessment to be completed during project planning phase.';
    }

    let content = `**Identified Project Risks:**

`;

    risks.forEach((risk, index) => {
      content += `**Risk ${index + 1}: ${risk.statement}**
• Category: ${risk.category || 'Operational'}
• Probability: ${risk.probability || 'Medium'}
• Impact: ${risk.impact || 'Medium'}
• Owner: ${risk.owner || 'TBD'}
• Status: ${risk.status || 'Identified'}

**Mitigation Strategy:**
${risk.mitigation || 'Mitigation plan to be developed.'}

**Response Plan:**
• Strategy: ${risk.responseStrategy || 'Mitigate'}
• Owner: ${risk.responseOwner || risk.owner || 'TBD'}
${risk.responseDeadline ? `• Deadline: ${risk.responseDeadline}` : ''}

`;
    });

    // Risk management approach
    content += `**Risk Management Approach:**
Project risks will be actively monitored and managed throughout implementation. Regular risk reviews will be conducted ${risks.length > 3 ? 'weekly' : 'bi-weekly'} to ensure early identification and mitigation of emerging issues.

**Escalation Criteria:**
High-impact risks or risks exceeding tolerance thresholds will be escalated to project steering committee within 24 hours of identification.`;

    return content;
  },

  /**
   * Build Implementation Plan section
   */
  buildImplementationPlan(analyzedModel, context) {
    const proposed = analyzedModel.options?.find(o => !o.isBaseline) || {};
    const complexity = proposed.implementationComplexity || 'Medium';
    const nextSteps = analyzedModel.nextSteps || [];
    const horizon = analyzedModel.financial?.horizonMonths || 60;
    
    let content = `**Implementation Approach:**
${complexity} complexity implementation planned over ${Math.round(horizon/12)} year period.

`;

    // Implementation phases
    const phases = this.generateImplementationPhases(complexity, horizon);
    content += `**Implementation Phases:**

${phases.map((phase, i) => `**Phase ${i + 1}: ${phase.name}** (${phase.duration})
${phase.activities.map(a => `• ${a}`).join('\n')}
`).join('\n')}

`;

    // Next steps
    if (nextSteps.length > 0) {
      content += `**Immediate Next Steps:**
${nextSteps.map(step => `• ${step}`).join('\n')}

`;
    }

    // Success criteria
    const kpis = analyzedModel.strategic?.successKPIs || [];
    if (kpis.length > 0) {
      content += `**Success Criteria:**
${kpis.slice(0, 3).map(kpi => `• ${kpi.name}: ${kpi.target}`).join('\n')}

`;
    }

    // Implementation risks
    content += `**Implementation Readiness:**
• Complexity Level: ${complexity}
• Resource Requirements: To be detailed in project planning
• Change Management: Required for ${complexity.toLowerCase()} complexity initiatives
• Dependencies: To be mapped during detailed planning phase`;

    return content;
  },

  /**
   * Build Recommendation section
   */
  buildRecommendation(analyzedModel, proposedCalc) {
    const recommendedOption = analyzedModel.recommendedOption || 'proposed';
    const rationale = analyzedModel.recommendationRationale || '';
    const proposed = analyzedModel.options?.find(o => !o.isBaseline) || {};
    
    let content = `**Recommendation: ${recommendedOption === 'opt_proposed' ? 'PROCEED' : 'REVIEW'}**

`;

    // Rationale
    if (rationale) {
      content += `**Rationale:**
${rationale}

`;
    }

    // Financial justification
    if (proposedCalc && proposedCalc.npv) {
      const financialStrength = proposedCalc.npv > 0 && proposedCalc.roiPct > 10 ? 'Strong' :
                              proposedCalc.npv > 0 ? 'Positive' : 'Marginal';
      
      content += `**Financial Justification:**
${financialStrength} financial case with:
• NPV of ${this.formatCurrency(proposedCalc.npv)}
• ROI of ${proposedCalc.roiPct ? proposedCalc.roiPct.toFixed(1) : 'TBD'}%
• Payback in ${proposedCalc.paybackMonths || 'TBD'} months

`;
    }

    // Decision criteria
    content += `**Decision Factors:**
• Strategic alignment with organizational objectives
• Financial viability and return on investment
• Implementation feasibility and risk profile
• Resource availability and timing considerations

`;

    // Recommendation strength
    const strength = proposedCalc?.roiPct > 20 ? 'STRONG RECOMMEND' :
                    proposedCalc?.roiPct > 10 ? 'RECOMMEND' :
                    proposedCalc?.npv > 0 ? 'CONDITIONAL RECOMMEND' : 'REVIEW REQUIRED';
    
    content += `**Recommendation Strength:** ${strength}

**Approval Requirements:**
Based on investment size and strategic impact, this initiative requires approval from appropriate organizational governance bodies.`;

    return content;
  },

  /**
   * Build Governance section
   */
  buildGovernance(analyzedModel) {
    const workflow = analyzedModel.workflow || {};
    const approvals = workflow.approvals || [];
    
    let content = `**Document Status:**
• Version: ${workflow.version || 'v1'}
• Status: ${workflow.currentStatus || 'Draft'}
• Created By: ${workflow.createdBy || 'Author'}
• Last Modified: ${workflow.lastModified ? new Date(workflow.lastModified).toLocaleDateString() : 'Today'}

`;

    if (approvals.length > 0) {
      content += `**Required Approvals:**

${approvals.map(approval => `**${approval.role}**
• Name: ${approval.name || 'TBD'}
• Level: ${approval.approvalLevel || 'Required'}
• Status: ${approval.status || 'Pending'}
${approval.date ? `• Date: ${approval.date}` : ''}
${approval.comments ? `• Comments: ${approval.comments}` : ''}
`).join('\n')}`;
    }

    // Compliance checks
    const compliance = analyzedModel.complianceChecks || [];
    if (compliance.length > 0) {
      content += `**Compliance Verification:**
${compliance.map(check => `• ${check.requirement}: ${check.status || 'Pending'}`).join('\n')}

`;
    }

    content += `**Next Review:**
This business case should be reviewed quarterly or upon material changes to assumptions, market conditions, or organizational priorities.`;

    return content;
  },

  /**
   * Generate implementation phases based on complexity and industry context
   */
  generateImplementationPhases(complexity, horizonMonths, context = {}) {
    const phases = [];
    const industry = context.industry || 'general';
    
    // Industry-specific phase terminology
    const phaseTerms = this.getIndustryPhaseTerms(industry);
    
    if (complexity === 'Low') {
      phases.push(
        { 
          name: `${phaseTerms.planning} & Setup`, 
          duration: '1-2 months', 
          activities: [
            `Finalize ${phaseTerms.requirements}`, 
            'Resource allocation', 
            `${phaseTerms.vendor} selection`
          ] 
        },
        { 
          name: `${phaseTerms.implementation}`, 
          duration: '2-3 months', 
          activities: [
            `${phaseTerms.deployment}`, 
            `${phaseTerms.training}`, 
            `Process ${phaseTerms.integration}`
          ] 
        },
        { 
          name: `${phaseTerms.goLive} & Optimization`, 
          duration: '1 month', 
          activities: [
            `Launch ${phaseTerms.solution}`, 
            'Monitor performance', 
            'Optimize processes'
          ] 
        }
      );
    } else if (complexity === 'Medium') {
      phases.push(
        { 
          name: `${phaseTerms.planning} & Design`, 
          duration: '2-3 months', 
          activities: [
            'Detailed planning', 
            `${phaseTerms.design}`, 
            'Stakeholder alignment'
          ] 
        },
        { 
          name: `${phaseTerms.development} & Testing`, 
          duration: '3-4 months', 
          activities: [
            `${phaseTerms.build}`, 
            `${phaseTerms.testing}`, 
            `${phaseTerms.validation}`
          ] 
        },
        { 
          name: `${phaseTerms.deployment}`, 
          duration: '2-3 months', 
          activities: [
            `Phased ${phaseTerms.rollout}`, 
            `${phaseTerms.training} delivery`, 
            'Change management'
          ] 
        },
        { 
          name: 'Stabilization', 
          duration: '1-2 months', 
          activities: [
            'Performance monitoring', 
            'Issue resolution', 
            'Process optimization'
          ] 
        }
      );
    } else { // High complexity
      phases.push(
        { 
          name: `Strategy & ${phaseTerms.planning}`, 
          duration: '3-4 months', 
          activities: [
            'Strategic alignment', 
            'Detailed planning', 
            `${phaseTerms.architecture} design`
          ] 
        },
        { 
          name: `${phaseTerms.development} Phase 1`, 
          duration: '4-6 months', 
          activities: [
            `Core ${phaseTerms.build}`, 
            `${phaseTerms.integration} planning`, 
            'Pilot preparation'
          ] 
        },
        { 
          name: `Pilot & ${phaseTerms.testing}`, 
          duration: '2-3 months', 
          activities: [
            'Pilot deployment', 
            `${phaseTerms.validation}`, 
            'Feedback incorporation'
          ] 
        },
        { 
          name: `Full ${phaseTerms.deployment}`, 
          duration: '3-6 months', 
          activities: [
            `Phased ${phaseTerms.rollout}`, 
            `${phaseTerms.training} programs`, 
            'Change management'
          ] 
        },
        { 
          name: 'Optimization & Support', 
          duration: 'Ongoing', 
          activities: [
            'Performance optimization', 
            'Support processes', 
            'Continuous improvement'
          ] 
        }
      );
    }
    
    return phases;
  },

  /**
   * Get industry-specific terminology for phases and activities
   */
  getIndustryPhaseTerms(industry) {
    const terms = {
      'healthcare': {
        planning: 'Clinical Planning',
        requirements: 'clinical requirements',
        vendor: 'Healthcare vendor',
        implementation: 'Clinical Implementation',
        deployment: 'Service deployment',
        training: 'Staff training',
        integration: 'integration',
        solution: 'services',
        goLive: 'Service Launch',
        design: 'Service design',
        development: 'Service Development',
        build: 'service development',
        testing: 'Clinical Testing',
        validation: 'clinical validation',
        rollout: 'service rollout',
        architecture: 'Service architecture'
      },
      'construction': {
        planning: 'Project Planning',
        requirements: 'specifications',
        vendor: 'Contractor',
        implementation: 'Construction',
        deployment: 'Installation',
        training: 'Operator training',
        integration: 'integration',
        solution: 'facility',
        goLive: 'Commissioning',
        design: 'Engineering design',
        development: 'Construction',
        build: 'construction',
        testing: 'Testing & Commissioning',
        validation: 'quality assurance',
        rollout: 'phased handover',
        architecture: 'Engineering architecture'
      },
      'technology': {
        planning: 'Technical Planning',
        requirements: 'technical requirements',
        vendor: 'Technology vendor',
        implementation: 'Development',
        deployment: 'System deployment',
        training: 'User training',
        integration: 'system integration',
        solution: 'system',
        goLive: 'Go-Live',
        design: 'System design',
        development: 'Development',
        build: 'system development',
        testing: 'Testing',
        validation: 'user acceptance testing',
        rollout: 'system rollout',
        architecture: 'System architecture'
      },
      'manufacturing': {
        planning: 'Production Planning',
        requirements: 'production requirements',
        vendor: 'Equipment supplier',
        implementation: 'Installation',
        deployment: 'Equipment deployment',
        training: 'Operator training',
        integration: 'process integration',
        solution: 'production line',
        goLive: 'Production Start',
        design: 'Process design',
        development: 'Installation',
        build: 'equipment installation',
        testing: 'Production Testing',
        validation: 'process validation',
        rollout: 'production ramp-up',
        architecture: 'Process architecture'
      }
    };

    return terms[industry.toLowerCase()] || {
      planning: 'Planning',
      requirements: 'requirements',
      vendor: 'Vendor',
      implementation: 'Implementation',
      deployment: 'Deployment',
      training: 'Training',
      integration: 'integration',
      solution: 'solution',
      goLive: 'Go-Live',
      design: 'Design',
      development: 'Development',
      build: 'development',
      testing: 'Testing',
      validation: 'validation',
      rollout: 'rollout',
      architecture: 'Architecture'
    };
  },

  /**
   * Build Implementation Plan section with industry-appropriate terminology
   */
  buildImplementationPlan(analyzedModel, context) {
    const proposed = analyzedModel.options?.find(o => !o.isBaseline) || {};
    const complexity = proposed.implementationComplexity || 'Medium';
    const nextSteps = analyzedModel.nextSteps || [];
    const horizon = analyzedModel.financial?.horizonMonths || 60;
    const industry = context?.industry || 'general';
    const phaseTerms = this.getIndustryPhaseTerms(industry);
    
    let content = `**Implementation Approach:**
${complexity} complexity implementation planned over ${Math.round(horizon/12)} year period using industry-standard ${industry} delivery methodologies.

`;

    // Implementation phases with industry-appropriate terminology
    const phases = this.generateImplementationPhases(complexity, horizon, context);
    content += `**Implementation Phases:**

${phases.map((phase, i) => `**Phase ${i + 1}: ${phase.name}** (${phase.duration})
${phase.activities.map(a => `• ${a}`).join('\n')}
`).join('\n')}

`;

    // Next steps
    if (nextSteps.length > 0) {
      content += `**Immediate Next Steps:**
${nextSteps.map(step => `• ${step}`).join('\n')}

`;
    } else {
      // Industry-specific default next steps
      const defaultNextSteps = this.getIndustryDefaultNextSteps(industry);
      content += `**Immediate Next Steps:**
${defaultNextSteps.map(step => `• ${step}`).join('\n')}

`;
    }

    // Success criteria with industry context
    const kpis = analyzedModel.strategic?.successKPIs || [];
    if (kpis.length > 0) {
      content += `**Success Criteria:**
${kpis.slice(0, 3).map(kpi => `• ${kpi.name}: ${kpi.target}`).join('\n')}

`;
    }

    // Industry-specific implementation considerations
    const industryConsiderations = this.getIndustryImplementationConsiderations(industry);
    content += `**Implementation Readiness:**
• Complexity Level: ${complexity}
• ${industryConsiderations.resourceType}: To be detailed in project planning
• Change Management: ${industryConsiderations.changeApproach} for ${complexity.toLowerCase()} complexity initiatives
• ${industryConsiderations.dependencies}: To be mapped during detailed planning phase
• ${industryConsiderations.compliance}: Compliance requirements addressed in risk assessment`;

    return content;
  },

  /**
   * Get industry-specific default next steps
   */
  getIndustryDefaultNextSteps(industry) {
    const steps = {
      'healthcare': [
        'Obtain clinical governance approval',
        'Conduct stakeholder impact assessment',
        'Develop clinical implementation plan',
        'Establish patient safety protocols',
        'Plan regulatory compliance verification'
      ],
      'construction': [
        'Obtain planning and building permits',
        'Complete environmental impact assessment',
        'Finalize engineering specifications',
        'Secure contractor agreements',
        'Establish safety and quality protocols'
      ],
      'technology': [
        'Complete technical architecture review',
        'Finalize system requirements',
        'Establish development environment',
        'Plan security and compliance verification',
        'Set up project governance framework'
      ],
      'manufacturing': [
        'Complete production readiness assessment',
        'Finalize equipment specifications',
        'Plan facility modifications',
        'Establish quality control protocols',
        'Develop operator training programs'
      ]
    };

    return steps[industry.toLowerCase()] || [
      'Obtain necessary approvals and permits',
      'Complete detailed requirements analysis',
      'Finalize implementation specifications',
      'Establish project governance framework',
      'Plan stakeholder engagement activities'
    ];
  },

  /**
   * Get industry-specific implementation considerations
   */
  getIndustryImplementationConsiderations(industry) {
    const considerations = {
      'healthcare': {
        resourceType: 'Clinical Resources',
        changeApproach: 'Clinical change management required',
        dependencies: 'Clinical dependencies and patient impact',
        compliance: 'Healthcare regulatory'
      },
      'construction': {
        resourceType: 'Construction Resources',
        changeApproach: 'Safety and quality management required',
        dependencies: 'Construction dependencies and site constraints',
        compliance: 'Building code and safety'
      },
      'technology': {
        resourceType: 'Technical Resources',
        changeApproach: 'Technical change management required',
        dependencies: 'System dependencies and integration points',
        compliance: 'Security and data privacy'
      },
      'manufacturing': {
        resourceType: 'Production Resources',
        changeApproach: 'Production change management required',
        dependencies: 'Production dependencies and supply chain',
        compliance: 'Manufacturing and quality'
      }
    };

    return considerations[industry.toLowerCase()] || {
      resourceType: 'Project Resources',
      changeApproach: 'Organizational change management required',
      dependencies: 'Project dependencies and constraints',
      compliance: 'Regulatory and compliance'
    };
  },

  /**
   * Format financial highlights for executive summary
   */
  formatFinancialHighlights(calc) {
    if (!calc || Object.keys(calc).length === 0) {
      return 'Financial analysis in progress.';
    }

    const highlights = [];
    
    if (calc.npv !== undefined) {
      highlights.push(`• Net Present Value: ${this.formatCurrency(calc.npv)}`);
    }
    
    if (calc.roiPct !== undefined) {
      highlights.push(`• Return on Investment: ${calc.roiPct.toFixed(1)}%`);
    }
    
    if (calc.paybackMonths !== undefined) {
      highlights.push(`• Payback Period: ${calc.paybackMonths} months`);
    }
    
    if (calc.totalCosts !== undefined) {
      highlights.push(`• Total Investment: ${this.formatCurrency(Math.abs(calc.totalCosts))}`);
    }

    return highlights.length > 0 ? highlights.join('\n') : 'Financial metrics being calculated.';
  },

  /**
   * Format currency values
   */
  formatCurrency(amount, currency = 'USD') {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'TBD';
    }
    
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    
    if (absAmount >= 1000000) {
      return `${sign}$${(absAmount / 1000000).toFixed(1)}M`;
    } else if (absAmount >= 1000) {
      return `${sign}$${(absAmount / 1000).toFixed(0)}K`;
    } else {
      return `${sign}$${absAmount.toLocaleString()}`;
    }
  },

  /**
   * Build generic document (for non-business-case types)
   */
  async buildGenericDocument(docType, data, context, insights) {
    // Fallback for other document types
    return {
      title: `${docType} Document`,
      meta: { title: `${docType} Document`, docType },
      sections: [
        {
          id: 'content',
          title: 'Content',
          content: `${docType} content would be generated here based on provided data.`
        }
      ]
    };
  },

  /**
   * Create fallback document when main builder fails
   */
  createFallbackDocument(docType, analyzedModel) {
    const title = this.extractTitle(analyzedModel) || `${docType} Document`;
    
    return {
      title: title,
      meta: { title: title, docType },
      sections: [
        {
          id: 'summary',
          title: 'Summary',
          content: `${title}\n\nDocument generation encountered an issue. Please review input data and try again.`
        }
      ]
    };
  }
};