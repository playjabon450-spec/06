// custom_id = tickets:<action>:<ticketId|categoryId>[:extra]
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../core/db'); const log = require('../../core/logger'); const config = require('../../core/config'); const { reply } = require('../../core/guard'); const { t } = require('../../core/i18n');
const T = require('./lib/tickets'); const cut = (s, n) => String(s).slice(0, n);
const mkModal = (cid, title, fields) => { const m = new ModalBuilder().setCustomId(cid).setTitle(cut(title, 45)); fields.forEach((f) => m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(f.id).setLabel(cut(f.label, 45)).setStyle(f.long ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(f.required !== false).setMaxLength(f.long ? 1000 : 200)))); return m; };
// Loads ticket + category + checks. mode: 'staff' | 'owner' (owner or staff) ; open: require status open.
async function load(ix, tid, { mode = 'owner', open = true } = {}) {
  const tk = await T.getTicket(tid); const cfg = await config.get(tk?.guildId || ix.guildId);
  if (!tk || tk.guildId !== ix.guildId) { await reply(ix, t(cfg, 'tickets.err.gone')); return null; }
  const cat = await T.getCat(tk.categoryId); const staff = await T.isStaffFor(ix.member, ix.guildId, cat);
  if (mode === 'staff' ? !staff : !(staff || tk.userId === ix.user.id)) { await reply(ix, t(cfg, mode === 'staff' ? 'tickets.err.staff' : 'tickets.err.notYours')); return null; }
  if (open && tk.status !== 'open') { await reply(ix, t(cfg, 'tickets.err.closed')); return null; }
  return { tk, cat, cfg, staff };
}
async function openFor(ix, catId, answers, { client, cfg }) {
  const cat = await prisma.ticketCategory.findFirst({ where: { id: catId, guildId: ix.guildId, active: true } }); if (!cat) return reply(ix, t(cfg, 'tickets.err.cat'));
  const r = await T.createTicket({ client }, cfg, ix.guild, ix.user, cat, answers); await ix.editReply({ content: r.error || t(cfg, 'tickets.opened', { channel: `<#${r.channel.id}>` }) });
}
module.exports = {
  async open(ix, [catId], ctx) {
    const cat = await prisma.ticketCategory.findFirst({ where: { id: catId, guildId: ix.guildId, active: true } }); if (!cat) return reply(ix, t(ctx.cfg, 'tickets.err.cat'));
    const qs = (Array.isArray(cat.questions) ? cat.questions : []).slice(0, 5);
    if (qs.length) return ix.showModal(mkModal(`tickets:qmodal:${cat.id}`, cat.name, qs.map((q, i) => ({ id: 'q' + i, label: q.label, required: !!q.required, long: !!q.long }))));
    await ix.deferReply({ ephemeral: true }); await openFor(ix, catId, {}, ctx);
  },
  async opensel(ix, _p, ctx) { return module.exports.open(ix, [ix.values[0]], ctx); },
  async qmodal(ix, [catId], ctx) {
    const cat = await prisma.ticketCategory.findFirst({ where: { id: catId, guildId: ix.guildId, active: true } }); if (!cat) return reply(ix, t(ctx.cfg, 'tickets.err.cat'));
    const answers = {}; (Array.isArray(cat.questions) ? cat.questions : []).slice(0, 5).forEach((_q, i) => { const v = (ix.fields.getTextInputValue('q' + i) || '').trim(); if (v) answers['q' + i] = v; });
    await ix.deferReply({ ephemeral: true }); await openFor(ix, catId, answers, ctx);
  },
  async claim(ix, [tid], { client }) {
    const g = await load(ix, tid, { mode: 'staff' }); if (!g) return;
    if (g.tk.claimedBy === ix.user.id) { await prisma.ticket.update({ where: { id: tid }, data: { claimedBy: null } }); await ix.deferUpdate(); await T.refreshMain(client, tid); return ix.channel.send({ content: t(g.cfg, 'tickets.unclaimed', { by: ix.user.id }) }); }
    const r = await prisma.ticket.updateMany({ where: { id: tid, claimedBy: null }, data: { claimedBy: ix.user.id } });
    if (!r.count) return reply(ix, t(g.cfg, 'tickets.alreadyClaimed', { by: g.tk.claimedBy }));
    await ix.deferUpdate(); await T.refreshMain(client, tid); await ix.channel.send({ content: t(g.cfg, 'tickets.claimed', { by: ix.user.id }), allowedMentions: { parse: [] } });
  },
  async transfer(ix, [tid]) {
    const g = await load(ix, tid, { mode: 'staff' }); if (!g) return; const cats = await prisma.ticketCategory.findMany({ where: { guildId: ix.guildId, active: true, id: { not: g.tk.categoryId || '' } }, take: 25, orderBy: { sortOrder: 'asc' } });
    const rows = [new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId(`tickets:assignsel:${tid}`).setPlaceholder(t(g.cfg, 'tickets.transfer.staff')))];
    if (cats.length) rows.unshift(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`tickets:transfersel:${tid}`).setPlaceholder(t(g.cfg, 'tickets.transfer.cat')).addOptions(cats.map((c) => ({ label: cut(c.name, 100), value: c.id, emoji: c.emoji || '🎫' })))));
    await ix.reply({ ephemeral: true, content: t(g.cfg, 'tickets.transfer.pick'), components: rows });
  },
  async transfersel(ix, [tid], { client }) {
    const g = await load(ix, tid, { mode: 'staff' }); if (!g) return; const cat = await prisma.ticketCategory.findFirst({ where: { id: ix.values[0], guildId: ix.guildId, active: true } }); if (!cat) return reply(ix, t(g.cfg, 'tickets.err.cat'));
    await ix.update({ content: '✅', components: [] }); await T.applyCategory(client, g.tk, cat, g.cfg); await T.refreshMain(client, tid);
    await ix.channel.send({ content: t(g.cfg, 'tickets.transferred', { category: cat.name, by: ix.user.id }), allowedMentions: { parse: [] } }); await ix.channel.send({ content: T.pings(g.cfg, cat), allowedMentions: { roles: T.roleIds(g.cfg, cat) } });
  },
  async assignsel(ix, [tid], { client }) {
    const g = await load(ix, tid, { mode: 'staff' }); if (!g) return; const m = await ix.guild.members.fetch(ix.values[0]).catch(() => null);
    if (!m || !(await T.isStaffFor(m, ix.guildId, g.cat))) return reply(ix, t(g.cfg, 'tickets.err.notStaffTarget'));
    await prisma.ticket.update({ where: { id: tid }, data: { claimedBy: m.id } }); await ix.update({ content: '✅', components: [] }); await T.refreshMain(client, tid);
    await ix.channel.send({ content: t(g.cfg, 'tickets.assigned', { to: m.id, by: ix.user.id }) });
  },
  async priority(ix, [tid]) {
    const g = await load(ix, tid, { mode: 'staff' }); if (!g) return;
    await ix.reply({ ephemeral: true, content: t(g.cfg, 'tickets.prio.pick'), components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`tickets:prisel:${tid}`).addOptions(T.PRIOS.map((p) => ({ label: t(g.cfg, `tickets.prio.${p}`).replace(/^\S+\s/, ''), value: p, default: p === g.tk.priority }))))] });
  },
  async prisel(ix, [tid], { client }) {
    const g = await load(ix, tid, { mode: 'staff' }); if (!g) return; const p = ix.values[0]; if (!T.PRIOS.includes(p)) return;
    await prisma.ticket.update({ where: { id: tid }, data: { priority: p } }); await ix.update({ content: '✅', components: [] }); await T.refreshMain(client, tid);
    await ix.channel.send({ content: t(g.cfg, 'tickets.prio.changed', { by: ix.user.id, priority: t(g.cfg, `tickets.prio.${p}`) }), allowedMentions: { parse: [] } });
  },
  async adduser(ix, [tid]) { const g = await load(ix, tid, { mode: 'staff' }); if (!g) return; await ix.showModal(mkModal(`tickets:addmodal:${tid}`, t(g.cfg, 'tickets.modal.add'), [{ id: 'v', label: t(g.cfg, 'tickets.modal.addLabel') }])); },
  async addmodal(ix, [tid]) {
    const g = await load(ix, tid, { mode: 'staff' }); if (!g) return; const uid = (/\d{15,25}/.exec(ix.fields.getTextInputValue('v')) || [])[0]; const m = uid && (await ix.guild.members.fetch(uid).catch(() => null)); if (!m) return reply(ix, t(g.cfg, 'tickets.err.user'));
    await ix.channel.permissionOverwrites.edit(m.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true }); await ix.reply({ content: t(g.cfg, 'tickets.added', { user: m.id }), allowedMentions: { users: [m.id] } });
  },
  async close(ix, [tid]) { const g = await load(ix, tid); if (!g) return; await ix.showModal(mkModal(`tickets:closemodal:${tid}`, t(g.cfg, 'tickets.modal.close'), [{ id: 'v', label: t(g.cfg, 'tickets.modal.closeReason'), long: true }])); },
  async closemodal(ix, [tid], { client }) {
    const g = await load(ix, tid); if (!g) return; const reason = ix.fields.getTextInputValue('v').trim(); await ix.deferReply({ ephemeral: true });
    const r = await T.closeTicket({ client }, tid, { by: ix.user.id, reason }); await prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action: 'tickets.close', details: { ticketId: tid, reason } } });
    await ix.editReply({ content: r.ok ? '✅' : t(g.cfg, 'tickets.err.closed') });
  },
  async reopen(ix, [tid], { client }) {
    const g = await load(ix, tid, { mode: 'staff', open: false }); if (!g) return; const r = await prisma.ticket.updateMany({ where: { id: tid, status: 'closed' }, data: { status: 'open', closedAt: null, closedBy: null, closeReason: null, rating: null, ratingComment: null, sla: {}, openedAt: new Date(), pausedMs: 0, pausedAt: null, firstResponseAt: null } });
    if (!r.count) return reply(ix, t(g.cfg, 'tickets.err.gone')); await ix.channel.permissionOverwrites.edit(g.tk.userId, { SendMessages: true }).catch(() => null); await ix.deferUpdate(); await T.refreshMain(client, tid);
    await ix.channel.send({ content: t(g.cfg, 'tickets.reopened', { by: ix.user.id }) });
  },
  async del(ix, [tid]) { const g = await load(ix, tid, { mode: 'staff', open: false }); if (!g) return; await ix.reply({ content: '🗑️' }); await prisma.ticket.update({ where: { id: tid }, data: { channelId: null } }); setTimeout(() => ix.channel.delete().catch(() => null), 2000); },
  // ---- knowledge base buttons ----
  async kbsolved(ix, [tid], { client }) {
    const g = await load(ix, tid); if (!g) return; const r = await prisma.ticket.updateMany({ where: { id: tid, kbResult: null }, data: { kbResult: 'solved' } }); if (!r.count) return reply(ix, '✅');
    if (g.tk.kbArticleId) await prisma.kbArticle.update({ where: { id: g.tk.kbArticleId }, data: { resolved: { increment: 1 } } }).catch(() => null);
    await ix.update({ components: [] }); await ix.channel.send({ content: t(g.cfg, 'tickets.kb.solved') }); await T.closeTicket({ client }, tid, { by: ix.user.id, reason: 'حُلّت عبر قاعدة المعرفة' });
  },
  async kbstaff(ix, [tid]) {
    const g = await load(ix, tid); if (!g) return; const r = await prisma.ticket.updateMany({ where: { id: tid, kbResult: null }, data: { kbResult: 'staff' } }); if (!r.count) return reply(ix, '✅');
    if (g.tk.kbArticleId) await prisma.kbArticle.update({ where: { id: g.tk.kbArticleId }, data: { escalated: { increment: 1 } } }).catch(() => null);
    await ix.update({ components: [] }); await ix.channel.send({ content: t(g.cfg, 'tickets.kb.staff', { roles: T.pings(g.cfg, g.cat) }), allowedMentions: { roles: T.roleIds(g.cfg, g.cat) } });
  },
  // ---- rating (works from channel and from DM) ----
  async rate(ix, [tid, n]) {
    const tk = await T.getTicket(tid); if (!tk) return reply(ix, '❌'); const cfg = await config.get(tk.guildId); if (tk.userId !== ix.user.id) return reply(ix, t(cfg, 'tickets.err.notYours'));
    const rating = Math.min(5, Math.max(1, Number(n) || 0)); const r = await prisma.ticket.updateMany({ where: { id: tid, rating: null }, data: { rating } }); if (!r.count) return reply(ix, t(cfg, 'tickets.rate.already'));
    await ix.update({ content: t(cfg, 'tickets.rate.thanks', { stars: '⭐'.repeat(rating) }), embeds: [], components: [new ActionRowBuilder().addComponents(T.btn(`tickets:ratecomment:${tid}`, t(cfg, 'tickets.btn.comment')))] });
  },
  async ratecomment(ix, [tid]) { const tk = await T.getTicket(tid); if (!tk || tk.userId !== ix.user.id) return; const cfg = await config.get(tk.guildId); await ix.showModal(mkModal(`tickets:ratemodal:${tid}`, t(cfg, 'tickets.modal.comment'), [{ id: 'v', label: t(cfg, 'tickets.modal.commentLabel'), long: true }])); },
  async ratemodal(ix, [tid]) { const tk = await T.getTicket(tid); if (!tk || tk.userId !== ix.user.id) return; await prisma.ticket.update({ where: { id: tid }, data: { ratingComment: ix.fields.getTextInputValue('v').trim().slice(0, 1000) } }); await reply(ix, '✅'); },
};
