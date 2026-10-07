// Discord-side payment processing shared by events (auto detect) and buttons (staff actions).
const { EmbedBuilder } = require('discord.js');
const prisma = require('../../../core/db'); const log = require('../../../core/logger'); const config = require('../../../core/config'); const { t } = require('../../../core/i18n');
const { confirmPayment, recordPartial, partialTotal } = require('./orders'); const { matchTransfer, evaluateAmount } = require('./probot');
const { deliverOrder, staffPing, itemsText } = require('./delivery'); const { refreshMain, loadOrder } = require('./flow'); const eng = require('./ticketEngine');
const warned = new Map(); const cur = (o) => (o.currency === 'EGP' ? 'ج.م' : o.currency);
// After a successful confirmPayment(): announce, log, handle stock problems, then deliver.
async function afterPaid({ client }, orderId, res, by) {
  const o = await loadOrder(orderId); const cfg = await config.get(o.guildId); const ch = o.channelId ? await client.channels.fetch(o.channelId).catch(() => null) : null;
  await ch?.send({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle(t(cfg, 'store.paid.title')).setDescription(t(cfg, 'store.pay.confirmedBy', { by }).replace(/<@(bot[^>]*)>/, '$1'))] }).catch(() => null);
  await log.channel(o.guildId, 'orders', new EmbedBuilder().setColor(0x3498db).setDescription(t(cfg, 'store.log.paid', { number: o.number, user: o.userId, total: o.total, currency: cur(o), items: itemsText(o) })));
  await refreshMain(client, o.id);
  if (res.outOfStock) { const msg = t(cfg, 'store.paid.noStock', { number: o.number, product: o.items[0]?.productName || '', user: o.userId }); await ch?.send({ content: `${staffPing(cfg)}\n${msg}` }).catch(() => null); await log.channel(o.guildId, 'orders', new EmbedBuilder().setColor(0xe74c3c).setDescription(msg)); return; }
  await deliverOrder({ client }, o.id);
}
async function warnOnce(ch, key, text) { const n = Date.now(); if ((warned.get(key) || 0) > n) return; if (warned.size > 5000) warned.clear(); warned.set(key, n + 30000); await ch.send({ content: text }).catch(() => null); }
// Evaluates one message in an order ticket against the order's credit-method rules. Returns { handled }.
async function processTransferMessage({ client }, orderId, msg, { quiet = false } = {}) {
  const order = await loadOrder(orderId); if (!order || order.status !== 'awaiting_payment' || !order.methodId) return { handled: false };
  const method = await prisma.paymentMethod.findUnique({ where: { id: order.methodId } }); if (!method || method.kind === 'vodafone' || method.config.confirmMode === 'staff') return { handled: false };
  const cfg = await config.get(order.guildId); const guild = msg.guild; const [cm, rm] = await Promise.all([guild.members.fetch(order.userId).catch(() => null), guild.members.fetch(method.config.recipientId).catch(() => null)]);
  const names = (m) => (m ? [m.user.username, m.displayName, m.user.globalName].filter(Boolean) : []);
  const r = matchTransfer({ authorId: msg.author.id, content: msg.content, embeds: msg.embeds.map((e) => e.data), mentionIds: [...msg.mentions.users.keys()] }, { method, customerId: order.userId, customerNames: names(cm), recipientNames: names(rm) });
  if (r.status === 'ignore') return { handled: false };
  if (r.status === 'wrong_recipient') { if (!quiet) await warnOnce(msg.channel, 'wr' + order.id, t(cfg, 'store.pay.wrongRecipient', { recipient: method.config.recipientId })); return { handled: true, status: r.status }; }
  if (r.status === 'wrong_sender') { if (!quiet) await warnOnce(msg.channel, 'ws' + order.id, t(cfg, 'store.pay.wrongSender')); return { handled: true, status: r.status }; }
  const paid = await partialTotal(prisma, order.id); const ev = evaluateAmount(paid, r.amount, order.total);
  if (ev.status === 'under') {
    if (await recordPartial(prisma, { orderId: order.id, methodId: method.id, amount: r.amount, transferMessageId: msg.id })) await msg.channel.send({ content: t(cfg, 'store.pay.under', { got: ev.total, expected: order.total, remaining: ev.remaining, currency: cur(order) }) }).catch(() => null);
    return { handled: true, status: 'under' };
  }
  let res; try { res = await confirmPayment(prisma, order.id, { by: 'bot:auto', amount: r.amount, transferMessageId: msg.id, methodId: method.id }); } catch (e) { if (e.code === 'P2002') return { handled: true, status: 'duplicate' }; throw e; }
  if (!res.ok) return { handled: true, status: 'already' };
  if (ev.status === 'over') { const m = t(cfg, 'store.pay.over', { number: order.number, user: order.userId, extra: ev.extra, currency: cur(order) }); await msg.channel.send({ content: `${staffPing(cfg)}\n${m}` }).catch(() => null); await log.channel(order.guildId, 'orders', new EmbedBuilder().setColor(0xe67e22).setDescription(m)); }
  await afterPaid({ client }, order.id, res, 'bot:auto'); return { handled: true, status: 'paid' };
}
// Manual verify: rescan recent messages of the ticket.
async function rescanTicket(ctx, orderId, channel) {
  const msgs = [...(await channel.messages.fetch({ limit: 50 })).values()].reverse();
  for (const m of msgs) { if (!m.author.bot) continue; const r = await processTransferMessage(ctx, orderId, m, { quiet: true }); if (r.handled && ['paid', 'under'].includes(r.status)) return r; }
  return { handled: false };
}
// Transcript + delete. Used for close button, expiry and cleanup. Never throws.
async function closeOrderTicket({ client }, orderId, { delayMs = 0 } = {}) {
  const o = await loadOrder(orderId); if (!o?.channelId) return; const cfg = await config.get(o.guildId); const ch = await client.channels.fetch(o.channelId).catch(() => null);
  await prisma.order.update({ where: { id: o.id }, data: { channelId: null } }).catch(() => null);
  if (ch) await eng.closeChannel(client, ch, { guildId: o.guildId, kind: 'orders', title: t(cfg, 'store.transcript.title', { number: o.number }), embed: new EmbedBuilder().setColor(0x95a5a6).setTitle(t(cfg, 'store.transcript.title', { number: o.number })).setDescription(`<@${o.userId}> — ${t(cfg, `store.status.${o.status}`)}`), delayMs });
}
module.exports = { afterPaid, processTransferMessage, rescanTicket, closeOrderTicket, cur };
