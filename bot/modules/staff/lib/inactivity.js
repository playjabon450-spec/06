const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); const prisma = require('../../../core/db'); const log = require('../../../core/logger'); const { claim } = require('../../../core/guard'); const { t } = require('../../../core/i18n');
const stats = require('./stats'); const R = require('./report');
// Once a day per guild: alerts the owner (DM, fallback staff channel) per inactive staff member, max once/7 days each, max 10 per run.
async function run({ client }, guild, cfg) {
  const s = R.of(cfg).inactivity; const staffIds = new Set(cfg.guild.staffRoleIds || []); if (!staffIds.size) return 0;
  const members = await guild.members.fetch().catch(() => null); if (!members) return 0; const now = Date.now(); const week = Math.floor(now / (7 * 86400000)); let sent = 0;
  const ign = new Set((await prisma.staffIgnore.findMany({ where: { guildId: guild.id, until: { gt: new Date() } } })).map((x) => x.userId));
  for (const m of members.values()) {
    if (sent >= 10) break; if (m.user.bot || m.id === guild.ownerId || ign.has(m.id) || !m.roles.cache.some((r) => staffIds.has(r.id))) continue; if (m.joinedTimestamp && now - m.joinedTimestamp < s.days * 86400000) continue;
    const last = await stats.lastActive(prisma, guild.id, m.id); if (last && now - +last < s.days * 86400000) continue; if (!(await claim(prisma, `staff-inact:${guild.id}:${m.id}:${week}`))) continue;
    const days = last ? Math.floor((now - +last) / 86400000) : s.days; const e = new EmbedBuilder().setColor(0xe67e22).setTitle(t(cfg, 'staff.inactive.title'))
      .setDescription(t(cfg, 'staff.inactive.body', { user: m.id, days, last: last ? t(cfg, 'staff.inactive.last', { date: last.toLocaleDateString('ar-EG') }) : t(cfg, 'staff.inactive.never') }));
    const payload = { embeds: [e], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`staff:ignore:${guild.id}:${m.id}`).setLabel(t(cfg, 'staff.btn.ignore')).setStyle(ButtonStyle.Secondary))] };
    let ok = false; try { const owner = await guild.fetchOwner(); await owner.send(payload); ok = true; } catch { /* DMs closed */ }
    if (!ok) { const ch = await R.channelFor(client, cfg); if (ch) await ch.send({ content: `<@${guild.ownerId}>`, allowedMentions: { users: [guild.ownerId] }, ...payload }).catch(() => null); }
    sent++;
  }
  return sent;
}
module.exports = { run };
