const prisma = require('../../core/db'); const log = require('../../core/logger'); const config = require('../../core/config'); const perms = require('../../core/perms'); const { claim } = require('../../core/guard');
const R = require('./lib/report'); const tz = require('./lib/tz'); const inact = require('./lib/inactivity');
const today = () => new Date().toISOString().slice(0, 10); const sup = new Map();
// Counts staff messages inside ticket/order channels (+ configured support channels) per day.
async function onMessage(ctx, msg) {
  try {
    if (!msg.guildId || msg.author.bot || !msg.member) return; const topic = msg.channel?.topic || ''; let ok = topic.startsWith('ticket:') || topic.startsWith('order:');
    if (!ok) { let ids = sup.get(msg.guildId); if (!ids || ids.exp < Date.now()) { ids = { list: R.of(await config.get(msg.guildId)).supportChannelIds || [], exp: Date.now() + 60000 }; sup.set(msg.guildId, ids); } ok = ids.list.includes(msg.channelId) || ids.list.includes(msg.channel.parentId); }
    if (!ok || !(await perms.isStaff(msg.member, msg.guildId))) return;
    await prisma.staffDaily.upsert({ where: { guildId_userId_day: { guildId: msg.guildId, userId: msg.author.id, day: today() } }, create: { guildId: msg.guildId, userId: msg.author.id, day: today(), messages: 1 }, update: { messages: { increment: 1 } } });
  } catch (e) { log.warn('staff messageCreate', e.message); }
}
// Every 5 minutes: scheduled weekly/monthly reports + daily inactivity check. Idempotent via claim keys (safe across restarts).
async function tick(ctx) {
  for (const guild of ctx.client.guilds.cache.values()) {
    try {
      const cfg = await config.get(guild.id); if (!config.enabled(cfg, 'staff', true)) continue; const s = R.of(cfg); const zone = R.tzOf(cfg);
      for (const d of tz.due(s, new Date(), zone)) if (await claim(prisma, `staff-report:${guild.id}:${d.key}`)) await R.postReport(ctx, guild.id, d.kind);
      const l = tz.parts(new Date(), zone); if (s.inactivity.enabled && l.hour >= 10 && (await claim(prisma, `staff-inact-run:${guild.id}:${l.date}`))) await inact.run(ctx, guild, cfg);
    } catch (e) { log.warn('staff tick failed', guild.id, e.message); }
  }
}
let started = false;
module.exports = { messageCreate: onMessage, ready: async (ctx) => { if (started) return; started = true; setTimeout(() => tick(ctx), 45000); setInterval(() => tick(ctx), 5 * 60000); } };
