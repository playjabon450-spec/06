// All store interactions. custom_id = store:<action>:<orderId>[:extra]. Handlers get (ix, rest, { client, cfg, tr }).
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonStyle, EmbedBuilder } = require('discord.js');
const prisma = require('../../core/db'); const perms = require('../../core/perms'); const log = require('../../core/logger'); const config = require('../../core/config'); const { reply } = require('../../core/guard'); const { t } = require('../../core/i18n');
const flow = require('./lib/flow'); const pay = require('./lib/payments'); const { calculate, validateCoupon } = require('./lib/pricing'); const { available } = require('./lib/stock');
const { confirmPayment, reverseOrder, OPEN, FINAL } = require('./lib/orders');
const { deliverOrder, markDelivered, sendDm, btn } = require('./lib/delivery'); const probotHelpAt = new Map();

// Loads the order and checks access. opts: staff (staff only), statuses (allowed), own (owner or staff, default true).
async function get(ix, orderId, { staff = false, statuses = null } = {}) {
  const order = await flow.loadOrder(orderId); const cfg = await config.get(ix.guildId);
  if (!order || order.guildId !== ix.guildId) { await reply(ix, t(cfg, 'store.err.gone')); return null; }
  const isStaff = await perms.isStaff(ix.member, ix.guildId);
  if (staff ? !isStaff : order.userId !== ix.user.id && !isStaff) { await reply(ix, t(cfg, staff ? 'core.noPermission' : 'store.err.notYours')); return null; }
  if (statuses && !statuses.includes(order.status)) { await reply(ix, t(cfg, 'store.err.locked')); return null; }
  return { order, cfg, isStaff };
}
const show = async (ix, cfg, order, step, opts) => { const p = await flow.renderStep(cfg, order, step, opts); if (p.error) return reply(ix, t(cfg, p.error)); return ix.isFromMessage?.() || ix.isMessageComponent() ? ix.update(p) : ix.reply({ ...p, ephemeral: true }); };
const modal = (cfg, customId, title, label, { long = false } = {}) => new ModalBuilder().setCustomId(customId).setTitle(title).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v').setLabel(label).setStyle(long ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(true).setMaxLength(300)));
const upd = (ix, p) => (ix.isFromMessage?.() ? ix.update(p) : ix.reply({ ...p, ephemeral: true }));
const fresh = async (id) => flow.loadOrder(id);
const couponMsgs = { invalid: 'store.coupon.invalid', expired: 'store.coupon.expired', maxUses: 'store.coupon.maxUses', maxPerUser: 'store.coupon.maxPerUser', product: 'store.coupon.product', minOrder: 'store.coupon.minOrder' };
const DRAFT = ['draft'];

module.exports = {
  // ---- entry points ----
  async order(ix, _p, { client, cfg }) {
    await ix.deferReply({ ephemeral: true });
    const r = await flow.openOrder({ client }, cfg, ix.guild, ix.user);
    await ix.editReply(r.error ? { content: r.error } : { content: t(cfg, 'store.order.opened', { channel: `<#${r.channel.id}>` }) });
  },
  async my(ix, _p, { cfg }) {
    const os = await prisma.order.findMany({ where: { guildId: ix.guildId, userId: ix.user.id, status: { not: 'draft' } }, orderBy: { createdAt: 'desc' }, take: 10, include: { items: true } });
    if (!os.length) return reply(ix, t(cfg, 'store.mine.empty'));
    const prods = await prisma.product.findMany({ where: { id: { in: os.flatMap((o) => o.items.map((i) => i.productId)) }, deliveryType: 'key' }, select: { id: true } }); const keyIds = new Set(prods.map((p) => p.id));
    const keyOrders = os.filter((o) => o.status === 'delivered' && o.items.some((i) => keyIds.has(i.productId))).slice(0, 5);
    const lines = os.map((o) => t(cfg, 'store.mine.line', { number: o.number, items: o.items.map((i) => `${i.productName} (${i.packageName})`).join('، ') || '—', total: `${o.total} ${pay.cur(o)}`, status: t(cfg, `store.status.${o.status}`) }));
    await ix.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor(flow.color(cfg)).setTitle(t(cfg, 'store.mine.title')).setDescription(lines.join('\n').slice(0, 4000))],
      components: keyOrders.length ? [new ActionRowBuilder().addComponents(keyOrders.map((o) => btn(`store:resend:${o.id}`, `${t(cfg, 'store.btn.resend')} #${o.number}`)))] : [] });
  },
  async resend(ix, [id], { client, cfg }) {
    const o = await flow.loadOrder(id); if (!o || o.userId !== ix.user.id || o.guildId !== ix.guildId || o.status !== 'delivered') return reply(ix, t(cfg, 'store.err.notYours'));
    const k = await prisma.stockKey.findFirst({ where: { usedByOrder: o.id } }); if (!k) return reply(ix, t(cfg, 'store.mine.noKey'));
    const text = t(cfg, 'store.deliver.key', { number: o.number, key: k.value.replace(/`/g, "'") });
    // DM first; if closed, show it only to the owner (ephemeral).
    if (await sendDm(client, ix.user.id, text)) return reply(ix, t(cfg, 'store.mine.resent')); return reply(ix, text);
  },
  // Used from DMs (see module.dmActions): renewal button from the reminder DM.
  async renew(ix, [subId], { client }) {
    const sub = await prisma.subscription.findUnique({ where: { id: subId } }); if (!sub || sub.userId !== ix.user.id || !sub.packageId) return reply(ix, '❌');
    const cfg = await config.get(sub.guildId); await ix.deferReply({ ephemeral: true });
    const guild = await client.guilds.fetch(sub.guildId).catch(() => null); if (!guild) return ix.editReply({ content: t(cfg, 'store.sub.renewFail') });
    const r = await flow.openOrder({ client }, cfg, guild, ix.user, { packageId: sub.packageId });
    await ix.editReply({ content: r.error || t(cfg, 'store.sub.renewOk', { channel: `<#${r.channel.id}>` }) });
  },
  // ---- selection steps ----
  async selproduct(ix, [id], { client }) {
    const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; const p = await prisma.product.findFirst({ where: { id: ix.values[0], guildId: ix.guildId, active: true } });
    const a = p && (await available(prisma, p)); if (!p || (a !== null && a <= 0)) return reply(ix, t(g.cfg, 'store.err.stock'));
    await prisma.orderItem.deleteMany({ where: { orderId: id } }); await show(ix, g.cfg, g.order, 'package', { productId: p.id });
  },
  async selpackage(ix, [id, productId], { client }) {
    const g = await get(ix, id, { statuses: DRAFT }); if (!g) return;
    const pk = await prisma.package.findFirst({ where: { id: ix.values[0], productId, active: true }, include: { product: { include: { questions: true } } } });
    if (!pk || !pk.product.active) return reply(ix, t(g.cfg, 'store.err.stock')); const a = await available(prisma, pk.product); if (a !== null && a <= 0) return reply(ix, t(g.cfg, 'store.err.stock'));
    await prisma.$transaction([prisma.orderItem.deleteMany({ where: { orderId: id } }), prisma.orderItem.create({ data: { orderId: id, productId, packageId: pk.id, productName: pk.product.name, packageName: pk.name, unitPrice: pk.priceEgp } }),
      prisma.order.update({ where: { id }, data: { answers: {}, couponId: null, couponCode: null } })]);
    await show(ix, g.cfg, await fresh(id), pk.product.questions.length ? 'questions' : 'summary');
  },
  async answer(ix, [id]) {
    const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; const x = await flow.ctxOf(g.order); if (!x.product?.questions.length) return reply(ix, t(g.cfg, 'store.err.locked'));
    await ix.showModal(flow.questionsModal(g.cfg, g.order, x.product));
  },
  async qmodal(ix, [id]) {
    const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; const x = await flow.ctxOf(g.order); if (!x.product) return reply(ix, t(g.cfg, 'store.err.locked'));
    const r = flow.readAnswers(ix, x.product); if (r.error) return reply(ix, r.error);
    await prisma.order.update({ where: { id }, data: { answers: r.answers } }); await show(ix, g.cfg, await fresh(id), 'summary');
  },
  // ---- coupons ----
  async coupon(ix, [id]) { const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; await ix.showModal(modal(g.cfg, `store:cmodal:${id}`, t(g.cfg, 'store.modal.coupon'), t(g.cfg, 'store.modal.couponLabel'))); },
  async cmodal(ix, [id]) {
    const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; const x = await flow.ctxOf(g.order); if (!x.pkg) return reply(ix, t(g.cfg, 'store.err.locked'));
    const code = ix.fields.getTextInputValue('v').trim().toUpperCase(); const c = await prisma.coupon.findFirst({ where: { guildId: ix.guildId, code } });
    const userUses = c ? await prisma.order.count({ where: { couponId: c.id, userId: g.order.userId, id: { not: id }, status: { in: ['awaiting_payment', 'awaiting_confirmation', 'paid', 'delivered'] } } }) : 0;
    const v = validateCoupon(c, { subtotal: x.pkg.priceEgp, productId: x.pkg.productId, userUses }); if (!v.ok) return reply(ix, t(g.cfg, couponMsgs[v.reason]));
    await prisma.order.update({ where: { id }, data: { couponId: c.id, couponCode: c.code } }); const o = await fresh(id);
    await show(ix, g.cfg, o, 'summary'); await ix.followUp({ ephemeral: true, content: t(g.cfg, 'store.coupon.ok', { code: c.code, discount: calculate({ pkg: x.pkg, coupon: c }).discount }) }).catch(() => null);
  },
  async couponrm(ix, [id]) { const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; await prisma.order.update({ where: { id }, data: { couponId: null, couponCode: null } }); await show(ix, g.cfg, await fresh(id), 'summary'); },
  // ---- navigation ----
  async back(ix, [id, step]) {
    const g = await get(ix, id, { statuses: ['draft', 'awaiting_payment'] }); if (!g) return; if (!['product', 'package', 'summary', 'methods', 'questions'].includes(step)) return;
    if (step === 'product') await prisma.orderItem.deleteMany({ where: { orderId: id } }); if (g.order.status !== 'draft') await prisma.order.update({ where: { id }, data: { status: 'draft' } });
    await show(ix, g.cfg, await fresh(id), step);
  },
  async edit(ix, [id]) { const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; await prisma.orderItem.deleteMany({ where: { orderId: id } }); await prisma.order.update({ where: { id }, data: { answers: {}, couponId: null, couponCode: null } }); await show(ix, g.cfg, await fresh(id), 'product'); },
  async proceed(ix, [id], { client }) {
    const g = await get(ix, id, { statuses: DRAFT }); if (!g) return; const x = await flow.ctxOf(g.order); if (!x.pkg) return reply(ix, t(g.cfg, 'store.err.locked'));
    if (x.coupon && !validateCoupon(x.coupon, { subtotal: x.pkg.priceEgp, productId: x.pkg.productId, userUses: 0 }).ok) { await prisma.order.update({ where: { id }, data: { couponId: null, couponCode: null } }); return show(ix, g.cfg, await fresh(id), 'summary'); }
    const c = calculate({ pkg: x.pkg, coupon: x.coupon });
    if (c.after <= 0) { // free after coupon: no payment needed
      await prisma.order.update({ where: { id }, data: { status: 'awaiting_payment', subtotal: c.subtotal, discount: c.discount, total: 0, currency: 'EGP' } }); await ix.deferUpdate();
      const res = await confirmPayment(prisma, id, { by: 'system:free', amount: 0, methodId: 'free' }); if (res.ok) { await ix.channel.send({ content: t(g.cfg, 'store.pay.free') }); await pay.afterPaid({ client }, id, res, 'system:free'); } return;
    }
    await show(ix, g.cfg, g.order, 'methods');
  },
  async method(ix, [id, mid]) {
    const g = await get(ix, id, { statuses: ['draft', 'awaiting_payment'] }); if (!g) return; const x = await flow.ctxOf(g.order); const m = await prisma.paymentMethod.findFirst({ where: { id: mid, guildId: ix.guildId, active: true } });
    if (!m || !flow.methodReady(m) || !x.pkg) return reply(ix, t(g.cfg, 'store.err.notReady'));
    const a = await available(prisma, x.product); if (a !== null && a <= 0) return reply(ix, t(g.cfg, 'store.err.stock'));
    const c = calculate({ pkg: x.pkg, coupon: x.coupon, method: m }); const mins = g.cfg.guild.settings?.store?.expireMinutes || 60;
    await prisma.order.update({ where: { id }, data: { methodId: m.id, subtotal: c.subtotal, discount: c.discount, fee: c.fee, total: c.total, currency: c.currency, status: 'awaiting_payment', expiresAt: new Date(Date.now() + mins * 60000) } });
    await ix.update(flow.payScreen(g.cfg, await fresh(id), m, c));
  },
  async receipt(ix, [id]) { const g = await get(ix, id, { statuses: ['awaiting_payment'] }); if (!g) return; await reply(ix, t(g.cfg, 'store.pay.receiptPrompt')); },
  async transferred(ix, [id], { client }) { // credit method in staff-confirm mode
    const g = await get(ix, id, { statuses: ['awaiting_payment'] }); if (!g) return; const m = await prisma.paymentMethod.findUnique({ where: { id: g.order.methodId } });
    const r = await prisma.order.updateMany({ where: { id, status: 'awaiting_payment' }, data: { status: 'awaiting_confirmation' } }); if (!r.count) return reply(ix, t(g.cfg, 'store.err.locked'));
    await ix.deferUpdate(); await flow.refreshMain(client, id); await ix.channel.send(flow.staffCard(g.cfg, g.order, m));
  },
  async probothelp(ix, [id]) {
    const g = await get(ix, id, { statuses: ['awaiting_payment'] }); if (!g) return; const m = await prisma.paymentMethod.findUnique({ where: { id: g.order.methodId } });
    await reply(ix, t(g.cfg, 'store.pay.probotHelp', { recipient: m.config.recipientId, amount: `${g.order.total} ${pay.cur(g.order)}` }));
    if ((probotHelpAt.get(id) || 0) < Date.now()) { if (probotHelpAt.size > 5000) probotHelpAt.clear(); probotHelpAt.set(id, Date.now() + 120000); await ix.channel.send({ content: t(g.cfg, 'store.pay.staffPing', { roles: (g.cfg.guild.staffRoleIds || []).map((r) => `<@&${r}>`).join(' '), user: g.order.userId, number: g.order.number }), components: [new ActionRowBuilder().addComponents(btn(`store:verify:${id}`, t(g.cfg, 'store.btn.verify'), ButtonStyle.Primary))] }); }
  },
  // ---- staff payment actions ----
  async verify(ix, [id], ctx) {
    const g = await get(ix, id, { staff: true }); if (!g) return; await ix.deferReply({ ephemeral: true });
    const r = g.order.status === 'awaiting_payment' ? await pay.rescanTicket(ctx, id, ix.channel) : { handled: false };
    if (r.handled) return ix.editReply({ content: t(g.cfg, 'store.pay.verifyFound') });
    await ix.editReply({ content: t(g.cfg, g.order.status === 'awaiting_payment' ? 'store.pay.verifyNone' : 'store.pay.already'), components: g.order.status === 'awaiting_payment' ? [new ActionRowBuilder().addComponents(btn(`store:confirm:${id}`, t(g.cfg, 'store.btn.confirm'), ButtonStyle.Success))] : [] });
  },
  async confirm(ix, [id], { client }) {
    const g = await get(ix, id, { staff: true }); if (!g) return; await ix.deferUpdate().catch(() => null);
    const pending = await prisma.payment.findFirst({ where: { orderId: id, status: 'pending' }, orderBy: { createdAt: 'desc' } });
    let res; try { res = await confirmPayment(prisma, id, { by: ix.user.id, paymentId: pending?.id }); } catch (e) { log.error('confirm failed', e); return reply(ix, t(g.cfg, 'core.error')); }
    if (!res.ok) return reply(ix, t(g.cfg, 'store.pay.already'));
    await ix.message?.edit({ components: [] }).catch(() => null); await prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action: 'store.payment.confirm', details: { orderId: id, number: g.order.number } } });
    await pay.afterPaid({ client }, id, res, ix.user.id);
  },
  async reject(ix, [id]) { const g = await get(ix, id, { staff: true }); if (!g) return; await ix.showModal(modal(g.cfg, `store:rejectmodal:${id}`, t(g.cfg, 'store.modal.reject'), t(g.cfg, 'store.modal.reason'), { long: true })); },
  async rejectmodal(ix, [id]) {
    const g = await get(ix, id, { staff: true, statuses: ['awaiting_confirmation', 'awaiting_payment'] }); if (!g) return; const reason = ix.fields.getTextInputValue('v').trim();
    await prisma.payment.updateMany({ where: { orderId: id, status: 'pending' }, data: { status: 'rejected', confirmedBy: ix.user.id } }); await prisma.order.updateMany({ where: { id, status: 'awaiting_confirmation' }, data: { status: 'awaiting_payment' } });
    await prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action: 'store.payment.reject', details: { orderId: id, reason } } });
    if (ix.isFromMessage()) await ix.update({ components: [] }); else await reply(ix, '✅');
    await ix.channel.send({ content: `<@${g.order.userId}> ${t(g.cfg, 'store.pay.rejected', { reason })}` }); await flow.refreshMain(ix.client, id, []);
  },
  async clearer(ix, [id]) {
    const g = await get(ix, id, { staff: true, statuses: ['awaiting_confirmation'] }); if (!g) return;
    await prisma.payment.updateMany({ where: { orderId: id, status: 'pending' }, data: { status: 'rejected', confirmedBy: ix.user.id } }); await prisma.order.updateMany({ where: { id, status: 'awaiting_confirmation' }, data: { status: 'awaiting_payment' } });
    await ix.update({ components: [] }); await ix.channel.send({ content: `<@${g.order.userId}> ${t(g.cfg, 'store.pay.clearer')}` }); await flow.refreshMain(ix.client, id, []);
  },
  // ---- delivery / closing ----
  async delivered(ix, [id], { client }) {
    const g = await get(ix, id, { staff: true, statuses: ['paid'] }); if (!g) return; await ix.update({ components: [] }).catch(() => null);
    await markDelivered({ client }, g.order, g.cfg); await prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action: 'store.order.delivered', details: { orderId: id } } }); await flow.refreshMain(client, id);
  },
  async redeliver(ix, [id], { client }) { const g = await get(ix, id, { staff: true, statuses: ['paid', 'delivered'] }); if (!g) return; await ix.update({ components: [] }).catch(() => null); await deliverOrder({ client }, id, { force: true }); },
  async rate(ix, [id, n]) {
    const g = await get(ix, id); if (!g) return; if (g.order.userId !== ix.user.id) return reply(ix, t(g.cfg, 'store.err.notYours'));
    const rating = Math.min(5, Math.max(1, Number(n) || 0)); const r = await prisma.order.updateMany({ where: { id, rating: null }, data: { rating } }); if (!r.count) return reply(ix, t(g.cfg, 'store.rate.already'));
    const rows = ix.message.components.map((row) => ActionRowBuilder.from(row)); rows[0].components.forEach((b) => b.setDisabled(true)); await ix.update({ components: rows });
    await ix.channel.send({ content: t(g.cfg, 'store.rate.thanks', { stars: '⭐'.repeat(rating) }) }); await log.channel(ix.guildId, 'orders', new EmbedBuilder().setColor(0xf1c40f).setDescription(t(g.cfg, 'store.log.rated', { number: g.order.number, rating })));
  },
  async close(ix, [id], { client }) {
    const g = await get(ix, id); if (!g) return; if (!FINAL.includes(g.order.status)) return reply(ix, t(g.cfg, 'store.close.notFinal'));
    await ix.reply({ content: t(g.cfg, 'store.close.soon') }); await pay.closeOrderTicket({ client }, id, { delayMs: 3000 });
  },
  async cancel(ix, [id], { client }) {
    const g = await get(ix, id, { statuses: OPEN }); if (!g) return; const r = await reverseOrder(prisma, id, { by: ix.user.id, reason: 'cancelled' }); if (!r.ok) return reply(ix, t(g.cfg, 'store.err.locked'));
    await prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action: 'store.order.cancel', details: { orderId: id, number: g.order.number } } });
    await ix.reply({ content: t(g.cfg, 'store.cancel.done', { number: g.order.number }) }); await pay.closeOrderTicket({ client }, id, { delayMs: 5000 });
  },
  async refund(ix, [id]) { const g = await get(ix, id, { staff: true }); if (!g) return; await ix.showModal(modal(g.cfg, `store:refundmodal:${id}`, t(g.cfg, 'store.modal.refund'), t(g.cfg, 'store.modal.reason'), { long: true })); },
  async refundmodal(ix, [id], { client }) {
    const g = await get(ix, id, { staff: true }); if (!g) return; const reason = ix.fields.getTextInputValue('v').trim(); const r = await reverseOrder(prisma, id, { by: ix.user.id, reason });
    if (!r.ok) return reply(ix, t(g.cfg, 'store.err.locked'));
    // Undo role delivery when applicable.
    try { const item = g.order.items[0]; const p = item && (await prisma.product.findUnique({ where: { id: item.productId } })); if (r.from !== 'cancelled' && p?.deliveryType === 'role' && p.delivery?.roleId) { const m = await ix.guild.members.fetch(g.order.userId).catch(() => null); await m?.roles.remove(p.delivery.roleId, `refund #${g.order.number}`).catch((e) => log.warn('role remove failed', e.message)); } } catch (e) { log.warn('refund role undo', e.message); }
    await prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action: r.to === 'refunded' ? 'store.order.refund' : 'store.order.cancel', details: { orderId: id, reason } } });
    await ix.reply({ content: t(g.cfg, 'store.refund.done', { action: t(g.cfg, r.to === 'refunded' ? 'store.refund.refund' : 'store.refund.cancel'), number: g.order.number, by: ix.user.id, reason }) });
    await flow.refreshMain(client, id); await log.channel(ix.guildId, 'orders', new EmbedBuilder().setColor(0xe67e22).setDescription(t(g.cfg, 'store.refund.done', { action: t(g.cfg, r.to === 'refunded' ? 'store.refund.refund' : 'store.refund.cancel'), number: g.order.number, by: ix.user.id, reason })));
  },
};
