const prisma = require('../../core/db'); const log = require('../../core/logger'); const config = require('../../core/config'); const { claim } = require('../../core/guard');
const D = require('./lib/days'); const S = require('./lib/settings'); const tracker = require('./lib/tracker'); const { aggregateDay } = require('./lib/aggregate'); const { postDigest } = require('./lib/digest'); const sum = require('./lib/summaries'); const staffTz = require('../staff/lib/tz');
async function bump(guildId, field) { const cfg = await config.get(guildId); const day = D.local(Date.now(), S.tzOf(cfg)).day; await prisma.analyticsDaily.upsert({ where: { guildId_day: { guildId, day } }, create: { guildId, day, [field]: 1 }, update: { [field]: { increment: 1 } } }); }
async function onMessage(ctx, msg) {
  try {
    if (!msg.guildId || msg.author.bot || msg.system) return; const cfg = await config.get(msg.guildId); if (!config.enabled(cfg, 'insights', true)) return; const a = S.of(cfg).aiSummary;
    tracker.record({ guildId: msg.guildId, userId: msg.author.id, channelId: msg.channelId, content: a.enabled ? msg.content : '' }, S.tzOf(cfg), a.enabled ? new Set(a.channelIds) : null);
  } catch (e) { log.warn('insights messageCreate', e.message); }
}
async function tick(ctx) {
  for (const guild of ctx.client.guilds.cache.values()) {
    try {
      const cfg = await config.get(guild.id); if (!config.enabled(cfg, 'insights', true)) continue; const s = S.of(cfg); const tz = S.tzOf(cfg); const l = D.local(Date.now(), tz); const yesterday = D.addDays(l.day, -1);
      if (await claim(prisma, `insights-agg:${guild.id}:${yesterday}`)) { await tracker.flush(prisma); await aggregateDay(prisma, guild.id, yesterday, tz, guild.memberCount); }
      for (const d of staffTz.due({ weekly: s.weekly }, new Date(), tz)) if (await claim(prisma, `insights-digest:${guild.id}:${d.key}`)) await postDigest(ctx, guild.id);
      if (s.aiSummary.enabled && l.h >= s.aiSummary.hour && (await claim(prisma, `insights-airun:${guild.id}:${l.day}`))) await sum.run(ctx, guild.id, cfg, l.day);
    } catch (e) { log.warn('insights tick failed', guild.id, e.message); }
  }
}
let started = false;
module.exports = {
  messageCreate: onMessage,
  guildMemberAdd: async (ctx, m) => { try { if (!m.user.bot) await bump(m.guild.id, 'joined'); } catch (e) { log.warn('insights join', e.message); } },
  guildMemberRemove: async (ctx, m) => { try { if (m.user?.bot) return; await bump(m.guild.id, 'left'); await prisma.memberActivity.updateMany({ where: { guildId: m.guild.id, userId: m.id }, data: { leftAt: new Date() } }); } catch (e) { log.warn('insights leave', e.message); } },
  ready: async (ctx) => { if (started) return; started = true; setInterval(() => tracker.flush(prisma), 60000); process.once('SIGTERM', () => tracker.flush(prisma).finally(() => process.exit(0))); setTimeout(() => tick(ctx), 60000); setInterval(() => tick(ctx), 5 * 60000); },
};
