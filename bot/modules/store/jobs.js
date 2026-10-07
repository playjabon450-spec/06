const { EmbedBuilder } = require('discord.js'); const { t } = require('../../core/i18n'); const log = require('../../core/logger');
const { checkLowStock } = require('./lib/stock'); const subs = require('./lib/subscriptions'); const flow = require('./lib/flow');
const ST = { draft: 'مسودة', awaiting_payment: 'بانتظار الدفع', awaiting_confirmation: 'بانتظار التأكيد', paid: 'مدفوع', delivered: 'تم التسليم', cancelled: 'ملغي', refunded: 'مسترد', expired: 'منتهي' };
module.exports = {
  // Job "store:checkLowStock" payload: {}
  async checkLowStock(ctx, job) { await checkLowStock(ctx, job.guildId); },
  // Job "store:subscriptionSweep" payload: {} (the hourly sweep also runs on its own)
  async subscriptionSweep(ctx) { await subs.sweep(ctx); },
  // Job "store:orderStatusChanged" payload: { orderId, from, to, by, reason } — enqueued by the dashboard. Logs + refreshes the ticket embed.
  async orderStatusChanged(ctx, job) {
    const { orderId, from, to, by, reason } = job.payload; const o = await ctx.prisma.order.findUnique({ where: { id: orderId } }); if (!o) return;
    await log.channel(job.guildId, 'orders', new EmbedBuilder().setColor(0x3498db).setTitle(t(job.cfg, 'store.orderStatus.title', { number: o.number })).setDescription(t(job.cfg, 'store.orderStatus.body', { from: ST[from] || from, to: ST[to] || to, by, reason: reason || '—' })));
    await flow.refreshMain(ctx.client, orderId);
  },
};
