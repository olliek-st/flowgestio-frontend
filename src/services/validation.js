/* =============================================
src/services/validation.js
Required fields & warnings for export gating
============================================= */


export function validateBusinessCase(built) {
const errors = [];
const warnings = [];


const meta = built?.meta || {};
if (!meta.title) errors.push('Missing title');


const sections = Object.fromEntries((built?.sections || []).map(s => [s.id, s]));
if (!sections.exec_summary?.content) errors.push('Executive Summary is empty');


// Heuristics: ensure minimum info exists in key sections
if (!sections.benefits?.content) warnings.push('Benefits section is light');
if (!sections.costs?.content) warnings.push('Costs section is light');
if (!sections.risks?.content) warnings.push('Risks section is light');


return { ok: errors.length === 0, errors, warnings };
}