// Rendering of the order steps + opening of the order ticket.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const prisma = require('../../../core/db'); const { t } = require('../../../core/i18n'); const log = require('../../../core/logger');
const { calculate } = require('./pricing'); const { available } = require('./stock'); const { createOrder, OPEN } = require('./orders'); const eng = require('./ticketEngine'); const { btn, staffPing } = require('./delivery');
const hex = (s, d = 0x1f6f8b) => { const n = parseInt(String(s || '').replace('#', ''), 16); return Number.isFinite(n) ? n : d; };
const color = (cfg) => hex(cfg.guild.settings?.store?.color, hex(cfg.guild.settings?.themeColor));
const cut = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const id = (a, ...p) => ['store', a, ...p].join(':');
const loadOrder = (orderId) => prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
const money = (n, cur) => `${n} ${cur === 'EGP' ? 'ج.م' : cur}`;
const nav = (cfg, orderId, step) => new ActionRowBuilder().addComponents(...(step ? [btn(id('back', orderId, step), t(cfg, 'store.btn.back'))] : []), btn(id('cancel', orderId), t(cfg, 'store.btn.cancel'), ButtonStyle.Danger));
const methodReady = (m) => (m.kind === 'vodafone' ? (m.config.numbers || []).length > 0 : !!m.config.recipientId && (m.config.confirmMode === 'staff' || !!m.config.botId));

async function availableProducts(guildId) {
  const ps = await prisma.product.findMany({ where: { guildId, active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { packages: { where: { active: true }, orderBy: { sortOrder: 'asc' } }, questions: { orderBy: { sortOrder: 'asc' } } } });
  const out = []; for (const p of ps) { if (!p.packages.length) continue; const a = await available(prisma, p); if (a === null || a > 0) out.push(p); } return out;
}
async function ctxOf(order) {
  const item = order.items?.[0]; const [product, pkg, coupon] = await Promise.all([item ? prisma.product.findUnique({ where: { id: item.productId }, include: { questions: { orderBy: { sortOrder: 'asc' } } } }) : null,
    item ? prisma.package.findUnique({ where: { id: item.packageId } }) : null, order.couponId ? prisma.coupon.findUnique({ where: { id: order.couponId } }) : null]);
  return { item, product, pkg, coupon };
}
function summaryEmbed(cfg, order, { product, pkg, coupon }, extraFields = []) {
  const c = pkg ? calculate({ pkg, coupon }) : null; const st = t(cfg, `store.status.${order.status}`);
  const e = new EmbedBuilder().setColor(color(cfg)).setTitle(t(cfg, 'store.step.summary.title', { number: order.number })).addFields({ name: t(cfg, 'store.sum.status'), value: st, inline: true });
  if (product && pkg) e.addFields({ name: t(cfg, 'store.sum.item'), value: `${product.name} — ${pkg.name}`, inline: true }, { name: t(cfg, 'store.sum.price'), value: money(c.subtotal, 'EGP'), inline: true });
  if (coupon && c.discount) e.addFields({ name: t(cfg, 'store.sum.coupon'), value: `${coupon.code} (-${money(c.discount, 'EGP')})`, inline: true });
  const ans = Object.entries(order.answers || {}); if (ans.length) e.addFields({ name: t(cfg, 'store.sum.answers'), value: cut(ans.map(([k, v]) => `**${k}:** ${cut(v, 200)}`).join('\n'), 1000) });
  if (order.methodId && order.total) e.addFields({ name: t(cfg, 'store.sum.total'), value: money(order.total, order.currency), inline: true });
  else if (c) e.addFields({ name: t(cfg, 'store.sum.total'), value: money(c.after, 'EGP'), inline: true });
  if (extraFields.length) e.addFields(extraFields); return e;
}
async function renderStep(cfg, order, step, opts = {}) {
  const gid = order.guildId; const x = await ctxOf(order); if (opts.productId) x.product = await prisma.product.findUnique({ where: { id: opts.productId }, include: { questions: true } });
  if (step === 'product') {
    const ps = (await availableProducts(gid)).slice(0, 25); if (!ps.length) return { error: 'store.err.noProducts' };
    const menu = new StringSelectMenuBuilder().setCustomId(id('selproduct', order.id)).setPlaceholder(t(cfg, 'store.step.product.placeholder'))
      .addOptions(ps.map((p) => ({ label: cut(p.name, 100), value: p.id, description: cut(`${p.description || ''} · ${t(cfg, 'store.sum.price')}: ${Math.min(...p.packages.map((k) => k.priceEgp))}+ ج.م`.replace(/^ · /, ''), 100) })));
    return { content: '', embeds: [new EmbedBuilder().setColor(color(cfg)).setTitle(t(cfg, 'store.step.product.title')).setDescription(t(cfg, 'store.step.product.desc'))], components: [new ActionRowBuilder().addComponents(menu), nav(cfg, order.id, null)] };
  }
  if (step === 'package') {
    const p = x.product; if (!p) return renderStep(cfg, order, 'product'); const pk = (await prisma.package.findMany({ where: { productId: p.id, active: true }, orderBy: { sortOrder: 'asc' } })).slice(0, 25);
    const menu = new StringSelectMenuBuilder().setCustomId(id('selpackage', order.id, p.id)).setPlaceholder(t(cfg, 'store.step.package.placeholder'))
      .addOptions(pk.map((k) => ({ label: cut(k.name, 100), value: k.id, description: cut(`${k.priceEgp} ج.م${k.durationDays ? ` · ${k.durationDays} يوم` : ''}${k.badge ? ` · ${k.badge}` : ''}`, 100) })));
    return { content: '', embeds: [new EmbedBuilder().setColor(color(cfg)).setTitle(t(cfg, 'store.step.package.title')).setDescription(t(cfg, 'store.step.package.desc', { product: p.name })).setImage(p.image || null)], components: [new ActionRowBuilder().addComponents(menu), nav(cfg, order.id, 'product')] };
  }
  if (step === 'questions') return { content: '', embeds: [new EmbedBuilder().setColor(color(cfg)).setTitle(t(cfg, 'store.step.questions.title')).setDescription(t(cfg, 'store.step.questions.desc'))],
    components: [new ActionRowBuilder().addComponents(btn(id('answer', order.id), t(cfg, 'store.btn.answer'), ButtonStyle.Primary)), nav(cfg, order.id, 'package')] };
  if (step === 'summary') {
    const row = new ActionRowBuilder().addComponents(btn(id('proceed', order.id), t(cfg, 'store.btn.proceed'), ButtonStyle.Success), btn(id('edit', order.id), t(cfg, 'store.btn.edit')),
      x.coupon ? btn(id('couponrm', order.id), t(cfg, 'store.btn.couponRemove')) : btn(id('coupon', order.id), t(cfg, 'store.btn.coupon')), btn(id('cancel', order.id), t(cfg, 'store.btn.cancel'), ButtonStyle.Danger));
    return { content: '', embeds: [summaryEmbed(cfg, order, x)], components: [row] };
  }
  if (step === 'methods') {
    const ms = (await prisma.paymentMethod.findMany({ where: { guildId: gid, active: true }, orderBy: { sortOrder: 'asc' } })).filter(methodReady).slice(0, 20); if (!ms.length) return { error: 'store.err.noMethods' };
    const rows = []; for (let i = 0; i < ms.length; i += 5) rows.push(new ActionRowBuilder().addComponents(ms.slice(i, i + 5).map((m) => { const c = calculate({ pkg: x.pkg, coupon: x.coupon, method: m }); return btn(id('method', order.id, m.id), cut(`${m.emoji} ${m.name} — ${money(c.total, c.currency)}`, 80), ButtonStyle.Primary); })));
    rows.push(nav(cfg, order.id, 'summary'));
    return { content: '', embeds: [summaryEmbed(cfg, order, x).setTitle(t(cfg, 'store.step.method.title')).setDescription(t(cfg, 'store.step.method.desc'))], components: rows };
  }
  throw new Error('unknown step ' + step);
}
function questionsModal(cfg, order, product) {
  const m = new ModalBuilder().setCustomId(id('qmodal', order.id)).setTitle(t(cfg, 'store.modal.questions'));
  product.questions.slice(0, 5).forEach((q, i) => m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q' + i).setLabel(cut(q.label, 45)).setRequired(q.required)
    .setStyle(q.type === 'text' ? TextInputStyle.Paragraph : TextInputStyle.Short).setMaxLength(q.type === 'text' ? 1000 : 200).setPlaceholder(cut(q.type === 'select' ? q.options.join(' / ') : q.type === 'number' ? '123' : '', 100) || ' '))));
  return m;
}
// Returns { answers } or { error }.
function readAnswers(ix, product) {
  const answers = {};
  for (const [i, q] of product.questions.slice(0, 5).entries()) {
    const v = (ix.fields.getTextInputValue('q' + i) || '').trim(); if (!v) { if (q.required) return { error: `❌ «${q.label}» مطلوب` }; continue; }
    if (q.type === 'number' && !/^-?\d+([.,]\d+)?$/.test(v)) return { error: `❌ «${q.label}» يجب أن يكون رقماً` };
    if (q.type === 'select') { const hit = q.options.find((o) => o.toLowerCase() === v.toLowerCase()); if (!hit) return { error: `❌ «${q.label}»: اختر من: ${q.options.join(' / ')}` }; answers[q.label] = hit; continue; }
    answers[q.label] = v;
  }
  return { answers };
}
function payScreen(cfg, order, method, calc) {
  const s = cfg.guild.settings?.store || {}; const c = method.config || {}; const vars = { name: method.name, emoji: method.emoji, amount: calc.total, currency: calc.currency, instructions: method.instructions || '', recipient: c.recipientId, numbers: (c.numbers || []).map((n) => `📱 \`${n}\``).join('\n') };
  const e = new EmbedBuilder().setColor(color(cfg)); let rows;
  if (method.kind === 'vodafone') { e.setTitle(t(cfg, 'store.pay.vodafone.title', vars)).setDescription(t(cfg, 'store.pay.vodafone.body', vars)); rows = [btn(id('receipt', order.id), t(cfg, 'store.btn.receipt'), ButtonStyle.Primary)]; }
  else if (c.confirmMode === 'staff') { e.setTitle(t(cfg, 'store.pay.credit.title', vars)).setDescription(t(cfg, 'store.pay.credit.staffBody', vars)); rows = [btn(id('transferred', order.id), t(cfg, 'store.btn.transferred'), ButtonStyle.Primary)]; }
  else { e.setTitle(t(cfg, 'store.pay.credit.title', vars)).setDescription(t(cfg, 'store.pay.credit.body', vars)); rows = [btn(id('probothelp', order.id), t(cfg, 'store.btn.probotHelp')), btn(id('verify', order.id), t(cfg, 'store.btn.verify'))]; }
  e.setFooter({ text: t(cfg, 'store.pay.expires', { minutes: s.expireMinutes || 60 }) });
  return { content: '', embeds: [e], components: [new ActionRowBuilder().addComponents(...rows), new ActionRowBuilder().addComponents(btn(id('back', order.id, 'methods'), t(cfg, 'store.btn.changeMethod')), btn(id('cancel', order.id), t(cfg, 'store.btn.cancel'), ButtonStyle.Danger))] };
}
function staffCard(cfg, order, method, { imageUrl, content = '' } = {}) {
  const e = new EmbedBuilder().setColor(0xf1c40f).setTitle(t(cfg, 'store.pay.staffCard', { number: order.number })).setDescription(t(cfg, 'store.pay.staffBody', { user: order.userId, amount: order.total, currency: order.currency === 'EGP' ? 'ج.م' : order.currency, method: `${method.emoji} ${method.name}` }));
  if (imageUrl) e.setImage(imageUrl);
  return { content: content || staffPing(cfg), embeds: [e], allowedMentions: { roles: cfg.guild.staffRoleIds || [] },
    components: [new ActionRowBuilder().addComponents(btn(id('confirm', order.id), t(cfg, 'store.btn.confirm'), ButtonStyle.Success), btn(id('reject', order.id), t(cfg, 'store.btn.reject'), ButtonStyle.Danger), ...(method.kind === 'vodafone' ? [btn(id('clearer', order.id), t(cfg, 'store.btn.clearer'))] : []))] };
}
// Re-renders the main order message as a read-only status embed (extra components optional). Never throws.
async function refreshMain(client, orderId, components = []) {
  try {
    const o = await loadOrder(orderId); if (!o?.channelId || !o.messageId) return; const cfg = await require('../../../core/config').get(o.guildId);
    const ch = await client.channels.fetch(o.channelId).catch(() => null); const msg = await ch?.messages.fetch(o.messageId).catch(() => null); if (!msg) return;
    await msg.edit({ content: '', embeds: [summaryEmbed(cfg, o, await ctxOf(o))], components }).catch(() => null);
  } catch (e) { log.warn('refreshMain failed', e.message); }
}
const lastOpen = new Map();
// Opens the private order channel. prefill = { productId, packageId } (renewals) -> starts at questions/summary.
async function openOrder({ client }, cfg, guild, user, prefill = null) {
  const s = cfg.guild.settings?.store || {}; const gid = guild.id;
  const wait = (lastOpen.get(user.id) || 0) + (s.cooldownSeconds ?? 30) * 1000 - Date.now(); if (wait > 0) return { error: t(cfg, 'store.err.cooldown', { s: Math.ceil(wait / 1000) }) };
  const open = await prisma.order.count({ where: { guildId: gid, userId: user.id, status: { in: OPEN }, channelId: { not: null } } }); const max = s.maxOpenOrders || 2; if (open >= max) return { error: t(cfg, 'store.err.limit', { n: open }) };
  if (!prefill && !(await availableProducts(gid)).length) return { error: t(cfg, 'store.err.noProducts') };
  if (lastOpen.size > 5000) lastOpen.clear(); lastOpen.set(user.id, Date.now()); let order, channel;
  try {
    order = await createOrder(prisma, { guildId: gid, userId: user.id, expireMinutes: s.expireMinutes || 60 });
    channel = await eng.createPrivateChannel(guild, { name: `طلب-${order.number}`, userId: user.id, staffRoleIds: cfg.guild.staffRoleIds || [], parentId: s.ticketCategoryId, topic: `order:${order.id}` });
  } catch (e) { log.warn('openOrder failed', e.message); if (order) await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } }).catch(() => null); return { error: t(cfg, 'store.err.channel') }; }
  let step = 'product';
  if (prefill) {
    const pk = await prisma.package.findUnique({ where: { id: prefill.packageId }, include: { product: { include: { questions: true } } } });
    if (pk?.active && pk.product.active) { await prisma.orderItem.create({ data: { orderId: order.id, productId: pk.productId, packageId: pk.id, productName: pk.product.name, packageName: pk.name, unitPrice: pk.priceEgp } }); step = pk.product.questions.length ? 'questions' : 'summary'; }
  }
  const fresh = await loadOrder(order.id); const payload = await renderStep(cfg, fresh, step);
  const msg = await channel.send({ content: `<@${user.id}>`, ...(payload.error ? { content: t(cfg, payload.error) } : payload) });
  await prisma.order.update({ where: { id: order.id }, data: { channelId: channel.id, messageId: msg.id } });
  return { channel, order };
}
module.exports = { renderStep, questionsModal, readAnswers, payScreen, staffCard, refreshMain, openOrder, loadOrder, ctxOf, summaryEmbed, availableProducts, methodReady, id, color, money };
