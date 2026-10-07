// In-memory counters flushed to the DB every minute (no per-message DB writes). Message TEXT is never stored; AI samples live in memory only.
const log = require('../../../core/logger'); const D = require('./days');
let counts = new Map(), days = new Set(), last = new Map(); const samples = new Map();
function record({ guildId, userId, channelId, content, ts = Date.now() }, tz, sampleChannels) {
  const l = D.local(ts, tz); const k = `${guildId}|${l.day}|${l.h}|${channelId}`; counts.set(k, (counts.get(k) || 0) + 1); days.add(`${guildId}|${userId}|${l.day}`); last.set(`${guildId}|${userId}`, ts);
  if (sampleChannels?.has(channelId) && content && content.length >= 8) { const a = samples.get(`${guildId}|${channelId}`) || []; a.push(content.replace(/https?:\/\/\S+/g, '').slice(0, 200)); if (a.length > 150) a.shift(); samples.set(`${guildId}|${channelId}`, a); }
}
const takeSamples = (guildId, channelId) => { const k = `${guildId}|${channelId}`; const a = samples.get(k) || []; samples.delete(k); return a; };
async function flush(db) {
  const c = counts, d = days, l = last; counts = new Map(); days = new Set(); last = new Map();
  try {
    for (const [k, count] of c) { const [guildId, day, hour, channelId] = k.split('|'); await db.insightsMsg.upsert({ where: { guildId_day_hour_channelId: { guildId, day, hour: +hour, channelId } }, create: { guildId, day, hour: +hour, channelId, count }, update: { count: { increment: count } } }); }
    if (d.size) await db.memberDay.createMany({ data: [...d].map((x) => { const [guildId, userId, day] = x.split('|'); return { guildId, userId, day }; }), skipDuplicates: true });
    for (const [k, ts] of l) { const [guildId, userId] = k.split('|'); await db.memberActivity.upsert({ where: { guildId_userId: { guildId, userId } }, create: { guildId, userId, lastMessageAt: new Date(ts) }, update: { lastMessageAt: new Date(ts), leftAt: null } }); }
  } catch (e) { log.warn('insights flush failed', e.message); }
}
module.exports = { record, flush, takeSamples };
