// src/utils/executiveSummaryGenerator.js
/**
 * Executive Summary Generator
 * Derives S1 content from S2-S14 per BC01_SCHEMA
 * 
 * @param {Object} formData - Form data with sections S2-S14
 * @param {string} title - Business case title (from global header, not S2)
 * @returns {Object} Executive summary object
 */
export function generateExecutiveSummary(formData, title = '') {
  const S1 = {};

  // Initiative name (from title parameter, not S2)
  S1.initiative_name = title || 'Untitled Initiative';

  // Problem summary (first 200 chars of problem_statement)
  if (formData.S2?.problem_statement) {
    S1.problem_summary = extractSummary(formData.S2.problem_statement, 200);
  } else {
    S1.problem_summary = '';
  }

  // Recommended solution (from S7)
  if (formData.S7?.selected_option && formData.S7?.rationale) {
    const optionName = formData.S7.selected_option.substring(0, 80);
    const rationaleSnippet = extractSummary(formData.S7.rationale, 120);
    S1.recommended_solution = `${optionName}. ${rationaleSnippet}`;
  } else if (formData.S7?.selected_option) {
    S1.recommended_solution = formData.S7.selected_option;
  } else {
    S1.recommended_solution = '';
  }

  // Key benefits (first 5 bullets from S8)
  if (formData.S8?.benefits_list) {
    S1.key_benefits = extractBullets(formData.S8.benefits_list, 5);
  } else {
    S1.key_benefits = '';
  }

  // Cost range (from S9)
  if (formData.S9?.capex_total || formData.S9?.opex_annual) {
    const capex = formatCurrency(formData.S9.capex_total);
    const opex = formatCurrency(formData.S9.opex_annual);
    S1.estimated_cost_range = `CAPEX: ${capex}, OPEX: ${opex}/year`;
  } else {
    S1.estimated_cost_range = 'TBD';
  }

  // Timeline (from S12)
  S1.timeline_high_level = formData.S12?.timeline_summary 
    ? extractSummary(formData.S12.timeline_summary, 100)
    : 'TBD';

  // Decision requested (from S14)
  S1.decision_requested = formData.S14?.approval_decision || 'Approve';

  return S1;
}

// Helper: Extract first N characters, end on word boundary
function extractSummary(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

// Helper: Extract first N bullet points (accepts string OR array)
function extractBullets(text, maxBullets) {
  if (text == null) return '';

  // If already an array, normalize it
  if (Array.isArray(text)) {
    const bullets = text
      .map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim()))
      .filter(Boolean)
      .slice(0, maxBullets);

    return bullets.join('\n');
  }

  // If not a string, coerce safely
  if (typeof text !== 'string') {
    text = String(text);
  }

  const s = text.trim();
  if (!s) return '';

  const lines = s.split(/\r?\n|,/g).map((line) => line.trim()).filter(Boolean);
  const bullets = lines.slice(0, maxBullets);

  return bullets.join('\n');
}

// Helper: Format currency
function formatCurrency(value) {
  if (!value || value === 0) return '$0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '$0';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
