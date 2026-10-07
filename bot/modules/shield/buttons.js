const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const prisma = require('../../core/db'); const perms = require('../../core/perms'); const log = require('../../core/logger'); const { reply } = require('../../core/guard'); const { t } = require('../../core/i18n');
const A = require('./lib/actions'); const D = require('./lib/dossier'); const AP = require('./lib/appeals');
async function staff(ix, cfg) { if (await perms.isStaff(ix.member, ix.guildId)) return true; await reply(ix, t(cfg, 'shield.err.staff')); return false; }
const modal = (id, title, label) => new ModalBuilder().setCustomId(id).setTitle(title).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v').setLabel(label).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)));
const disable = (ix) => ix.message?.edit({ components: [] }).catch(() => null);
const audit = (ix, action, details) => prisma.auditLog.create({ data: { guildId: ix.guildId, userId: ix.user.id, action, details } }).catch(() => null);
module.exports = {
  async restore(ix, [qid], { cfg }) {
    if (!(await staff(ix, cfg))) return; const q = await prisma.shieldQuarantine.findFirst({ where: { id: qid, guildId: ix.guildId } }); if (!q || q.releasedAt) return reply(ix, t(cfg, 'shield.err.gone'));
    if (!(await A.release(ix.guild, q, ix.user.id))) return reply(ix, t(cfg, 'shield.err.gone')); await audit(ix, 'shield.restore', { target: q.userId }); await ix.update({ components: [] }).catch(() => null);
    await ix.followUp({ content: t(cfg, 'shield.restored', { user: q.userId, by: ix.user.id }), allowedMentions: { parse: [] } }).catch(() => null);
  },
  async kick(ix, [uid], { cfg }) {
    if (!(await staff(ix, cfg))) return; const m = await ix.guild.members.fetch(uid).catch(() => null); if (!m?.kickable) return reply(ix, t(cfg, 'shield.err.perm'));
    await m.kick(`shield: ${ix.user.tag}`); await audit(ix, 'shield.kick', { target: uid }); await disable(ix); await reply(ix, t(cfg, 'shield.kicked', { user: uid, by: ix.user.id }));
  },
  async ban(ix, [uid], { cfg }) {
    if (!(await staff(ix, cfg))) return; const m = await ix.guild.members.fetch(uid).catch(() => null); if (m && !m.bannable) return reply(ix, t(cfg, 'shield.err.perm'));
    try { await ix.guild.members.ban(uid, { reason: `shield: ${ix.user.tag}`, deleteMessageSeconds: 3600 }); } catch { return reply(ix, t(cfg, 'shield.err.perm')); }
    await audit(ix, 'shield.ban', { target: uid }); await disable(ix); await reply(ix, t(cfg, 'shield.banned', { user: uid, by: ix.user.id }));
  },
  async dossier(ix, [uid], { cfg }) {
    if (!(await staff(ix, cfg))) return; const e = await D.embed(cfg, ix.guild, uid); await ix.reply({ ephemeral: true, embeds: [e], components: [new ActionRowBuilder().addComponents(A.btn(`shield:note:${uid}`, t(cfg, 'shield.btn.note')))] });
  },
  async note(ix, [uid], { cfg }) { if (!(await staff(ix, cfg))) return; await ix.showModal(modal(`shield:notemodal:${uid}`, t(cfg, 'shield.modal.note'), t(cfg, 'shield.modal.noteLabel'))); },
  async notemodal(ix, [uid], { cfg }) { if (!(await staff(ix, cfg))) return; await prisma.memberNote.create({ data: { guildId: ix.guildId, userId: uid, authorId: ix.user.id, text: ix.fields.getTextInputValue('v').trim().slice(0, 500) } }); await audit(ix, 'shield.note', { target: uid }); await reply(ix, t(cfg, 'shield.note.saved')); },
  async endraid(ix, _p, { cfg }) {
    if (!(await staff(ix, cfg))) return; const ok = await A.endRaid(ix.guild, ix.user.id); await ix.update({ components: [] }).catch(() => null); if (!ok) await ix.followUp({ ephemeral: true, content: t(cfg, 'shield.raid.none') }).catch(() => null);
  },
  async appealaccept(ix, [id], { client, cfg }) { if (!(await staff(ix, cfg))) return; await ix.deferUpdate().catch(() => null); const r = await AP.decide({ client }, id, 'accepted', '', ix.user.id); if (!r.ok) await ix.followUp({ ephemeral: true, content: t(cfg, 'shield.err.gone') }).catch(() => null); },
  async appealreject(ix, [id], { cfg }) { if (!(await staff(ix, cfg))) return; await ix.showModal(modal(`shield:appealrejectmodal:${id}`, t(cfg, 'shield.modal.reject'), t(cfg, 'shield.modal.reason'))); },
  async appealrejectmodal(ix, [id], { client, cfg }) { if (!(await staff(ix, cfg))) return; await ix.deferReply({ ephemeral: true }); const r = await AP.decide({ client }, id, 'rejected', ix.fields.getTextInputValue('v').trim(), ix.user.id); await ix.editReply({ content: r.ok ? '✅' : t(cfg, 'shield.err.gone') }); },
};
