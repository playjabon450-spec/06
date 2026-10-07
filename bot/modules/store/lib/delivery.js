const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../../../core/db'); const log = require('../../../core/logger'); const config = require('../../../core/config'); const { t } = require('../../../core/i18n'); const { claim } = require('../../../core/guard');
const { claimKey } = require('./inventory');
const btn = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const staffPing = (cfg) => (cfg.guild.staffRoleIds || []).map((r) => `<@&${r}>`).join(' ') || '';
const itemsText = (o) => o.items.map((i) => `${i.productName} (${i.packageName})`).join('، ');
// Buttons shown after a successful delivery.
function finalRows(cfg, orderId) {
  const stars = new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map((n) => btn(`store:rate:${orderId}:${n}`, '⭐'.repeat(n), ButtonStyle.Secondary)));
  const act = new ActionRowBuilder().addComponents(btn(`store:close:${orderId}`, t(cfg, 'store.btn.close'), ButtonStyle.Primary), btn(`store:refund:${orderId}`, t(cfg, 'store.btn.refund'), ButtonStyle.Danger));
  return [stars, act];
}
async function sendDm(client, userId, content) { try { const u = await client.users.fetch(userId); await u.send(content); return true; } catch { return false; } }
// Runs the product's delivery rule once. Idempotent via IdempotencyKey; on error the claim is released so staff can retry.
async function deliverOrder({ client }, orderId, { force = false } = {}) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }); if (!o || !['paid', 'delivered'].includes(o.status)) return { ok: false, reason: 'status' };
  const cfg = await config.get(o.guildId); const item = o.items[0]; const product = item && (await prisma.product.findUnique({ where: { id: item.productId } }));
  const key = `deliver:${o.id}`; if (force) await prisma.idempotencyKey.deleteMany({ where: { key } });
  if (!(await claim(prisma, key))) return { ok: false, reason: 'already' };
  const guild = await client.guilds.fetch(o.guildId).catch(() => null); const ch = o.channelId ? await client.channels.fetch(o.channelId).catch(() => null) : null;
  const say = (p) => ch?.send(p).catch(() => null);
  try {
    if (!product) throw new Error('المنتج محذوف');
    const d = product.delivery || {}; let dmText = null, customerNote = null;
    if (product.deliveryType === 'manual') {
      await say({ content: t(cfg, 'store.deliver.manual', { roles: staffPing(cfg), number: o.number, user: o.userId, product: product.name }), components: [new ActionRowBuilder().addComponents(btn(`store:delivered:${o.id}`, t(cfg, 'store.btn.delivered'), ButtonStyle.Success))] });
      await log.channel(o.guildId, 'orders', new EmbedBuilder().setColor(0xf1c40f).setDescription(t(cfg, 'store.deliver.manual', { roles: '', number: o.number, user: o.userId, product: product.name })));
      return { ok: true, manual: true };
    }
    if (product.deliveryType === 'role') {
      const member = await guild.members.fetch(o.userId); if (!d.roleId) throw new Error('لم يتم تحديد رتبة للمنتج');
      await member.roles.add(d.roleId, `order #${o.number}`); let until = '';
      const days = d.temporary ? (await prisma.package.findUnique({ where: { id: item.packageId } }))?.durationDays || d.durationDays : null;
      if (d.temporary && days) {
        const now = Date.now(); const ex = await prisma.subscription.findFirst({ where: { guildId: o.guildId, userId: o.userId, roleId: d.roleId, removedAt: null }, orderBy: { expiresAt: 'desc' } });
        const exp = new Date(Math.max(now, ex ? +ex.expiresAt : 0) + days * 86400000);
        if (ex) await prisma.subscription.update({ where: { id: ex.id }, data: { expiresAt: exp, remindedAt: null, orderId: o.id, packageId: item.packageId } });
        else await prisma.subscription.create({ data: { guildId: o.guildId, userId: o.userId, orderId: o.id, roleId: d.roleId, packageId: item.packageId, expiresAt: exp } });
        until = t(cfg, 'store.deliver.until', { date: exp.toLocaleDateString('ar-EG') });
      }
      customerNote = t(cfg, 'store.deliver.role', { role: d.roleId, until });
    } else if (product.deliveryType === 'key') {
      const k = (await prisma.stockKey.findFirst({ where: { usedByOrder: o.id } })) || (await claimKey(prisma, product.id, o.id)); if (!k) throw new Error('لا يوجد مفتاح متاح');
      dmText = t(cfg, 'store.deliver.key', { number: o.number, key: k.value.replace(/`/g, "'") });
    } else if (product.deliveryType === 'message') {
      const raw = d.message || t(cfg, 'store.deliver.defaultMsg', { product: '{product}', order_id: '{order_id}' });
      dmText = raw.replaceAll('{user}', `<@${o.userId}>`).replaceAll('{order_id}', `#${o.number}`).replaceAll('{product}', product.name);
    }
    if (dmText) {
      const sent = await sendDm(client, o.userId, t(cfg, 'store.deliver.dm', { number: o.number, product: product.name, text: dmText }));
      if (!sent) await say({ content: `<@${o.userId}> ${t(cfg, 'store.deliver.msgFallback')}\n${dmText}` });
    }
    if (customerNote) await say({ content: customerNote });
    await markDelivered({ client }, o, cfg);
    return { ok: true };
  } catch (e) {
    await prisma.idempotencyKey.deleteMany({ where: { key } }).catch(() => null); log.warn('delivery failed', o.id, e.message);
    await say({ content: t(cfg, 'store.deliver.fail', { number: o.number, error: e.message }), components: [new ActionRowBuilder().addComponents(btn(`store:redeliver:${o.id}`, t(cfg, 'store.btn.redeliver'), ButtonStyle.Primary))] });
    return { ok: false, reason: 'error', error: e.message };
  }
}
// Shared by auto delivery and the manual "تم التسليم" button.
async function markDelivered({ client }, o, cfg) {
  const minutes = cfg.guild.settings?.store?.autoCloseMinutes || 10;
  const r = await prisma.order.updateMany({ where: { id: o.id, status: { in: ['paid'] } }, data: { status: 'delivered', deliveredAt: new Date(), expiresAt: new Date(Date.now() + minutes * 60000) } });
  if (!r.count) return false;
  const ch = o.channelId ? await client.channels.fetch(o.channelId).catch(() => null) : null;
  const items = o.items ? itemsText(o) : '';
  await ch?.send({ content: `<@${o.userId}>`, embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle(t(cfg, 'store.deliver.done.title', { number: o.number })).setDescription(t(cfg, 'store.deliver.done.body') + `\n\n${t(cfg, 'store.rate.prompt')}`)], components: finalRows(cfg, o.id) }).catch(() => null);
  await log.channel(o.guildId, 'orders', new EmbedBuilder().setColor(0x2ecc71).setDescription(t(cfg, 'store.log.delivered', { number: o.number, user: o.userId, items })));
  return true;
}
module.exports = { deliverOrder, markDelivered, finalRows, sendDm, staffPing, itemsText, btn };
