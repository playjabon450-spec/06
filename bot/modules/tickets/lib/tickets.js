// Ticket core (DB + Discord). Reuses the store module's ticket engine for channels/transcripts.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits: P } = require('discord.js');
const prisma = require('../../../core/db'); const log = require('../../../core/logger'); const config = require('../../../core/config'); const perms = require('../../../core/perms'); const ai = require('../../../core/ai'); const { t } = require('../../../core/i18n');
const eng = require('../../store/lib/ticketEngine');
const PRIOS = ['low', 'normal', 'high', 'urgent']; const PCOL = { low: 0x2ecc71, normal: 0x3498db, high: 0xe67e22, urgent: 0xe74c3c };
const id = (a, ...p) => ['tickets', a, ...p].join(':'); const btn = (cid, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(cid).setLabel(label).setStyle(style);
const settingsOf = (cfg) => ({ maxOpen: 3, closeDeleteHours: 24, unclaimedMin: 15, kbEnabled: true, aiRouting: false, aiSummary: false, dmTranscript: true, ...(cfg.guild.settings?.tickets || {}) });
const roleIds = (cfg, cat) => [...new Set([...(cat?.staffRoleIds?.length ? cat.staffRoleIds : []), ...(cfg.guild.staffRoleIds || [])])];
const pings = (cfg, cat) => roleIds(cfg, cat).map((r) => `<@&${r}>`).join(' ');
async function isStaffFor(member, guildId, cat) { if (!member) return false; if (await perms.isStaff(member, guildId)) return true; return !!cat?.staffRoleIds?.some((r) => member.roles.cache.has(r)); }
async function nextNumber(guildId) { return (await prisma.ticketCounter.upsert({ where: { guildId }, create: { guildId, last: 1 }, update: { last: { increment: 1 } } })).last; }
const getTicket = (tid) => prisma.ticket.findUnique({ where: { id: tid } }); const getCat = (cid) => (cid ? prisma.ticketCategory.findUnique({ where: { id: cid } }) : null);
function mainPayload(cfg, tk, cat, owner) {
  const closed = tk.status === 'closed';
  const e = new EmbedBuilder().setColor(closed ? 0x95a5a6 : PCOL[tk.priority] || 0x3498db).setTitle(t(cfg, 'tickets.main.title', { number: tk.number, category: `${cat?.emoji || ''} ${cat?.name || '—'}`.trim() }))
    .addFields({ name: t(cfg, 'tickets.f.owner'), value: `<@${tk.userId}>`, inline: true }, { name: t(cfg, 'tickets.f.priority'), value: t(cfg, `tickets.prio.${tk.priority}`), inline: true },
      { name: t(cfg, 'tickets.f.claimed'), value: tk.claimedBy ? `<@${tk.claimedBy}>` : t(cfg, 'tickets.f.none'), inline: true }, { name: t(cfg, 'tickets.f.status'), value: t(cfg, closed ? 'tickets.f.closed' : 'tickets.f.open'), inline: true });
  const qs = Array.isArray(cat?.questions) ? cat.questions : []; const ans = tk.answers || {};
  qs.forEach((q, i) => { if (ans['q' + i]) e.addFields({ name: String(q.label).slice(0, 250), value: String(ans['q' + i]).slice(0, 1000) }); });
  if (cat?.greeting && !closed) e.setDescription(cat.greeting.replaceAll('{user}', `<@${tk.userId}>`).slice(0, 2000));
  const rows = closed ? [new ActionRowBuilder().addComponents(btn(id('reopen', tk.id), t(cfg, 'tickets.btn.reopen'), ButtonStyle.Success), btn(id('del', tk.id), t(cfg, 'tickets.btn.delete'), ButtonStyle.Danger))]
    : [new ActionRowBuilder().addComponents(btn(id('claim', tk.id), t(cfg, tk.claimedBy ? 'tickets.btn.unclaim' : 'tickets.btn.claim'), ButtonStyle.Success), btn(id('transfer', tk.id), t(cfg, 'tickets.btn.transfer')), btn(id('priority', tk.id), t(cfg, 'tickets.btn.priority')),
      btn(id('adduser', tk.id), t(cfg, 'tickets.btn.add')), btn(id('close', tk.id), t(cfg, 'tickets.btn.close'), ButtonStyle.Danger))];
  return { embeds: [e], components: rows };
}
async function refreshMain(client, tid) {
  try { const tk = await getTicket(tid); if (!tk?.channelId || !tk.messageId) return; const cfg = await config.get(tk.guildId); const ch = await client.channels.fetch(tk.channelId).catch(() => null); const msg = await ch?.messages.fetch(tk.messageId).catch(() => null);
    await msg?.edit({ content: '', ...mainPayload(cfg, tk, await getCat(tk.categoryId)) }).catch(() => null); } catch (e) { log.warn('tickets refreshMain', e.message); }
}
// answers: { q0: '...', ... }. Returns { channel, ticket } or { error }.
async function createTicket({ client }, cfg, guild, user, cat, answers = {}) {
  const s = settingsOf(cfg); const open = await prisma.ticket.count({ where: { guildId: guild.id, userId: user.id, status: 'open' } }); if (open >= s.maxOpen) return { error: t(cfg, 'tickets.err.limit', { n: open }) };
  let tk, channel;
  try {
    tk = await prisma.ticket.create({ data: { guildId: guild.id, number: await nextNumber(guild.id), categoryId: cat.id, userId: user.id, priority: PRIOS.includes(cat.defaultPriority) ? cat.defaultPriority : 'normal', answers } });
    channel = await eng.createPrivateChannel(guild, { name: `تذكرة-${tk.number}`, userId: user.id, staffRoleIds: roleIds(cfg, cat), parentId: cat.parentId || null, topic: `ticket:${tk.id}` });
  } catch (e) { log.warn('createTicket failed', e.message); if (tk) await prisma.ticket.delete({ where: { id: tk.id } }).catch(() => null); return { error: t(cfg, 'tickets.err.channel') }; }
  const msg = await channel.send({ content: `<@${user.id}> ${pings(cfg, cat)}`, allowedMentions: { users: [user.id], roles: roleIds(cfg, cat) }, ...mainPayload(cfg, tk, cat) });
  tk = await prisma.ticket.update({ where: { id: tk.id }, data: { channelId: channel.id, messageId: msg.id } }); return { channel, ticket: tk };
}
// Moves ticket to another category: permissions + parent + record. Never throws.
async function applyCategory(client, tk, newCat, cfg) {
  const old = await getCat(tk.categoryId); const ch = tk.channelId ? await client.channels.fetch(tk.channelId).catch(() => null) : null;
  try {
    if (ch) {
      const VIEW = { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true };
      for (const r of old?.staffRoleIds || []) if (!newCat.staffRoleIds.includes(r) && !(cfg.guild.staffRoleIds || []).includes(r)) await ch.permissionOverwrites.delete(r).catch(() => null);
      for (const r of roleIds(cfg, newCat)) await ch.permissionOverwrites.edit(r, VIEW).catch(() => null);
      if (newCat.parentId) await ch.setParent(newCat.parentId, { lockPermissions: false }).catch(() => null);
    }
    await prisma.ticket.update({ where: { id: tk.id }, data: { categoryId: newCat.id, sla: {} } });
  } catch (e) { log.warn('applyCategory', e.message); }
}
async function closeTicket({ client }, tid, { by, reason }) {
  const r = await prisma.ticket.updateMany({ where: { id: tid, status: 'open' }, data: { status: 'closed', closedAt: new Date(), closedBy: by, closeReason: String(reason || '—').slice(0, 300), pausedAt: null } }); if (!r.count) return { ok: false };
  const tk = await getTicket(tid); const cfg = await config.get(tk.guildId); const cat = await getCat(tk.categoryId); const s = settingsOf(cfg); const ch = tk.channelId ? await client.channels.fetch(tk.channelId).catch(() => null) : null;
  let html = ''; if (ch) { html = await eng.buildTranscript(ch, `تذكرة #${tk.number}`).catch(() => ''); await prisma.ticket.update({ where: { id: tid }, data: { transcript: html.slice(0, 450000) } }); }
  const ratingRow = new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map((n) => btn(id('rate', tid, String(n)), '⭐'.repeat(n))));
  if (ch) {
    await ch.permissionOverwrites.edit(tk.userId, { SendMessages: false }).catch(() => null);
    await ch.send({ content: `<@${tk.userId}>`, embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle(t(cfg, 'tickets.closed.title', { number: tk.number })).setDescription(t(cfg, 'tickets.closed.body', { by, reason: tk.closeReason, hours: s.closeDeleteHours })).addFields({ name: '\u200b', value: t(cfg, 'tickets.rate.prompt') })], components: [ratingRow] }).catch(() => null);
  }
  await refreshMain(client, tid);
  const logEmbed = new EmbedBuilder().setColor(0x95a5a6).setDescription(t(cfg, 'tickets.log.closed', { number: tk.number, category: cat?.name || '—', by, user: tk.userId, rating: '' }));
  if (html) await eng.logFile(client, tk.guildId, 'tickets', { embed: logEmbed, html }); else await log.channel(tk.guildId, 'tickets', logEmbed);
  if (s.dmTranscript && html) { try { const u = await client.users.fetch(tk.userId); const { AttachmentBuilder } = require('discord.js'); await u.send({ content: t(cfg, 'tickets.rate.dm', { number: tk.number }), files: [new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: `ticket-${tk.number}.html` })], components: [ratingRow] }); } catch { /* DMs closed */ } }
  if (s.aiSummary && ch) summarize(client, tk, cfg, ch).catch((e) => log.warn('summary failed', e.message));
  return { ok: true, ticket: tk };
}
// 3-line Arabic AI summary for staff (quota-limited; silently skipped when disabled/exhausted).
async function summarize(client, tk, cfg, ch) {
  const msgs = (await eng.fetchAll(ch, 200)).filter((m) => !m.author.bot && m.content).slice(-60).map((m) => `${m.author.id === tk.userId ? 'العميل' : 'الموظف'}: ${m.content}`).join('\n').slice(0, 6000); if (!msgs) return;
  const out = await ai.generate(tk.guildId, `لخّص محادثة الدعم التالية في 3 أسطر عربية قصيرة بالضبط (المشكلة، ما تم، النتيجة):\n${msgs}`, { maxTokens: 250 }); if (!out) return;
  await prisma.ticket.update({ where: { id: tk.id }, data: { summary: out.slice(0, 1500) } });
  await log.channel(tk.guildId, 'tickets', new EmbedBuilder().setColor(0x9b59b6).setTitle(t(cfg, 'tickets.summary.title', { number: tk.number })).setDescription(out.slice(0, 1500)));
}
module.exports = { PRIOS, id, btn, settingsOf, roleIds, pings, isStaffFor, getTicket, getCat, mainPayload, refreshMain, createTicket, applyCategory, closeTicket, summarize };
