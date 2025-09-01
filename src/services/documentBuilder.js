// src/services/documentBuilder.js
// Research-only builder: strict facts → structured sections → export-ready doc.

import { runResearch } from "./researchClient";
import { citationManager } from "./citationManager";

/** =========================
 *  Document templates
 *  ========================= */
const DOCUMENT_TEMPLATES = {
  "business-case": {
    title: "Business Case",
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        required: true,
        research: "business case executive summary components",
        prompts: {
          user:
            "Create an executive summary that includes business need, proposed solution, benefits, costs, and recommendation.",
        },
      },
      {
        id: "business-need",
        title: "Business Need",
        required: true,
        research: "business need justification PMI standards",
        prompts: {
          user:
            "Explain the business problem, opportunity, and why action is needed now.",
        },
      },
      {
        id: "situation-assessment",
        title: "Situation Assessment",
        required: true,
        research: "situation analysis business case PMI",
        prompts: {
          user:
            "Analyze current state, market conditions, and organizational context.",
        },
      },
      {
        id: "recommendation",
        title: "Recommendation",
        required: true,
        research: "business case recommendations PMI format",
        prompts: {
          user:
            "Provide clear recommendation with rationale and next steps.",
        },
      },
    ],
  },

  "project-charter": {
    title: "Project Charter",
    sections: [
      {
        id: "project-purpose",
        title: "Project Purpose",
        required: true,
        research: "project purpose statement PMI standards",
        prompts: {
          user:
            "Define clear project purpose linking to business objectives.",
        },
      },
      {
        id: "project-objectives",
        title: "Project Objectives",
        required: true,
        research: "SMART project objectives PMI standards",
        prompts: {
          user: "Define specific, measurable, achievable project objectives.",
        },
      },
      {
        id: "high-level-scope",
        title: "High-Level Scope",
        required: true,
        research: "project scope statement PMI charter",
        prompts: {
          user: "Define what is included and excluded from project scope.",
        },
      },
      {
        id: "stakeholder-list",
        title: "Key Stakeholders",
        required: true,
        research: "project stakeholder identification PMI",
        prompts: {
          user: "List primary stakeholders and their roles/interests.",
        },
      },
    ],
  },

  "risk-plan": {
    title: "Risk Management Plan",
    sections: [
      {
        id: "risk-methodology",
        title: "Risk Management Methodology",
        required: true,
        research: "risk management methodology PMI standards",
        prompts: {
          user:
            "Establish approach, tools, and techniques for risk management.",
        },
      },
      {
        id: "risk-categories",
        title: "Risk Categories",
        required: true,
        research: "project risk categories PMI RBS",
        prompts: {
          user:
            "Establish risk categories relevant to project type and industry.",
        },
      },
      {
        id: "risk-probability-impact",
        title: "Probability and Impact Matrix",
        required: true,
        research: "risk probability impact matrix PMI",
        prompts: {
          user:
            "Define probability and impact scales for risk assessment.",
        },
      },
    ],
  },
};

/** =========================
 *  Builder
 *  ========================= */
export class DocumentBuilder {
  constructor() {
    this.templates = DOCUMENT_TEMPLATES;
  }

  async buildDocument(docType, userInputs = {}, context = {}) {
    const template = this.getTemplate(docType);
    if (!template) throw new Error(`Unknown document type: ${docType}`);

    const sections = {};
    for (const sectionTemplate of template.sections) {
      sections[sectionTemplate.id] = await this.buildSection(
        sectionTemplate,
        userInputs[sectionTemplate.id] || {},
        context
      );
    }
    return this.assembleDocument(template, sections, context);
  }

  async buildSection(sectionTemplate, userInput, context) {
    try {
      const research = await this.fetchSectionResearch(
        sectionTemplate.research,
        context
      );

      // Register citations globally for export
      (research.facts || []).forEach((f) => citationManager.addFact(f));

      // Compose deterministic content from research + user input
      const content = this.composeContent(sectionTemplate, research, userInput, context);

      return {
        id: sectionTemplate.id,
        title: sectionTemplate.title,
        content,
        research: {
          summary: research.summary,
          factCount: research.facts?.length || 0,
          sources: (research.facts || []).map((f) =>
            typeof f.source === "string" ? f.source : f?.source?.domain
          ),
        },
        citations: research.facts || [],
        notes: research.notes || [],
        userInput,
      };
    } catch (error) {
      console.warn(`Section research failed for ${sectionTemplate.title}:`, error);
      return this.buildFallbackSection(sectionTemplate, userInput, error);
    }
  }

  async fetchSectionResearch(researchTopic, context) {
    return await runResearch({
      topic: researchTopic,
      industry: context?.industry,
      region: context?.region,
    });
  }

  composeContent(sectionTemplate, research, userInput, context) {
    const lines = [];

    // Section intro — lightly guided by the section’s intent
    if (sectionTemplate.prompts?.user) lines.push(sectionTemplate.prompts.user, "");

    // Grounding summary
    if (research.summary) {
      lines.push(research.summary, "");
    }

    // Key facts → concise bullets
    if (Array.isArray(research.facts) && research.facts.length) {
      lines.push("Key considerations:");
      for (const f of research.facts) lines.push(`• ${f.claim}`);
      lines.push("");
    }

    // User-provided specifics (if any)
    if (userInput && Object.keys(userInput).length) {
      lines.push("Project-specific details:");
      for (const [k, v] of Object.entries(userInput)) lines.push(`• ${k}: ${v}`);
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  buildFallbackSection(sectionTemplate, userInput, error) {
    return {
      id: sectionTemplate.id,
      title: sectionTemplate.title,
      content: this.getTemplateContent(sectionTemplate, userInput),
      research: { summary: "Research unavailable", factCount: 0, sources: [] },
      citations: [],
      notes: [`Research failed: ${error?.message || String(error)}`],
      userInput,
      fallback: true,
    };
  }

  getTemplateContent(sectionTemplate) {
    const templates = {
      "executive-summary":
        "This executive summary outlines the business need, proposed solution, expected benefits, costs, and recommendation.",
      "business-need":
        "Describe the business problem/opportunity that justifies the project and why action is needed now.",
      "project-purpose":
        "Define the purpose and justification for the project and the link to organizational objectives.",
      "risk-methodology":
        "Describe the risk management methodology, tools, roles, and reporting cadence.",
    };
    return templates[sectionTemplate.id] || `[${sectionTemplate.title} content to be developed]`;
  }

  assembleDocument(template, sectionsById, context) {
    const orderedSections = template.sections.map((s) => sectionsById[s.id]).filter(Boolean);

    const document = {
      id: Date.now().toString(),
      type: template.title,
      title: template.title,
      createdAt: new Date().toISOString(),
      context,
      sections: orderedSections,
      metadata: {
        totalSections: orderedSections.length,
        researchedSections: orderedSections.filter((s) => !s.fallback).length,
        totalCitations: orderedSections.reduce((sum, s) => sum + (s.citations?.length || 0), 0),
        totalWords: this.estimateWordCount(orderedSections),
        pmiCompliant: this.assessPMICompliance(orderedSections),
        completionStatus: this.calculateCompletionStatus(template, orderedSections),
      },
      exportText: () => this.exportAsText(ref()),
      exportHTML: () => this.exportAsHTML(ref()),
      exportJSON: () => JSON.stringify(ref(), null, 2),
    };

    const ref = () => document;
    return document;
  }

  getTemplate(docType) {
    return this.templates[docType] || null;
  }
  getAvailableTypes() {
    return Object.keys(this.templates).map((key) => ({
      id: key,
      title: this.templates[key].title,
      sections: this.templates[key].sections.length,
    }));
  }

  estimateWordCount(sections) {
    return sections.reduce((total, s) => total + (s.content?.split(/\s+/).length || 0), 0);
  }
  assessPMICompliance(sections) {
    const totalCitations = sections.reduce((sum, s) => sum + (s.citations?.length || 0), 0);
    const pmiCitations = sections.reduce(
      (sum, s) =>
        sum +
        (s.citations || []).filter(
          (c) =>
            (typeof c.source === "string" && c.source.toLowerCase().includes("pmi")) ||
            c.url?.includes("pmi.org")
        ).length,
      0
    );
    return totalCitations > 0 ? pmiCitations / totalCitations >= 0.5 : false;
  }
  calculateCompletionStatus(template, sections) {
    const required = template.sections.filter((s) => s.required).length;
    const completed = sections.filter((s) => s.content && s.content.length > 50 && !s.fallback).length;
    return { required, completed, percentage: required ? Math.round((completed / required) * 100) : 0 };
  }

  exportAsText(document) {
    const lines = [
      document.title.toUpperCase(),
      "=".repeat(document.title.length),
      "",
      `Generated: ${new Date(document.createdAt).toLocaleDateString()}`,
      document.context?.industry ? `Industry: ${document.context.industry}` : null,
      document.context?.region ? `Region: ${document.context.region}` : null,
      "",
      ...document.sections.flatMap((s) => [s.title.toUpperCase(), "-".repeat(s.title.length), "", s.content, ""]),
      "CITATIONS",
      "---------",
      ...citationManager.formatAllAPA(),
    ].filter(Boolean);
    return lines.join("\n");
  }

  exportAsHTML(document) {
    return `
<html>
  <head><title>${document.title}</title></head>
  <body>
    <h1>${document.title}</h1>
    <p><small>Generated: ${new Date(document.createdAt).toLocaleDateString()}</small></p>
    ${document.sections
      .map((s) => `<h2>${s.title}</h2><div>${(s.content || "").replace(/\n/g, "<br>")}</div>`)
      .join("")}
    <h2>References</h2>
    <ol>${citationManager.formatAllAPA().map((c) => `<li>${c}</li>`).join("")}</ol>
  </body>
</html>
    `.trim();
  }
}

export const documentBuilder = new DocumentBuilder();
