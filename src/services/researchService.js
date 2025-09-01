// src/services/researchService.js
const API = import.meta.env.VITE_API_BASE || "";

export class ResearchError extends Error {}

export class ResearchService {
  async fetchTopicResearch(topic, context = {}) {
    // Enhanced payload with business case context
    const payload = {
      topic,
      industry: context.industry || "",
      region: context.region || "",
      
      // NEW: Specify document type to get relevant research
      documentType: "business-case",
      
      // NEW: Business case specific context
      researchFocus: "financial-justification",
      
      // NEW: Exclude generic PM content
      excludeTerms: [
        "pmbok", "pmp certification", "project manager", 
        "scrum master", "agile methodology", "waterfall",
        "work breakdown structure", "gantt chart",
        "project lifecycle", "project phases"
      ],
      
      // NEW: Prioritize business case content
      priorityTerms: [
        "business case", "roi analysis", "cost benefit", 
        "financial justification", "investment analysis",
        "payback period", "npv", "net present value",
        "cost savings", "revenue impact"
      ],
      
      // NEW: Specific query intent
      queryIntent: "business-case-examples"
    };

    const res = await fetch(`${API}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ResearchError(`Research failed (HTTP ${res.status}) ${text}`);
    }

    const result = await res.json(); // { summary, facts[], notes[], _diagnostics? }
    
    // NEW: Client-side filtering as backup
    return this.filterBusinessCaseContent(result);
  }

  // NEW: Enhanced research method specifically for business cases
  async fetchBusinessCaseResearch(inputs, context = {}) {
    const { capex, opex_annual, problem, goals } = inputs;
    const { industry, region, topic } = context;
    
    // Generate business case specific queries
    const queries = this.generateBusinessCaseQueries(inputs, context);
    
    const payload = {
      topic: `business case analysis: ${topic}`,
      industry: industry || "",
      region: region || "",
      documentType: "business-case",
      
      // Multiple focused queries instead of generic topic
      specificQueries: queries,
      
      // Context about the project
      projectContext: {
        hasCapex: capex > 0,
        hasOpex: opex_annual > 0,
        projectSize: this.categorizeProjectSize(capex),
        problemDomain: this.extractProblemDomain(problem)
      },
      
      researchFocus: "financial-justification",
      excludeTerms: [
        "pmbok", "pmp", "project manager", "scrum", "agile methodology",
        "work breakdown", "gantt", "project lifecycle", "waterfall"
      ],
      priorityTerms: [
        "business case", "roi", "cost benefit", "financial benefit",
        "investment analysis", "payback", "npv", "cost savings"
      ]
    };

    const res = await fetch(`${API}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ResearchError(`Business case research failed (HTTP ${res.status}) ${text}`);
    }

    const result = await res.json();
    return this.filterBusinessCaseContent(result);
  }

  // Generate business case specific search queries
  generateBusinessCaseQueries(inputs, context) {
    const { capex, opex_annual, problem } = inputs;
    const { industry, region, topic } = context;
    
    const queries = [];
    
    // Industry + business case examples
    if (industry) {
      queries.push(`${industry} business case ROI examples`);
      queries.push(`${industry} cost benefit analysis case studies`);
      queries.push(`${industry} investment justification metrics`);
    }
    
    // Project size specific
    const projectSize = this.categorizeProjectSize(capex);
    if (projectSize === "large") {
      queries.push("enterprise business case approval criteria");
      queries.push("large scale investment decision framework");
    } else if (projectSize === "medium") {
      queries.push("mid-size business case templates");
      queries.push("departmental investment justification");
    }
    
    // Problem specific
    if (problem) {
      const keywords = this.extractKeywords(problem);
      if (keywords) {
        queries.push(`business case ${keywords} financial benefits`);
        queries.push(`cost savings ${keywords} analysis`);
      }
    }
    
    // Financial focus
    queries.push(`${topic || 'technology'} business case NPV calculation`);
    queries.push(`${industry || 'business'} payback period benchmarks`);
    queries.push("business case risk assessment financial impact");
    
    return queries.slice(0, 6); // Limit to focused queries
  }

  // Categorize project by financial size
  categorizeProjectSize(capex) {
    const amount = Number(capex) || 0;
    if (amount > 1000000) return "large";
    if (amount > 100000) return "medium";
    return "small";
  }

  // Extract problem domain keywords
  extractProblemDomain(problem) {
    if (!problem) return "";
    
    const domains = {
      "efficiency": /efficiency|productive|automat|streamlin|optimize/i,
      "compliance": /complian|regulat|audit|legal|risk/i,
      "growth": /growth|expand|scale|market|customer/i,
      "cost": /cost|expense|saving|budget|financial/i,
      "technology": /technolog|system|software|digital|IT/i,
      "quality": /quality|defect|error|improve|enhance/i
    };
    
    for (const [domain, regex] of Object.entries(domains)) {
      if (regex.test(problem)) return domain;
    }
    
    return "general";
  }

  // Extract meaningful keywords
  extractKeywords(text) {
    if (!text) return "";
    
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 
      'for', 'of', 'with', 'by', 'we', 'our', 'this', 'that', 'is', 'are'
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 3)
      .join(' ');
  }

  // Client-side filtering to remove PMI content
  filterBusinessCaseContent(result) {
    if (!result.facts || !Array.isArray(result.facts)) return result;
    
    const pmiTerms = /pmbok|pmp certification|project manager|scrum master|agile methodology|waterfall methodology|work breakdown structure|gantt chart|project lifecycle|project charter template|risk register|milestone tracking/i;
    
    const businessCaseTerms = /business case|roi|return on investment|cost benefit|financial justification|payback period|npv|net present value|investment analysis|cost savings|revenue impact|financial benefit/i;
    
    const filteredFacts = result.facts.filter(fact => {
      const content = String(fact.claim || "").toLowerCase();
      
      // Exclude PMI/generic PM content
      if (pmiTerms.test(content)) return false;
      
      // Prioritize business case content
      if (businessCaseTerms.test(content)) return true;
      
      // Include industry/financial content that's not PMI
      return !content.includes("project management") && 
             !content.includes("project manager") &&
             !content.includes("methodology");
    });
    
    return {
      ...result,
      facts: filteredFacts,
      _filtered: result.facts.length - filteredFacts.length // Track how many removed
    };
  }
}

// Optional: small helper so other code can import a singleton
export const researchService = new ResearchService();