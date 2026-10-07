const { EmbedBuilder } = require('discord.js'); const prisma = require('../../../core/db'); const { t } = require('../../../core/i18n');
const ts = (d) => `<t:${Math.floor(+d / 1000)}:R>`;
async function embed(cfg, guild, userId) {
  const gid = guild.id; const [member, incidents, notes, orders, tickets, appeals] = await Promise.all([guild.members.fetch(userId).catch(() => null),
    prisma.shieldIncident.findMany({ where: { guildId: gid, userId }, orderBy: { createdAt: 'desc' }, take: 5 }), prisma.memberNote.findMany({ where: { guildId: gid, userId }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.order.findMany({ where: { guildId: gid, userId, status: { in: ['paid', 'delivered'] } }, select: { total: true } }), prisma.ticket.count({ where: { guildId: gid, userId } }), prisma.banAppeal.count({ where: { guildId: gid, userId } })]);
  const user = member?.user || (await guild.client.users.fetch(userId).catch(() => null)); const none = t(cfg, 'shield.dossier.none');
  const e = new EmbedBuilder().setColor(0x3498db).setTitle(`${t(cfg, 'shield.dossier.title')} — ${user?.username || userId}`).setThumbnail(user?.displayAvatarURL?.() || null)
    .addFields({ name: t(cfg, 'shield.dossier.joined'), value: member?.joinedAt ? ts(member.joinedAt) : t(cfg, 'shield.dossier.left'), inline: true }, { name: t(cfg, 'shield.dossier.created'), value: user ? ts(user.createdAt) : '—', inline: true },
      { name: t(cfg, 'shield.dossier.orders'), value: `${orders.length} (${orders.reduce((a, o) => a + o.total, 0)})`, inline: true }, { name: t(cfg, 'shield.dossier.tickets'), value: String(tickets), inline: true }, { name: t(cfg, 'shield.dossier.appeals'), value: String(appeals), inline: true },
      { name: t(cfg, 'shield.dossier.incidents'), value: incidents.map((i) => `• ${i.kind} — ${i.action} ${ts(i.createdAt)}`).join('\n') || none }, { name: t(cfg, 'shield.dossier.notes'), value: notes.map((n) => `• ${n.text.slice(0, 120)} (<@${n.authorId}>)`).join('\n') || none });
  return e;
}
module.exports = { embed };
