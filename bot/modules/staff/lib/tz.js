// Local time parts for a timezone (default Africa/Cairo). Pure.
function parts(date = new Date(), tz = 'Africa/Cairo') {
  let f; try { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' }); } catch { return parts(date, 'Africa/Cairo'); }
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value])); const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, weekday: wd, date: `${p.year}-${p.month}-${p.day}`, ym: `${p.year}-${p.month}` };
}
// Which scheduled reports are due now? s = { weekly:{enabled,day,hour}, monthly:{enabled,day,hour} } -> [{ kind, key }]
function due(s, now = new Date(), tz) {
  const l = parts(now, tz); const out = [];
  if (s.weekly?.enabled && l.weekday === s.weekly.day && l.hour >= s.weekly.hour) out.push({ kind: 'weekly', key: `weekly:${l.date}` });
  if (s.monthly?.enabled && l.day === s.monthly.day && l.hour >= s.monthly.hour) out.push({ kind: 'monthly', key: `monthly:${l.ym}` });
  return out;
}
module.exports = { parts, due };
