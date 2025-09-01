// src/services/exportService.js
// Rich exporter with PDF, DOCX, HTML, TXT, JSON + citation preflight.
// Normalized for builder-shaped docs (meta.title, sections[], optional built.citations)

import { citationManager } from "./citationManager";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

/** -------------------- Helpers: normalizers & adapters -------------------- **/

// Support both { meta.title } and { title }
function getDocTitle(doc) {
  return doc?.meta?.title || doc?.title || "Untitled Document";
}

function getDocSections(doc) {
  return Array.isArray(doc?.sections) ? doc.sections : [];
}

function getDocType(doc) {
  return doc?.type || "document";
}

// Prefer builder-attached citations, then citationManager; de-dup by sectionId|url|claim
function getDocCitations(doc, citationMgr) {
  const fromDoc = Array.isArray(doc?.citations) ? doc.citations : [];
  const fromMgr =
    citationMgr && typeof citationMgr.list === "function" ? citationMgr.list() : [];
  const key = (c) => `${c.sectionId || ""}|${c.url || ""}|${c.claim || ""}`;
  const map = new Map();
  [...fromDoc, ...fromMgr].forEach((c) => map.set(key(c), c));
  return [...map.values()];
}

function groupCitationsBySection(citations) {
  const map = new Map(); // sectionId -> array
  citations.forEach((c) => {
    const k = c.sectionId || "__unknown__";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(c);
  });
  return map;
}

function safeSlug(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 120);
}

// Citation formatting adapter: uses citationManager.formatAllAPA() if available for APA7
function formatCitations(styleId, citations, styles, citationMgr) {
  if (styleId === "APA7" && typeof citationMgr?.formatAllAPA === "function") {
    return citationMgr.formatAllAPA();
  }
  const fmt = styles[styleId]?.format;
  if (typeof fmt !== "function") return [];
  return citations.map((c) => fmt(c));
}

/** -------------------- Citation styles (APA7 default) -------------------- **/
const CITATION_STYLES = {
  APA7: {
    name: "APA 7th Edition",
    format: (c) => {
      const author = typeof c.source === "string" ? c.source : c?.source?.domain || "Unknown";
      const year = c.published ? new Date(c.published).getFullYear() : "n.d.";
      const title = c.claim || "Untitled";
      const url = c.url || "";
      return `${author} (${year}). ${title}. ${url}`;
    },
  },
  PMI: {
    name: "PMI Standard",
    format: (c) => {
      const source = typeof c.source === "string" ? c.source : c?.source?.domain || "Unknown Source";
      const published = c.published || "n.d.";
      const claim = c.claim || "Information";
      const url = c.url || "";
      return `${source}. (${published}). ${claim}. ${url}`;
    },
  },
  IEEE: {
    name: "IEEE Style",
    format: (c) => {
      const author = typeof c.source === "string" ? c.source : c?.source?.domain || "Unknown";
      const title = c.claim || "Untitled";
      const url = c.url || "";
      const date = c.published ? new Date(c.published).getFullYear() : "n.d.";
      return `${author}, "${title}," ${date}. [Online]. Available: ${url}`;
    },
  },
};

/** -------------------- Export formats -------------------- **/
const EXPORT_FORMATS = {
  pdf: { name: "PDF Document", mimeType: "application/pdf", extension: "pdf" },
  docx: {
    name: "Microsoft Word",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  html: { name: "HTML Document", mimeType: "text/html", extension: "html" },
  txt: { name: "Plain Text", mimeType: "text/plain", extension: "txt" },
  json: { name: "JSON Data", mimeType: "application/json", extension: "json" },
};

export class ExportService {
  constructor() {
    this.styles = CITATION_STYLES;
    this.formats = EXPORT_FORMATS;
  }

  /** Verify citations before export (best-effort, graceful if verifyAll missing) */
  async preflightCitations() {
    try {
      if (typeof citationManager?.verifyAll !== "function") {
        const total = citationManager?.list ? citationManager.list().length : 0;
        return { total, verified: total, stale: 0, staleCitations: [], allValid: true };
      }
      const results = await citationManager.verifyAll();
      const stale = results.filter((r) => !r.verified);
      return {
        total: results.length,
        verified: results.length - stale.length,
        stale: stale.length,
        staleCitations: stale,
        allValid: stale.length === 0,
      };
    } catch (error) {
      console.error("Citation verification failed:", error);
      return {
        total: 0,
        verified: 0,
        stale: 0,
        staleCitations: [],
        allValid: false,
        error: error.message,
      };
    }
  }

  /** Main export entry */
  async exportDocument(document, options = {}) {
    const {
      format = "pdf",
      citationStyle = "APA7",
      includeMetadata = true,
      includeDiagnostics = false,
      filename = null,
      verifyCitations = true,
    } = options;

    if (!this.formats[format]) {
      throw new Error(
        `Unsupported export format: ${format}. Supported: ${Object.keys(this.formats).join(", ")}`
      );
    }
    if (!this.styles[citationStyle]) {
      throw new Error(
        `Unsupported citation style: ${citationStyle}. Supported: ${Object.keys(this.styles).join(
          ", "
        )}`
      );
    }

    const citationStatus = verifyCitations ? await this.preflightCitations() : null;

    const payload = this.prepareExportPayload(
      document,
      { format, citationStyle, includeMetadata, includeDiagnostics },
      citationStatus
    );

    const exportResult = await this.generateExport(payload, format, filename);

    // Compute normalized counts for metadata
    const normalizedSections = getDocSections(document);
    const normalizedCitations = getDocCitations(document, citationManager);

    return {
      success: true,
      format,
      citationStyle,
      citationStatus,
      warnings: this.generateWarnings(citationStatus),
      filename: exportResult.filename,
      blob: exportResult.blob,
      url: exportResult.url,
      metadata: {
        exportedAt: new Date().toISOString(),
        documentType: getDocType(document),
        sectionCount: normalizedSections.length,
        citationCount: normalizedCitations.length,
        wordCount: document?.metadata?.totalWords || 0,
      },
    };
  }

  /** Build a normalized payload for all generators */
  prepareExportPayload(
    document,
    { format, citationStyle, includeMetadata, includeDiagnostics },
    citationStatus
  ) {
    const sections = getDocSections(document);
    const title = getDocTitle(document);
    const rawCitations = getDocCitations(document, citationManager);
    const bySection = groupCitationsBySection(rawCitations);
    const formatted = formatCitations(citationStyle, rawCitations, this.styles, citationManager);

    const payload = {
      title,
      type: getDocType(document),
      createdAt: document.createdAt,
      sections,
      citations: formatted,
      citationStyle,
      citationCount: rawCitations.length,
      exportedAt: new Date().toISOString(),
      exportFormat: this.formats[format].name,
      generator: "FlowGestio Document Builder",
      // keep grouped map around if needed elsewhere
      _bySection: bySection,
    };

    if (includeMetadata) {
      payload.metadata = {
        ...document?.metadata,
        context: document?.context,
        researchMetadata: {
          totalSources: rawCitations.length,
          verifiedSources: citationStatus?.verified || 0,
          pmiCompliantSources: this.countPMISources(rawCitations),
          industryRelevant: !!document?.context?.industry,
          regionSpecific: !!document?.context?.region,
        },
        qualityMetrics: {
          completionPercentage: document?.metadata?.completionStatus?.percentage || 0,
          pmiCompliance: document?.metadata?.pmiCompliant || false,
          researchCoverage: this.calculateResearchCoverage(sections, bySection),
          citationDensity: this.calculateCitationDensity(document),
        },
      };
    }

    if (includeDiagnostics) {
      payload.diagnostics = {
        citationVerification: citationStatus,
        sectionAnalysis: this.analyzeSections(sections, bySection),
        exportTimestamp: Date.now(),
        browserInfo: this.getBrowserInfo(),
      };
    }

    return payload;
  }

  /** Dispatch to specific generator */
  async generateExport(payload, format, customFilename = null) {
    const timestamp = new Date().toISOString().split("T")[0];
    const safeTitle = safeSlug(payload.title);
    const baseFilename = customFilename || `${safeTitle || safeSlug(payload.type)}_${timestamp}`;
    const filename = `${baseFilename}.${this.formats[format].extension}`;

    let blob;
    switch (format) {
      case "pdf":
        blob = await this.generatePDF(payload);
        break;
      case "docx":
        blob = await this.generateDOCX(payload);
        break;
      case "html":
        blob = this.generateHTML(payload);
        break;
      case "txt":
        blob = this.generateText(payload);
        break;
      case "json":
        blob = this.generateJSON(payload);
        break;
      default:
        throw new Error(`Export format ${format} not implemented`);
    }

    const url = URL.createObjectURL(blob);
    return { blob, url, filename };
  }

  /** -------------------- Generators -------------------- **/
  async generatePDF(payload) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.width - margin * 2;
    let y = margin;

    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text(payload.title, margin, y);
    y += 15;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Generated: ${new Date(payload.exportedAt).toLocaleDateString()}`, margin, y);
    y += 10;

    for (const section of payload.sections) {
      if (y > 250) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(section.title, margin, y);
      y += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(section.content || "", pageWidth);
      for (const line of lines) {
        if (y > 280) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 6;
      }
      y += 5;
    }

    if (payload.citations.length) {
      doc.addPage();
      y = margin;
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("References", margin, y);
      y += 15;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      payload.citations.forEach((c, i) => {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        const txt = `${i + 1}. ${c}`;
        const lines = doc.splitTextToSize(txt, pageWidth);
        lines.forEach((ln) => {
          doc.text(ln, margin, y);
          y += 5;
        });
        y += 3;
      });
    }

    // jsPDF output("blob") already returns a Blob in recent versions; normalize anyway:
    const blob = doc.output("blob");
    return blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" });
  }

  async generateDOCX(payload) {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: payload.title, bold: true, size: 32 })],
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated: ${new Date(payload.exportedAt).toLocaleDateString()}`,
                  size: 20,
                }),
              ],
            }),
            ...payload.sections.flatMap((s) => [
              new Paragraph({
                children: [new TextRun({ text: s.title, bold: true, size: 28 })],
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                children: [new TextRun({ text: s.content || "", size: 24 })],
                spacing: { after: 200 },
              }),
            ]),
            ...(payload.citations.length
              ? [
                  new Paragraph({
                    children: [new TextRun({ text: "References", bold: true, size: 28 })],
                    heading: HeadingLevel.HEADING_1,
                  }),
                  ...payload.citations.map(
                    (c, i) =>
                      new Paragraph({
                        children: [new TextRun({ text: `${i + 1}. ${c}`, size: 22 })],
                        spacing: { after: 100 },
                      })
                  ),
                ]
              : []),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }

  generateHTML(payload) {
    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${payload.title}</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 820px; margin: 0 auto; padding: 24px; }
  h1 { border-bottom: 2px solid #333; }
  h2 { border-bottom: 1px solid #ddd; margin-top: 24px; }
  .meta { background:#f6f7fb; padding:12px; border-radius:8px; margin:12px 0 24px; }
  ol { padding-left: 20px; }
</style>
</head>
<body>
  <h1>${payload.title}</h1>
  <div class="meta">
    <div><strong>Generated:</strong> ${new Date(payload.exportedAt).toLocaleDateString()}</div>
    <div><strong>Citation Style:</strong> ${payload.citationStyle}</div>
    <div><strong>Citations:</strong> ${payload.citationCount}</div>
  </div>
  ${payload.sections
    .map(
      (s) => `
    <h2>${s.title}</h2>
    <p>${(s.content || "").replace(/\n/g, "<br>")}</p>
  `
    )
    .join("")}
  ${
    payload.citations.length
      ? `
  <h2>References</h2>
  <ol>
    ${payload.citations.map((c) => `<li>${c}</li>`).join("")}
  </ol>`
      : ""
  }
</body>
</html>`.trim();

    return new Blob([html], { type: "text/html" });
  }

  generateText(payload) {
    const lines = [
      payload.title.toUpperCase(),
      "=".repeat(payload.title.length),
      "",
      `Generated: ${new Date(payload.exportedAt).toLocaleDateString()}`,
      `Citation Style: ${payload.citationStyle}`,
      `Citations: ${payload.citationCount}`,
      "",
      ...payload.sections.flatMap((s) => [
        s.title.toUpperCase(),
        "-".repeat(s.title.length),
        "",
        s.content || "",
        "",
      ]),
      ...(payload.citations.length
        ? [
            "REFERENCES",
            "----------",
            "",
            ...payload.citations.map((c, i) => `${i + 1}. ${c}`),
          ]
        : []),
    ];
    return new Blob([lines.join("\n")], { type: "text/plain" });
  }

  generateJSON(payload) {
    return new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
  }

  /** -------------------- Warnings & metrics -------------------- **/
  generateWarnings(citationStatus) {
    if (!citationStatus) return [];
    const warn = [];
    if (citationStatus.stale > 0) {
      warn.push({
        type: "stale_citations",
        message: `${citationStatus.stale} of ${citationStatus.total} citations could not be verified.`,
        severity: "warning",
      });
    }
    if (citationStatus.total === 0) {
      warn.push({
        type: "no_citations",
        message: "Document contains no citations. Consider adding research-backed sources.",
        severity: "info",
      });
    }
    return warn;
  }

  countPMISources(citations) {
    return citations.filter(
      (c) =>
        (typeof c.source === "string" && c.source.toLowerCase().includes("pmi")) ||
        c.url?.includes("pmi.org")
    ).length;
  }

  calculateResearchCoverage(sections, bySectionMap) {
    if (!sections?.length) return 0;
    const researched = sections.filter((s) => (bySectionMap.get(s.id)?.length || 0) > 0).length;
    return Math.round((researched / sections.length) * 100);
  }

  calculateCitationDensity(document) {
    const words = document?.metadata?.totalWords || 0;
    const cites =
      typeof citationManager?.list === "function" ? citationManager.list().length : 0;
    return words > 0 ? Math.round((cites / words) * 1000) : 0; // per 1,000 words
  }

  analyzeSections(sections, bySectionMap) {
    return (sections || []).map((s) => ({
      id: s.id,
      title: s.title,
      wordCount: s.content?.split(/\s+/).filter(Boolean).length || 0,
      citationCount: bySectionMap.get(s.id)?.length || 0,
      hasFallback: !!s.fallback,
      researchQuality: (bySectionMap.get(s.id)?.length || 0) > 0 ? "good" : "needs_improvement",
    }));
  }

  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      at: new Date().toISOString(),
    };
  }

  getAvailableFormats() {
    return Object.entries(this.formats).map(([id, f]) => ({
      id,
      name: f.name,
      extension: f.extension,
      mimeType: f.mimeType,
    }));
  }

  getAvailableCitationStyles() {
    return Object.entries(this.styles).map(([id, s]) => ({ id, name: s.name }));
  }

  /** Batch export helper */
  async exportBatch(documents, options = {}) {
    const results = [];
    const errors = [];
    for (const doc of documents) {
      try {
        const r = await this.exportDocument(doc, {
          ...options,
          filename: `${getDocType(doc)}_${safeSlug(getDocTitle(doc))}`,
        });
        results.push(r);
      } catch (e) {
        errors.push({ documentId: doc.id, error: e.message });
      }
    }
    return { results, errors, success: errors.length === 0 };
  }
}

export const exportService = new ExportService();
