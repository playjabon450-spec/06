const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../../../core/db'); const config = require('../../../core/config'); const log = require('../../../core/logger'); const { t } = require('../../../core/i18n'); const { btn, sendDm } = require('./delivery');
const productName = async (orderId) => (await prisma.orderItem.findFirst({ where: { orderId } }))?.productName || '';
// Hourly: (1) remove expired roles, (2) send reminders `reminderDays` before expiry with a "تجديد" button.
async function sweep({ client }) {
  const now = new Date();
  for (const s of await prisma.subscription.findMany({ where: { removedAt: null, expiresAt: { lte: now } }, take: 200 })) {
    try {
      const guild = await client.guilds.fetch(s.guildId).catch(() => null); const cfg = await config.get(s.guildId);
      if (guild) { const m = await guild.members.fetch(s.userId).catch(() => null); if (m) await m.roles.remove(s.roleId, 'subscription expired'); } // throws on missing permission => retried next hour
      await prisma.subscription.update({ where: { id: s.id }, data: { removedAt: new Date() } });
      await sendDm(client, s.userId, t(cfg, 'store.sub.removed', { product: await productName(s.orderId) }));
      await prisma.auditLog.create({ data: { guildId: s.guildId, userId: 'system', action: 'store.subscription.expired', details: { subscriptionId: s.id, userId: s.userId } } });
    } catch (e) { log.warn('subscription expire failed', s.id, e.message); }
  }
  const guilds = [...new Set((await prisma.subscription.findMany({ where: { removedAt: null, remindedAt: null }, select: { guildId: true } })).map((x) => x.guildId))];
  for (const gid of guilds) {
    const cfg = await config.get(gid); const days = cfg.guild.settings?.store?.reminderDays || 2;
    for (const s of await prisma.subscription.findMany({ where: { guildId: gid, removedAt: null, remindedAt: null, expiresAt: { gt: now, lte: new Date(now.getTime() + days * 86400000) } }, take: 200 })) {
      try {
        const ok = await sendDm(client, s.userId, { content: t(cfg, 'store.sub.reminder', { product: await productName(s.orderId), date: s.expiresAt.toLocaleDateString('ar-EG') }), components: s.packageId ? [new ActionRowBuilder().addComponents(btn(`store:renew:${s.id}`, t(cfg, 'store.btn.renew'), ButtonStyle.Success))] : [] });
        await prisma.subscription.update({ where: { id: s.id }, data: { remindedAt: new Date() } }); if (!ok) log.info('reminder DM closed for', s.userId);
      } catch (e) { log.warn('reminder failed', s.id, e.message); }
    }
  }
}
module.exports = { sweep };
