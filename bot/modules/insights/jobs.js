const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); const prisma = require('../../core/db'); const log = require('../../core/logger'); const config = require('../../core/config'); const { claim } = require('../../core/guard'); const { t } = require('../../core/i18n');
const D = require('./lib/days'); const S = require('./lib/settings'); const { postDigest } = require('./lib/digest'); const tracker = require('./lib/tracker'); const { aggregateDay } = require('./lib/aggregate');
module.exports = {
  // "insights:digest" {}: send the weekly digest now.
  async digest(ctx, job) { await postDigest(ctx, job.guildId); },
  // "insights:aggregate" {day?}: manual re-aggregation (default: yesterday).
  async aggregate(ctx, job) { const tz = S.tzOf(job.cfg); const day = /^\d{4}-\d{2}-\d{2}$/.test(job.payload?.day || '') ? job.payload.day : D.addDays(D.local(Date.now(), tz).day, -1); await tracker.flush(prisma); const g = await ctx.client.guilds.fetch(job.guildId).catch(() => null); await aggregateDay(prisma, job.guildId, day, tz, g?.memberCount || 0); },
  // "insights:renewReminder" {subscriptionId}: one-click renewal DM (button reuses store:renew). Once per subscription per day.
  async renewReminder(ctx, job) {
    const sub = await prisma.subscription.findFirst({ where: { id: job.payload.subscriptionId, guildId: job.guildId } }); if (!sub) return; const day = D.local(Date.now(), S.tzOf(job.cfg)).day; if (!(await claim(prisma, `insights-renew:${sub.id}:${day}`))) return;
    const item = await prisma.orderItem.findFirst({ where: { orderId: sub.orderId } }); const lapsed = +sub.expiresAt <= Date.now(); const date = sub.expiresAt.toLocaleDateString('ar-EG');
    const text = t(job.cfg, 'insights.renew.dm', { product: item?.productName || '', state: t(job.cfg, lapsed ? 'insights.renew.lapsed' : 'insights.renew.expiring', { date }) });
    try { const u = await ctx.client.users.fetch(sub.userId); await u.send({ content: text, components: sub.packageId ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`store:renew:${sub.id}`).setLabel(t(job.cfg, 'store.btn.renew')).setStyle(ButtonStyle.Success))] : [] }); await prisma.subscription.update({ where: { id: sub.id }, data: { remindedAt: new Date() } }); await prisma.auditLog.create({ data: { guildId: job.guildId, userId: 'dashboard', action: 'insights.renewReminder', details: { subscriptionId: sub.id, target: sub.userId } } }).catch(() => null); }
    catch (e) { log.info('renew reminder DM failed', sub.userId, e.message); }
  },
};
