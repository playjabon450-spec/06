const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits: P } = require('discord.js');
const prisma = require('../../core/db'); const perms = require('../../core/perms'); const config = require('../../core/config'); const { reply } = require('../../core/guard'); const { t } = require('../../core/i18n');
const APP = require('./lib/applications'); const A = require('./lib/apps'); const state = new Map(); // `${guild}:${user}:${form}` -> { answers, exp }
const key = (ix, formId) => `${ix.guildId}:${ix.user.id}:${formId}`; const gc = () => { for (const [k, v] of state) if (v.exp < Date.now()) state.delete(k); };
const staff = async (ix, cfg) => { if (await perms.isStaff(ix.member, ix.guildId)) return true; await reply(ix, t(cfg, 'staff.err.staff')); return false; };
const loadApp = async (ix, id) => { const app = await prisma.application.findFirst({ where: { id, guildId: ix.guildId } }); const form = app && (await prisma.applicationForm.findUnique({ where: { id: app.formId } })); return { app, form }; };
async function submit(ix, cfg, form, answers) {
  const app = await prisma.application.create({ data: { guildId: ix.guildId, formId: form.id, userId: ix.user.id, answers } }); const a = require('./lib/report').of(cfg).applications; const lc = cfg.guild.settings?.logChannels || {};
  const id = a.reviewChannelId || lc.staff || lc.general; const ch = id && (await ix.client.channels.fetch(id).catch(() => null));
  if (ch?.isTextBased()) { const m = await ch.send({ content: (cfg.guild.staffRoleIds || []).map((r) => `<@&${r}>`).join(' '), allowedMentions: { roles: cfg.guild.staffRoleIds || [] }, ...(await APP.card(cfg, app, form)) }).catch(() => null); if (m) await prisma.application.update({ where: { id: app.id }, data: { channelId: ch.id, messageId: m.id } }); }
  await prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action: 'staff.application.submit', details: { applicationId: app.id, formId: form.id } } }).catch(() => null);
}
const modal = (id, title, label) => new ModalBuilder().setCustomId(id).setTitle(title).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v').setLabel(label).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(400)));
module.exports = {
  async apply(ix, [formId], { cfg }) {
    const form = await prisma.applicationForm.findFirst({ where: { id: formId, guildId: ix.guildId, active: true } }); if (!form) return reply(ix, t(cfg, 'staff.apply.err.closed')); if (!APP.qsOf(form).length) return reply(ix, t(cfg, 'staff.apply.err.empty'));
    if (await prisma.application.findFirst({ where: { guildId: ix.guildId, userId: ix.user.id, status: 'pending' } })) return reply(ix, t(cfg, 'staff.apply.err.pending'));
    const rej = await prisma.application.findFirst({ where: { guildId: ix.guildId, userId: ix.user.id, status: 'rejected' }, orderBy: { decidedAt: 'desc' } }); const until = A.cooldownUntil(rej?.decidedAt, form.cooldownDays); if (until) return reply(ix, t(cfg, 'staff.apply.err.cooldown', { date: until.toLocaleDateString('ar-EG') }));
    gc(); state.set(key(ix, formId), { answers: [], exp: Date.now() + 15 * 60000 }); await ix.showModal(APP.modalFor(cfg, form, 0));
  },
  // Modal chunk submit. Discord allows 5 inputs per modal, so long forms continue via the "التالي" button.
  async amodal(ix, [formId, idx], { cfg }) {
    const i = Number(idx) || 0; const form = await prisma.applicationForm.findFirst({ where: { id: formId, guildId: ix.guildId, active: true } }); const st = state.get(key(ix, formId)); if (!form || !st || st.exp < Date.now()) return reply(ix, t(cfg, 'staff.apply.err.expired'));
    const qs = APP.qsOf(form); const chunks = A.chunk(qs); const out = [];
    for (const [j, q] of chunks[i].entries()) { const v = A.validateAnswer(q, ix.fields.getTextInputValue('q' + (i * 5 + j))); if (v.error) { state.delete(key(ix, formId)); return reply(ix, `❌ ${v.error}`); } out.push({ q: q.label, a: v.value }); }
    st.answers = [...st.answers.slice(0, i * 5), ...out]; st.exp = Date.now() + 15 * 60000;
    if (i + 1 < chunks.length) return ix.reply({ ephemeral: true, content: t(cfg, 'staff.apply.next', { n: i + 1, total: chunks.length }), components: [new ActionRowBuilder().addComponents(APP.btn(`staff:anext:${formId}:${i + 1}`, t(cfg, 'staff.btn.next')))] });
    if (await prisma.application.findFirst({ where: { guildId: ix.guildId, userId: ix.user.id, status: 'pending' } })) return reply(ix, t(cfg, 'staff.apply.err.pending')); // double-submit guard
    state.delete(key(ix, formId)); await submit(ix, cfg, form, st.answers); await reply(ix, t(cfg, 'staff.apply.sent'));
  },
  async anext(ix, [formId, idx], { cfg }) {
    const form = await prisma.applicationForm.findFirst({ where: { id: formId, guildId: ix.guildId, active: true } }); const st = state.get(key(ix, formId)); if (!form || !st || st.exp < Date.now()) return reply(ix, t(cfg, 'staff.apply.err.expired')); await ix.showModal(APP.modalFor(cfg, form, Number(idx) || 0));
  },
  async vote(ix, [id, v], { cfg }) {
    if (!(await staff(ix, cfg))) return; if (!['up', 'down', 'neutral'].includes(v)) return; const { app, form } = await loadApp(ix, id); if (!app || app.status !== 'pending') return reply(ix, t(cfg, 'staff.err.gone')); if (app.userId === ix.user.id) return reply(ix, t(cfg, 'staff.err.self'));
    await prisma.applicationVote.upsert({ where: { applicationId_userId: { applicationId: id, userId: ix.user.id } }, create: { applicationId: id, userId: ix.user.id, vote: v }, update: { vote: v } }); await ix.update(await APP.card(cfg, app, form));
  },
  async appaccept(ix, [id], { client, cfg }) {
    if (!(await staff(ix, cfg))) return; const { app, form } = await loadApp(ix, id); if (!app || app.status !== 'pending') return reply(ix, t(cfg, 'staff.err.gone'));
    const g = A.canDecide(await prisma.applicationVote.findMany({ where: { applicationId: id } }), form?.minVotes); if (!g.ok) return reply(ix, t(cfg, 'staff.err.votes', { needed: g.needed }));
    await ix.deferUpdate().catch(() => null); const r = await APP.decide({ client }, cfg, app, form, 'accepted', '', ix.user.id); if (!r.ok) return ix.followUp({ ephemeral: true, content: t(cfg, 'staff.err.gone') }).catch(() => null); await ix.followUp({ content: r.text, allowedMentions: { parse: [] } }).catch(() => null);
  },
  async appreject(ix, [id], { cfg }) {
    if (!(await staff(ix, cfg))) return; const { app, form } = await loadApp(ix, id); if (!app || app.status !== 'pending') return reply(ix, t(cfg, 'staff.err.gone'));
    const g = A.canDecide(await prisma.applicationVote.findMany({ where: { applicationId: id } }), form?.minVotes); if (!g.ok) return reply(ix, t(cfg, 'staff.err.votes', { needed: g.needed }));
    await ix.showModal(modal(`staff:apprejectmodal:${id}`, t(cfg, 'staff.modal.reject'), t(cfg, 'staff.modal.reason')));
  },
  async apprejectmodal(ix, [id], { client, cfg }) {
    if (!(await staff(ix, cfg))) return; const { app, form } = await loadApp(ix, id); if (!app || app.status !== 'pending') return reply(ix, t(cfg, 'staff.err.gone'));
    const g = A.canDecide(await prisma.applicationVote.findMany({ where: { applicationId: id } }), form?.minVotes); if (!g.ok) return reply(ix, t(cfg, 'staff.err.votes', { needed: g.needed }));
    await ix.deferReply({ ephemeral: true }); const r = await APP.decide({ client }, cfg, app, form, 'rejected', ix.fields.getTextInputValue('v').trim(), ix.user.id); await ix.editReply({ content: r.ok ? '✅' : t(cfg, 'staff.err.gone') });
    if (r.ok) await ix.channel?.send({ content: r.text, allowedMentions: { parse: [] } }).catch(() => null);
  },
  // Inactivity alert "تجاهل" (works in the owner's DM too, so guild id is in the custom_id).
  async ignore(ix, [guildId, userId], { client }) {
    const guild = await client.guilds.fetch(guildId).catch(() => null); const cfg = await config.get(guildId); if (!guild || (ix.user.id !== guild.ownerId && !ix.member?.permissions?.has(P.Administrator))) return reply(ix, t(cfg, 'staff.err.owner'));
    await prisma.staffIgnore.upsert({ where: { guildId_userId: { guildId, userId } }, create: { guildId, userId, until: new Date(Date.now() + 30 * 86400000) }, update: { until: new Date(Date.now() + 30 * 86400000) } });
    await prisma.auditLog.create({ data: { guildId, userId: ix.user.id, action: 'staff.inactivity.ignore', details: { target: userId } } }).catch(() => null);
    await ix.update({ components: [], content: t(cfg, 'staff.ignored', { user: userId }) }).catch(() => reply(ix, t(cfg, 'staff.ignored', { user: userId })));
  },
};
