// Pure helpers for the applications system.
const chunk = (arr, n = 5) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }; // Discord modals hold max 5 inputs
function validateAnswer(q, v) {
  const s = String(v ?? '').trim(); if (!s) return q.required ? { error: `«${q.label}» مطلوب` } : { value: '' };
  if (q.type === 'number' && !/^-?\d+([.,]\d+)?$/.test(s)) return { error: `«${q.label}» يجب أن يكون رقماً` };
  if (q.type === 'select') { const hit = (q.options || []).find((o) => o.toLowerCase() === s.toLowerCase()); if (!hit) return { error: `«${q.label}»: اختر من ${(q.options || []).join(' / ')}` }; return { value: hit }; }
  return { value: s };
}
const tally = (votes) => ({ up: votes.filter((v) => v.vote === 'up').length, down: votes.filter((v) => v.vote === 'down').length, neutral: votes.filter((v) => v.vote === 'neutral').length, total: votes.length });
// minVotes rule: decisions allowed only once total votes reach the form minimum.
const canDecide = (votes, minVotes) => { const t = tally(votes); return { ok: t.total >= (minVotes || 0), needed: Math.max(0, (minVotes || 0) - t.total), ...t }; };
// Cooldown after a rejection. -> Date when the user may apply again, or null.
const cooldownUntil = (lastRejectedAt, days, now = Date.now()) => { if (!lastRejectedAt || !days) return null; const u = +new Date(lastRejectedAt) + days * 86400000; return u > now ? new Date(u) : null; };
module.exports = { chunk, validateAnswer, tally, canDecide, cooldownUntil };
