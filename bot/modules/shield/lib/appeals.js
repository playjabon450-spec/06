const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../../../core/db'); const log = require('../../../core/logger'); const config = require('../../../core/config'); const { t } = require('../../../core/i18n'); const A = require('./actions');
const dm = async (client, uid, text) => { try { await (await client.users.fetch(uid)).send(text); return true; } catch { return false; } };
const card = (cfg, a, status) => { const ans = a.answers || {}; const e = new EmbedBuilder().setColor(status === 'accepted' ? 0x2ecc71 : status === 'rejected' ? 0xe74c3c : 0xf1c40f).setTitle(t(cfg, 'shield.appeal.title')).setDescription(`<@${a.userId}> (${a.username || a.userId})`)
  .addFields({ name: t(cfg, 'shield.appeal.q1'), value: String(ans.whyBanned || '—').slice(0, 1000) }, { name: t(cfg, 'shield.appeal.q2'), value: String(ans.whyUnban || '—').slice(0, 1000) }, ...(ans.extra ? [{ name: t(cfg, 'shield.appeal.q3'), value: String(ans.extra).slice(0, 1000) }] : []));
  const rows = status === 'pending' ? [new ActionRowBuilder().addComponents(A.btn(`shield:appealaccept:${a.id}`, t(cfg, 'shield.btn.accept'), ButtonStyle.Success), A.btn(`shield:appealreject:${a.id}`, t(cfg, 'shield.btn.reject'), ButtonStyle.Danger))] : []; return { embeds: [e], components: rows }; };
// Posts the staff review card in the staff log channel.
async function post({ client }, cfg, a) {
  const lc = cfg.guild.settings?.logChannels || {}; const id = lc.staff || lc.general; const ch = id && (await client.channels.fetch(id).catch(() => null)); if (!ch?.isTextBased()) return false;
  const m = await ch.send({ content: (cfg.guild.staffRoleIds || []).map((r) => `<@&${r}>`).join(' '), allowedMentions: { roles: cfg.guild.staffRoleIds || [] }, ...card(cfg, a, 'pending') }).catch(() => null); if (!m) return false;
  await prisma.banAppeal.update({ where: { id: a.id }, data: { channelId: ch.id, messageId: m.id } }); return true;
}
// Atomic decision (pending -> accepted/rejected). Used by the staff-channel buttons AND the dashboard (job). Returns { ok, appeal }.
async function decide({ client }, id, decision, reason, by) {
  const r = await prisma.banAppeal.updateMany({ where: { id, status: 'pending' }, data: { status: decision, reviewedBy: by, reviewReason: String(reason || '').slice(0, 300) || null, decidedAt: new Date() } }); if (!r.count) return { ok: false };
  const a = await prisma.banAppeal.findUnique({ where: { id } }); const cfg = await config.get(a.guildId); const guild = await client.guilds.fetch(a.guildId).catch(() => null); let unbanned = false;
  if (decision === 'accepted' && guild) { try { await guild.members.unban(a.userId, `appeal accepted by ${by}`); unbanned = true; } catch (e) { log.warn('unban failed', e.message); } }
  const sent = await dm(client, a.userId, decision === 'accepted' ? t(cfg, 'shield.appeal.dmAccepted', { guild: guild?.name || '' }) : t(cfg, 'shield.appeal.dmRejected', { guild: guild?.name || '', reason: reason || '—' }));
  if (a.channelId && a.messageId) { const ch = await client.channels.fetch(a.channelId).catch(() => null); const msg = await ch?.messages.fetch(a.messageId).catch(() => null); await msg?.edit({ content: '', ...card(cfg, a, decision) }).catch(() => null); }
  const text = decision === 'accepted' ? t(cfg, 'shield.appeal.accepted', { user: a.userId, by }) : t(cfg, 'shield.appeal.rejected', { user: a.userId, by, reason: reason || '—' });
  await A.record(client, a.guildId, { userId: a.userId, kind: 'appeal', action: decision, by, details: { appealId: id, unbanned, dm: sent }, embed: new EmbedBuilder().setColor(decision === 'accepted' ? 0x2ecc71 : 0xe74c3c).setDescription(text) });
  return { ok: true, appeal: a, unbanned, dm: sent };
}
module.exports = { post, decide, card };
