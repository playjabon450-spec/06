const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js'); const prisma = require('../../../core/db'); const { t } = require('../../../core/i18n'); const A = require('./apps');
const btn = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style); const cut = (s, n) => String(s).slice(0, n);
const qsOf = (form) => (Array.isArray(form.questions) ? form.questions : []).slice(0, 25);
function modalFor(cfg, form, idx) {
  const qs = qsOf(form); const chunks = A.chunk(qs); const m = new ModalBuilder().setCustomId(`staff:amodal:${form.id}:${idx}`).setTitle(cut(t(cfg, 'staff.apply.modal', { name: form.name, n: idx + 1, total: chunks.length }), 45));
  chunks[idx].forEach((q, i) => m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q' + (idx * 5 + i)).setLabel(cut(q.label, 45)).setRequired(q.required !== false).setStyle(q.type === 'long' ? TextInputStyle.Paragraph : TextInputStyle.Short).setMaxLength(q.type === 'long' ? 1000 : 300).setPlaceholder(cut(q.type === 'select' ? (q.options || []).join(' / ') : ' ', 100) || ' ')))); return m;
}
// Staff review card with live vote counts.
async function card(cfg, app, form) {
  const votes = await prisma.applicationVote.findMany({ where: { applicationId: app.id } }); const tl = A.tally(votes); const done = app.status !== 'pending';
  const e = new EmbedBuilder().setColor(app.status === 'accepted' ? 0x2ecc71 : app.status === 'rejected' ? 0xe74c3c : 0xf1c40f).setTitle(t(cfg, 'staff.card.title', { form: form?.name || '—' })).setDescription(`<@${app.userId}>`)
    .addFields(...(Array.isArray(app.answers) ? app.answers : []).slice(0, 20).map((x) => ({ name: cut(x.q, 250), value: cut(x.a || '—', 1000) })), { name: t(cfg, 'staff.card.votes'), value: t(cfg, 'staff.card.votesBody', { ...tl, min: form?.minVotes || 0 }) });
  if (done) e.setFooter({ text: t(cfg, 'staff.card.decided', { status: t(cfg, `staff.card.${app.status}`), by: app.reviewedBy || '' }).replace(/<@(\d+)>/, '$1') });
  const rows = done ? [] : [new ActionRowBuilder().addComponents(btn(`staff:vote:${app.id}:up`, t(cfg, 'staff.btn.up'), ButtonStyle.Success), btn(`staff:vote:${app.id}:down`, t(cfg, 'staff.btn.down'), ButtonStyle.Danger), btn(`staff:vote:${app.id}:neutral`, t(cfg, 'staff.btn.neutral'))),
    new ActionRowBuilder().addComponents(btn(`staff:appaccept:${app.id}`, t(cfg, 'staff.btn.accept'), ButtonStyle.Success), btn(`staff:appreject:${app.id}`, t(cfg, 'staff.btn.reject'), ButtonStyle.Danger))];
  return { embeds: [e], components: rows, allowedMentions: { parse: [] } };
}
// Atomic decision (pending -> accepted/rejected): grants role on accept, DMs the user, refreshes the card.
async function decide({ client }, cfg, app, form, decision, reason, by) {
  const r = await prisma.application.updateMany({ where: { id: app.id, status: 'pending' }, data: { status: decision, reviewedBy: by, reviewReason: reason ? cut(reason, 300) : null, decidedAt: new Date() } }); if (!r.count) return { ok: false };
  const fresh = await prisma.application.findUnique({ where: { id: app.id } }); const guild = await client.guilds.fetch(app.guildId).catch(() => null); let roleOk = true;
  if (decision === 'accepted' && form?.roleId && guild) { const m = await guild.members.fetch(app.userId).catch(() => null); roleOk = !!(m && (await m.roles.add(form.roleId, 'application accepted').then(() => true).catch(() => false))); }
  try { const u = await client.users.fetch(app.userId); await u.send(decision === 'accepted' ? t(cfg, 'staff.dm.accepted', { guild: guild?.name || '', form: form?.name || '', role: form?.roleId && roleOk ? t(cfg, 'staff.dm.role') : '' }) : t(cfg, 'staff.dm.rejected', { guild: guild?.name || '', form: form?.name || '', reason: reason || '—', days: form?.cooldownDays || 0 })); } catch { /* DMs closed */ }
  if (fresh.channelId && fresh.messageId) { const ch = await client.channels.fetch(fresh.channelId).catch(() => null); const msg = await ch?.messages.fetch(fresh.messageId).catch(() => null); await msg?.edit(await card(cfg, fresh, form)).catch(() => null); }
  await prisma.auditLog.create({ data: { guildId: app.guildId, userId: by, action: `staff.application.${decision}`, details: { applicationId: app.id, target: app.userId, reason: reason || null } } }).catch(() => null);
  return { ok: true, roleOk, text: decision === 'accepted' ? t(cfg, 'staff.decision.accepted', { user: app.userId, form: form?.name || '', by }) + (roleOk ? '' : '\n' + t(cfg, 'staff.decision.roleFail')) : t(cfg, 'staff.decision.rejected', { user: app.userId, form: form?.name || '', by, reason: reason || '—' }) };
}
module.exports = { qsOf, modalFor, card, decide, btn };
