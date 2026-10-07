const { EmbedBuilder } = require('discord.js'); const { t } = require('../../../core/i18n'); const log = require('../../../core/logger'); const config = require('../../../core/config');
// Available stock for a product. null = unlimited.
async function available(prisma, p) {
  if (p.stockMode === 'keys') return prisma.stockKey.count({ where: { productId: p.id, used: false } });
  if (p.stockMode === 'limited') return p.stockCount;
  return null;
}
// Sends one alert when stock falls to the threshold; re-arms when stock recovers.
async function checkLowStock({ client, prisma }, guildId) {
  const products = await prisma.product.findMany({ where: { active: true, stockMode: { in: ['keys', 'limited'] }, ...(guildId ? { guildId } : {}) } });
  for (const p of products) {
    try {
      const th = Number(p.delivery?.lowStockThreshold ?? 5); if (!th) continue;
      const left = await available(prisma, p);
      if (left <= th && !p.lowStockAlertedAt) {
        const cfg = await config.get(p.guildId);
        const embed = new EmbedBuilder().setColor(0xe67e22).setTitle(t(cfg, 'store.lowStock.title')).setDescription(t(cfg, 'store.lowStock.body', { product: p.name, left, threshold: th }));
        let sent = false;
        if (p.delivery?.alertChannelId) { const ch = await client.channels.fetch(p.delivery.alertChannelId).catch(() => null); if (ch?.isTextBased()) sent = !!(await ch.send({ embeds: [embed] }).catch(() => null)); }
        if (!sent) await log.channel(p.guildId, 'orders', embed);
        await prisma.product.update({ where: { id: p.id }, data: { lowStockAlertedAt: new Date() } });
      } else if (left > th && p.lowStockAlertedAt) await prisma.product.update({ where: { id: p.id }, data: { lowStockAlertedAt: null } });
    } catch (e) { log.warn('lowStock check failed', p.id, e.message); }
  }
}
module.exports = { available, checkLowStock };
