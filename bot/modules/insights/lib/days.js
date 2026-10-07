// Local-day helpers (pure). Day keys are YYYY-MM-DD in the guild timezone.
const fmt = (tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
function safe(tz) { try { fmt(tz); return tz; } catch { return 'Africa/Cairo'; } }
function local(ms, tz) { const p = Object.fromEntries(fmt(safe(tz)).formatToParts(new Date(ms)).map((x) => [x.type, x.value])); return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), day: `${p.year}-${p.month}-${p.day}` }; }
const offset = (ms, tz) => { const l = local(ms, tz); return Date.UTC(l.y, l.mo - 1, l.d, l.h, l.mi, l.s) - Math.floor(ms / 1000) * 1000; };
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
function startOf(day, tz) { const g = Date.parse(day + 'T00:00:00Z'); const s1 = g - offset(g, tz); return g - offset(s1, tz); }
// [start, end) in UTC for a local day.
const dayRange = (day, tz) => ({ start: new Date(startOf(day, tz)), end: new Date(startOf(addDays(day, 1), tz)) });
const weekday = (day) => new Date(Date.parse(day + 'T00:00:00Z')).getUTCDay();
module.exports = { local, dayRange, addDays, weekday, safe };
