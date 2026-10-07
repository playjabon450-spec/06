const { EmbedBuilder } = require('discord.js');
const prisma = require('../../core/db'); const log = require('../../core/logger'); const config = require('../../core/config'); const { claim } = require('../../core/guard'); const { t } = require('../../core/i18n');
const { checkLowStock } = require('./lib/stock'); const { hashImage, registerReceipt } = require('./lib/receipt'); const flow = require('./lib/flow'); const pay = require('./lib/payments'); const subs = require('./lib/subscriptions'); const { OPEN, FINAL } = require('./lib/orders');
const isImg = (a) => /^image\//.test(a.contentType || '') || /\.(png|jpe?g|webp|gif)$/i.test(a.name || '');

// Customer sent an image in a vodafone order ticket => capture the first image as the receipt.
async function handleReceipt(ctx, order, msg) {
  const att = [...msg.attachments.values()].find(isImg); if (!att) return;
  const cfg = await config.get(order.guildId); const method = await prisma.paymentMethod.findUnique({ where: { id: order.methodId } }); if (!method) return;
  const claimed = await prisma.order.updateMany({ where: { id: order.id, status: 'awaiting_payment' }, data: { status: 'awaiting_confirmation' } }); if (!claimed.count) return; // only the first image wins
  const back = () => prisma.order.updateMany({ where: { id: order.id, status: 'awaiting_confirmation' }, data: { status: 'awaiting_payment' } });
  let hash; try { hash = await hashImage(att.url); } catch (e) { await back(); return msg.reply({ content: t(cfg, 'store.pay.receiptFail') }).catch(() => null); }
  const r = await registerReceipt(prisma, { orderId: order.id, methodId: method.id, amount: order.total, url: att.url, hash });
  if (!r.ok) {
    await back(); await msg.reply({ content: t(cfg, 'store.pay.receiptDup') }).catch(() => null);
    const alert = t(cfg, 'store.pay.dupAlert', { number: order.number, user: order.userId }); await msg.channel.send({ content: `${(cfg.guild.staffRoleIds || []).map((x) => `<@&${x}>`).join(' ')} ${alert}` }).catch(() => null);
    await log.channel(order.guildId, 'orders', new EmbedBuilder().setColor(0xe74c3c).setDescription(alert)); return;
  }
  await msg.reply({ content: t(cfg, 'store.pay.receiptGot') }).catch(() => null); await flow.refreshMain(ctx.client, order.id);
  await msg.channel.send(flow.staffCard(cfg, order, method, { imageUrl: att.url }));
}
// Every minute: expiry warnings, expiry, closing of finished tickets.
async function sweepOrders(ctx) {
  const now = new Date(), soon = new Date(now.getTime() + 5 * 60000);
  for (const o of await prisma.order.findMany({ where: { status: { in: ['draft', 'awaiting_payment'] }, channelId: { not: null }, expiresAt: { gt: now, lte: soon } }, take: 100 })) {
    if (!(await claim(prisma, `order-warn:${o.id}:${+o.expiresAt}`))) continue; const cfg = await config.get(o.guildId);
    const ch = await ctx.client.channels.fetch(o.channelId).catch(() => null); await ch?.send({ content: `<@${o.userId}> ${t(cfg, 'store.expire.warn', { number: o.number })}` }).catch(() => null);
  }
  for (const o of await prisma.order.findMany({ where: { status: { in: ['draft', 'awaiting_payment'] }, expiresAt: { lte: now } }, take: 100 })) {
    const r = await prisma.order.updateMany({ where: { id: o.id, status: { in: ['draft', 'awaiting_payment'] } }, data: { status: 'expired', expiresAt: now } }); if (!r.count) continue;
    const cfg = await config.get(o.guildId); const ch = o.channelId ? await ctx.client.channels.fetch(o.channelId).catch(() => null) : null;
    await ch?.send({ content: `<@${o.userId}> ${t(cfg, 'store.expire.done', { number: o.number })}` }).catch(() => null); await pay.closeOrderTicket(ctx, o.id, { delayMs: 8000 });
  }
  for (const o of await prisma.order.findMany({ where: { status: { in: FINAL }, channelId: { not: null }, expiresAt: { lte: now } }, take: 100 })) await pay.closeOrderTicket(ctx, o.id, { delayMs: 1000 });
}
const every = (fn, ms, name) => setInterval(() => Promise.resolve(fn()).catch((e) => log.warn(name + ' failed', e.message)), ms);
let started = false;
module.exports = {
  ready: async (ctx) => {
    if (started) return; started = true;
    setTimeout(() => checkLowStock(ctx).catch(() => null), 30000); every(() => checkLowStock(ctx), 10 * 60000, 'lowStock');
    every(() => sweepOrders(ctx), 60000, 'orderSweep'); setTimeout(() => subs.sweep(ctx).catch(() => null), 60000); every(() => subs.sweep(ctx), 3600000, 'subscriptionSweep');
  },
  // Order tickets are recognised by their channel topic "order:<id>" (no DB hit for other channels).
  messageCreate: async (ctx, msg) => {
    try {
      const topic = msg.channel?.topic; if (!msg.guildId || !topic?.startsWith('order:')) return; if (msg.author.id === ctx.client.user.id) return;
      const cfg = await config.get(msg.guildId); if (!config.enabled(cfg, 'store', true)) return;
      const order = await prisma.order.findFirst({ where: { id: topic.slice(6), channelId: msg.channelId, status: 'awaiting_payment' } }); if (!order?.methodId) return;
      const method = await prisma.paymentMethod.findUnique({ where: { id: order.methodId } }); if (!method) return;
      if (method.kind === 'vodafone') { if (msg.author.id === order.userId && msg.attachments.size) await handleReceipt(ctx, order, msg); return; }
      if (msg.author.bot) await pay.processTransferMessage(ctx, order.id, msg);
    } catch (e) { log.error('store messageCreate', e); }
  },
};
