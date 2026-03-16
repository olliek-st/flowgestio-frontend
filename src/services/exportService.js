// src/services/exportService.js
// Unified export pipeline with proper Markdown → HTML (PDF) and Markdown-ish → DOCX,
// 12pt body, single-ish spacing, bold headings, bullets + ordered lists that restart per section,
// and a simple “letterhead” pulled from meta.company.

import dayjs from "dayjs";
import MarkdownIt from "markdown-it";
import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

/* ----------------------------- helpers ----------------------------- */

const EXPORT_FORMATS = {
  pdf:  { name: "PDF",  mimeType: "application/pdf", extension: "pdf"  },
  docx: { name: "DOCX", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" },
  html: { name: "HTML", mimeType: "text/html", extension: "html" },
  txt:  { name: "Text", mimeType: "text/plain", extension: "txt"  },
  json: { name: "JSON", mimeType: "application/json", extension: "json" },
};

const getTitle = (doc) => (doc?.meta?.title || doc?.title || "Untitled Document").trim();
const getSections = (doc) => Array.isArray(doc?.sections) ? doc.sections : [];

const safeSlug = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 120);

// 12pt body; headings heavier; tighter paragraph spacing; list spacing; letterhead styles
const baseCss = `
  :root { --body-size: 12pt; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.55; color:#111; font-size: var(--body-size); }
  h1,h2,h3 { margin: 1.1em 0 .55em; font-weight: 700; color:#000; }
  h1 { font-size: 1.7rem; border-bottom: 2px solid #222; padding-bottom: .25rem; }
  h2 { font-size: 1.3rem; border-bottom: 1px solid #ddd; }
  h3 { font-size: 1.05rem; }
  p { margin: .5em 0 .5em; }
  ul, ol { margin: .4em 0 .6em 1.2em; }
  li { margin: .15em 0; }
  blockquote { margin: .6em 0; padding-left: .8em; border-left: 3px solid #d0d7de; color:#555; }
  .letterhead { display:flex; gap:16px; align-items:center; margin: 0 0 14px; }
  .logo { width:64px; height:64px; background:#e9ecef; border:1px solid #d0d7de; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#6c757d; font-size:12px; }
  .co-lines { font-size: 11pt; line-height: 1.35; color:#222; }
  .co-name { font-weight: 700; font-size: 12pt; }
  .meta { background:#f6f7fb; padding:.65rem .75rem; border-radius:8px; margin: 0 0 1rem; font-size: 11pt; }
`;

// Strong normalization for export safety
function toStr(v) {
  return typeof v === "string" ? v : (v == null ? "" : String(v));
}
function normalizeSectionsForExport(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((s, i) => ({
    id: s?.id || `sec_${i + 1}`,
    title: toStr(s?.title || `Section ${i + 1}`),
    content: toStr(s?.content ?? s?.content_md ?? ""),
  }));
}
function mdToHtml(markdown = "") {
  try { return md.render(markdown || ""); }
  catch { return `<p>${(markdown || "").replace(/</g,"&lt;")}</p>`; }
}

// Build the HTML "letterhead" area from meta.company
function buildLetterheadHTML(company = {}) {
  const { name, address, contact, mission, vision, logoDataUrl } = company || {};
  const hasAny =
    name || address || contact || mission || vision || logoDataUrl;
  if (!hasAny) return ""; // no letterhead

  const logoBlock = logoDataUrl
    ? `<img class="logo" src="${logoDataUrl}" alt="Logo" />`
    : `<div class="logo">Logo</div>`;

  const lines = [
    name ? `<div class="co-name">${escapeHtml(name)}</div>` : "",
    address ? `<div>${escapeHtml(address)}</div>` : "",
    contact ? `<div>${escapeHtml(contact)}</div>` : "",
    mission ? `<div><strong>Mission:</strong> ${escapeHtml(mission)}</div>` : "",
    vision ? `<div><strong>Vision:</strong> ${escapeHtml(vision)}</div>` : "",
  ].filter(Boolean).join("");

  return `
    <div class="letterhead">
      ${logoBlock}
      <div class="co-lines">
        ${lines}
      </div>
    </div>
  `.trim();
}

function escapeHtml(s = "") {
  return s
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

// Full HTML doc wrapper used by HTML & PDF
function wrapHtmlDoc({ title, company, bodyHtml }) {
  const lh = buildLetterheadHTML(company);
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>${baseCss}</style>
</head>
<body>
  ${lh}
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <div><strong>Generated:</strong> ${dayjs().format("YYYY-MM-DD")}</div>
  </div>
  ${bodyHtml}
</body>
</html>`.trim();
}

// Sections → HTML body (Markdown → HTML for each)
function buildSectionsHtml(sections) {
  return sections.map(s => `
    <h2>${escapeHtml(s.title || "")}</h2>
    ${mdToHtml(s.content)}
  `).join("\n");
}

/* --------------------- DOCX markdown-ish parser --------------------- */
/**
 * Turn simple Markdown into docx Paragraph blocks.
 * Supports: #, ##, ### headings; -, * bullets; 1. 2. ordered lists (restart each call);
 * blank lines; basic **bold**.
 * @param {string} markdown
 * @param {{olRef: string}} options  pass a unique olRef per section to restart numbering
 */
function mdToDocxBlocks(markdown = "", { olRef = "ol" } = {}) {
  const lines = (markdown || "").split(/\r?\n/);
  const blocks = [];

  // twips: 20 twips = 1 pt. We’ll keep single-ish spacing and 12pt body.
  const AFTER_P = 160; // ~8 pt after
  const HEADING_SP_BEFORE = 200; // 10 pt
  const HEADING_SP_AFTER  = 140; // 7 pt

  // Convert **bold** to TextRun({bold:true}), keep default size 12pt (24 half-points)
  const toRuns = (text) => {
    const parts = [];
    let last = 0;
    const re = /\*\*(.+?)\*\*/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(new TextRun({ text: text.slice(last, m.index), size: 24 }));
      parts.push(new TextRun({ text: m[1], bold: true, size: 24 }));
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(new TextRun({ text: text.slice(last), size: 24 }));
    if (!parts.length) parts.push(new TextRun({ text: text, size: 24 }));
    return parts;
  };

  for (const raw of lines) {
    const line = raw.trimRight();

    // blank line
    if (!line.trim()) {
      blocks.push(new Paragraph({ spacing: { after: AFTER_P } }));
      continue;
    }

    // ### / ## / #
    if (line.startsWith("### ")) {
      blocks.push(new Paragraph({
        children: toRuns(line.slice(4).trim()),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: HEADING_SP_BEFORE, after: HEADING_SP_AFTER },
      }));
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(new Paragraph({
        children: toRuns(line.slice(3).trim()),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: HEADING_SP_BEFORE + 40, after: HEADING_SP_AFTER + 20 },
      }));
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(new Paragraph({
        children: toRuns(line.slice(2).trim()),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: HEADING_SP_BEFORE + 60, after: HEADING_SP_AFTER + 40 },
      }));
      continue;
    }

    // unordered list: - or *
    if (/^[-*]\s+/.test(line)) {
      const text = line.replace(/^[-*]\s+/, "");
      blocks.push(new Paragraph({
        children: toRuns(text),
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
      continue;
    }

    // ordered list: 1. 2. …
    if (/^\d+\.\s+/.test(line)) {
      const text = line.replace(/^\d+\.\s+/, "");
      blocks.push(new Paragraph({
        children: toRuns(text),
        numbering: { reference: olRef, level: 0 },
        spacing: { after: 80 },
      }));
      continue;
    }

    // paragraph
    blocks.push(new Paragraph({
      children: toRuns(line),
      spacing: { after: AFTER_P },
    }));
  }

  return blocks;
}

/* --------------------------- main service --------------------------- */

class ExportService {
  constructor() {
    this.formats = EXPORT_FORMATS;
  }

  /**
   * Export a document.
   * @param {*} document builtDoc-like: { meta: { title, company? }, sections[] }
   * @param {*} options  { format, filename }
   */
  async exportDocument(document, options = {}) {
    const { format = "pdf", filename = null } = options;

    if (!this.formats[format]) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const title = getTitle(document);
    const sections = normalizeSectionsForExport(getSections(document));
    const company = document?.meta?.company || {};

    const payload = { title, sections, company };

    const ts = dayjs().format("YYYY-MM-DD");
    const base = filename || `${safeSlug(title)}_${ts}`;
    const outName = `${base}.${this.formats[format].extension}`;

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
        blob = this.generateTXT(payload);
        break;
      case "json":
        blob = this.generateJSON(payload);
        break;
      default:
        throw new Error(`Format not implemented: ${format}`);
    }

    const url = URL.createObjectURL(blob);
    return { blob, url, filename: outName };
  }

  /* ------------------------------ HTML ------------------------------ */
  generateHTML(payload) {
    const bodyHtml = buildSectionsHtml(payload.sections);
    const html = wrapHtmlDoc({ title: payload.title, company: payload.company, bodyHtml });
    return new Blob([html], { type: "text/html" });
  }

  /* ------------------------------- PDF ------------------------------ */
  async generatePDF(payload) {
    // Render proper HTML (markdown converted) with CSS, then let jsPDF paginate.
    const bodyHtml = buildSectionsHtml(payload.sections);
    const html = wrapHtmlDoc({ title: payload.title, company: payload.company, bodyHtml });

    const hidden = document.createElement("div");
    hidden.style.position = "fixed";
    hidden.style.left = "-99999px";
    hidden.style.top = "0";
    hidden.style.width = "820px";
    hidden.innerHTML = html;
    document.body.appendChild(hidden);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    await new Promise((resolve) => {
      doc.html(hidden, {
        x: 10,
        y: 10,
        width: 190,       // A4 inner width
        windowWidth: 820, // match the CSS max width for scaling
        autoPaging: "text",
        callback: () => resolve(),
      });
    });

    document.body.removeChild(hidden);

    const blob = doc.output("blob");
    return blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" });
  }

  /* ------------------------------- DOCX ----------------------------- */
  async generateDOCX(payload) {
    // Numbering config:
    //  - bullet level0 with hanging 0.25" and left indent 0.5"
    //  - ordered lists: we create a unique reference per section (ol_sX) so numbering restarts.
    const numberingConfig = [
      {
        reference: "ul",
        levels: [
          {
            level: 0,
            format: "bullet",
            text: "•",
            alignment: "left",
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }, // 0.5" left, 0.25" hanging
          },
        ],
      },
      // ordered levels will be pushed per-section below (ol_s{idx})
    ];

    const children = [];

    // Letterhead (textual; logo-in-DOCX omitted in this pass for simplicity)
    const { name, address, contact, mission, vision } = payload.company || {};
    const hasLetter = name || address || contact || mission || vision;
    if (hasLetter) {
      if (name) {
        children.push(new Paragraph({
          children: [new TextRun({ text: name, bold: true, size: 24 })],
          spacing: { after: 80 },
        }));
      }
      if (address) {
        children.push(new Paragraph({ children: [new TextRun({ text: address, size: 24 })] }));
      }
      if (contact) {
        children.push(new Paragraph({ children: [new TextRun({ text: contact, size: 24 })] }));
      }
      if (mission) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Mission: ", bold: true, size: 24 }),
            new TextRun({ text: mission, size: 24 }),
          ],
        }));
      }
      if (vision) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Vision: ", bold: true, size: 24 }),
            new TextRun({ text: vision, size: 24 }),
          ],
        }));
      }
      children.push(new Paragraph({ spacing: { after: 80 } }));
    }

    // Title
    children.push(new Paragraph({
      children: [new TextRun({ text: payload.title, bold: true, size: 32 })], // ~16pt
      heading: HeadingLevel.TITLE,
      spacing: { after: 80 },
    }));

    // Date line
    children.push(new Paragraph({
      children: [new TextRun({ text: `Generated: ${dayjs().format("YYYY-MM-DD")}`, size: 22 })],
      spacing: { after: 200 },
    }));

    // Sections (each with its own ordered-list reference so numbering restarts)
    payload.sections.forEach((s, idx) => {
      const ref = `ol_s${idx + 1}`; // unique ref per section
      numberingConfig.push({
        reference: ref,
        levels: [
          {
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: "left",
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }, // match bullets
          },
        ],
      });

      // Section title (H1)
      children.push(new Paragraph({
        children: [new TextRun({ text: s.title || `Section ${idx + 1}`, bold: true, size: 28 })], // ~14pt
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 220, after: 140 },
      }));

      // Convert markdown-ish text to paragraphs; ordered lists use this section's ref
      const blocks = mdToDocxBlocks(s.content, { olRef: ref });
      children.push(...blocks);
    });

    const doc = new Document({
      sections: [{ properties: {}, children }],
      numbering: {
        config: numberingConfig,
      },
    });

    const blob = await Packer.toBlob(doc);
    return new Blob([blob], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }

  /* ------------------------------- TXT ------------------------------ */
  generateTXT(payload) {
    // Quick markdown → plain-ish text (strip **, keep bullets and numbers as typed)
    const lines = [
      payload.title.toUpperCase(),
      "=".repeat(payload.title.length),
      "",
      ...payload.sections.flatMap((s, i) => [
        (s.title || `Section ${i + 1}`).toUpperCase(),
        "-".repeat((s.title || `Section ${i + 1}`).length),
        "",
        (s.content || "").replace(/\r/g, ""),
        "",
      ]),
    ];
    return new Blob([lines.join("\n")], { type: "text/plain" });
  }

  /* ------------------------------- JSON ----------------------------- */
  generateJSON(payload) {
    return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  }
}

export const exportService = new ExportService();
