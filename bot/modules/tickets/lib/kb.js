// Pure Knowledge-Base matching (Arabic-aware keyword scoring). No Discord/DB imports.
const norm = (s) => String(s || '').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['في', 'من', 'على', 'عن', 'الي', 'ما', 'هل', 'انا', 'لو', 'ده', 'دي', 'هو', 'هي', 'كيف', 'ايه', 'ازاي', 'مع', 'عندي', 'the', 'and', 'for']);
const toks = (s) => norm(s).split(' ').map((w) => (w.length > 4 ? w.replace(/^ال/, '') : w)).filter((w) => w.length >= 3 && !STOP.has(w));
function score(text, a) {
  const n = norm(text), tk = new Set(toks(text)); let s = 0;
  for (const k of a.keywords || []) { const nk = norm(k); if (nk && n.includes(nk)) s += 3; }
  let overlap = 0; for (const w of toks(a.question)) if (tk.has(w)) overlap++; return s + Math.min(overlap, 4);
}
// -> { article, score } | null  (threshold 3 = one keyword hit, or 3 shared question words)
function match(text, articles, min = 3) {
  let best = null; for (const a of articles) { if (a.active === false) continue; const s = score(text, a); if (s >= min && (!best || s > best.score)) best = { article: a, score: s }; }
  return best;
}
const hitRate = (a) => (a.hits ? Math.round((a.resolved / a.hits) * 100) : 0);
module.exports = { norm, score, match, hitRate };
