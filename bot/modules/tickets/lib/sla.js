// Pure SLA math. Times in ms; ticket.pausedAt/openedAt are Date|number.
const ms = (d) => (d == null ? null : +new Date(d));
// Elapsed working minutes (customer-wait time excluded).
function elapsedMin(t, now = Date.now()) { const paused = (t.pausedMs || 0) + (t.pausedAt ? now - ms(t.pausedAt) : 0); return Math.max(0, (now - ms(t.openedAt) - paused) / 60000); }
// -> { fr: ratio|null, res: ratio|null }  (ratio 1 = at the limit)
function evaluate(t, cat, now = Date.now()) {
  if (!cat || t.status === 'closed') return { fr: null, res: null }; const e = elapsedMin(t, now);
  return { fr: cat.firstResponseMin && !t.firstResponseAt ? e / cat.firstResponseMin : null, res: cat.resolutionMin ? e / cat.resolutionMin : null };
}
// Which new events fired given already-sent flags. -> ['frWarn','frBreach',...]
function due(ev, flags = {}) {
  const out = [];
  for (const [k, r] of [['fr', ev.fr], ['res', ev.res]]) { if (r == null) continue; if (r >= 1 && !flags[k + 'Breach']) out.push(k + 'Breach'); else if (r >= 0.8 && r < 1 && !flags[k + 'Warn']) out.push(k + 'Warn'); }
  return out;
}
module.exports = { elapsedMin, evaluate, due };
