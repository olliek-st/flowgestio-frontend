/* =============================================
src/services/formatters.js
Text / HTML / JSON renderers with citations
============================================= */


function escapeHtml(s) {
return String(s)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;');
}


export function toText(built, citations = []) {
const body = built.sections.map(s => `# ${s.title}\n\n${s.content}\n`).join('\n');
const refs = citations?.length ? `\nReferences\n${citations.map((c, i) => `${i+1}. ${c.source || c.url} — ${c.url} ${c.claim ? `(${c.claim})` : ''}`).join('\n')}` : '';
return `${built.meta?.title || 'Business Case'}\n${'-'.repeat(40)}\n\n${body}${refs}\n`;
}


export function toHtml(built, citations = []) {
const head = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(built.meta?.title || 'Business Case')}</title>
<style>body{font-family:ui-sans-serif,system-ui,Arial;margin:32px;line-height:1.55}h1{font-size:22px;margin-top:24px}h2{font-size:18px;margin-top:20px}hr{margin:24px 0;border:none;border-top:1px solid #e5e7eb}.sec{margin-bottom:16px;white-space:pre-wrap}</style>
</head><body>`;
const header = `<h1>${escapeHtml(built.meta?.title || 'Business Case')}</h1><hr/>`;
const body = built.sections.map(s => `<h2>${escapeHtml(s.title)}</h2><div class="sec">${escapeHtml(s.content)}</div>`).join('');
const refs = citations?.length ? `<h2>References</h2><ol>${citations.map(c => `<li>${escapeHtml(c.source || c.url)} — <a href="${escapeHtml(c.url)}">${escapeHtml(c.url)}</a>${c.claim ? ` (${escapeHtml(c.claim)})` : ''}</li>`).join('')}</ol>` : '';
const foot = `</body></html>`;
return head + header + body + refs + foot;
}


export function toJson(built, citations = []) {
return JSON.stringify({ ...built, citations }, null, 2);
}