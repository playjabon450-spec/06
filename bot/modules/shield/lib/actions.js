const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits: P } = require('discord.js');
const prisma = require('../../../core/db'); const log = require('../../../core/logger'); const { t } = require('../../../core/i18n'); const S = require('./settings');
const btn = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
// Every shield action: DB incident + AuditLog + shield log channel.
async function record(client, guildId, { userId, kind, score = 0, action, details = {}, embed, by = 'system', components = [] }) {
  const inc = await prisma.shieldIncident.create({ data: { guildId, userId, kind, score, action, details } }).catch((e) => { log.warn('incident save failed', e.message); return null; });
  await prisma.auditLog.create({ data: { guildId, userId: by, action: `shield.${kind}`, details: { target: userId, action, score, ...details } } }).catch(() => null);
  if (embed) { const cfg = await require('../../../core/config').get(guildId); const lc = cfg.guild.settings?.logChannels || {}; const id = lc.shield || lc.general; const ch = id && (await client.channels.fetch(id).catch(() => null));
    if (ch?.isTextBased()) await ch.send({ embeds: [embed], components }).catch(() => null); else await log.channel(guildId, 'shield', embed); }
  return inc;
}
const alertRow = (cfg, uid, qid) => new ActionRowBuilder().addComponents(...(qid ? [btn(`shield:restore:${qid}`, t(cfg, 'shield.btn.restore'), ButtonStyle.Success)] : []), btn(`shield:kick:${uid}`, t(cfg, 'shield.btn.kick')), btn(`shield:ban:${uid}`, t(cfg, 'shield.btn.ban'), ButtonStyle.Danger), btn(`shield:dossier:${uid}`, t(cfg, 'shield.btn.dossier'), ButtonStyle.Primary));
// Quarantine: remember roles, strip them, assign quarantine role (or 28-day timeout when none configured).
async function quarantine(guild, member, cfg, incidentId) {
  const sh = S.of(cfg).compromised; const keep = member.roles.cache.filter((r) => r.id !== guild.id).map((r) => ({ id: r.id, managed: r.managed }));
  const q = await prisma.shieldQuarantine.create({ data: { guildId: guild.id, userId: member.id, roleIds: keep.filter((r) => !r.managed).map((r) => r.id), incidentId } });
  try { if (sh.quarantineRoleId && guild.roles.cache.has(sh.quarantineRoleId)) await member.roles.set([...keep.filter((r) => r.managed).map((r) => r.id), sh.quarantineRoleId], 'shield quarantine'); else await member.timeout(28 * 86400000, 'shield quarantine'); }
  catch (e) { log.warn('quarantine failed', e.message); try { await member.timeout(28 * 86400000, 'shield quarantine'); } catch { /* no permission */ } }
  return q;
}
async function release(guild, q, by) {
  const r = await prisma.shieldQuarantine.updateMany({ where: { id: q.id, releasedAt: null }, data: { releasedAt: new Date(), releasedBy: by } }); if (!r.count) return false;
  const cfg = await require('../../../core/config').get(guild.id); const qr = S.of(cfg).compromised.quarantineRoleId; const m = await guild.members.fetch(q.userId).catch(() => null);
  if (m) { if (qr && m.roles.cache.has(qr)) await m.roles.remove(qr).catch(() => null); const back = q.roleIds.filter((id) => guild.roles.cache.has(id)); if (back.length) await m.roles.add(back, 'shield restore').catch(() => null); await m.timeout(null).catch(() => null); }
  return true;
}
async function lockdown(guild, channelIds) {
  const prev = {}; for (const id of channelIds) { const ch = guild.channels.cache.get(id); if (!ch?.permissionOverwrites) continue; const ow = ch.permissionOverwrites.cache.get(guild.roles.everyone.id);
    prev[id] = ow?.deny.has(P.SendMessages) ? 'deny' : ow?.allow.has(P.SendMessages) ? 'allow' : null; await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: 'shield raid lockdown' }).catch(() => delete prev[id]); }
  await prisma.shieldLockdown.upsert({ where: { guildId: guild.id }, create: { guildId: guild.id, channels: prev }, update: { channels: prev, startedAt: new Date() } }); return Object.keys(prev).length;
}
async function endRaid(guild, by) {
  const l = await prisma.shieldLockdown.findUnique({ where: { guildId: guild.id } }); if (!l) return false; const del = await prisma.shieldLockdown.deleteMany({ where: { guildId: guild.id } }); if (!del.count) return false;
  for (const [id, prev] of Object.entries(l.channels || {})) { const ch = guild.channels.cache.get(id); await ch?.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: prev === 'deny' ? false : prev === 'allow' ? true : null }, { reason: 'shield raid ended' }).catch(() => null); }
  const cfg = await require('../../../core/config').get(guild.id); await record(guild.client, guild.id, { userId: by, kind: 'raid', action: 'ended', by, embed: new EmbedBuilder().setColor(0x2ecc71).setDescription(t(cfg, 'shield.raid.ended', { by: String(by).startsWith('system') ? 'system' : `<@${by}>` })) }); return true;
}
module.exports = { record, quarantine, release, lockdown, endRaid, alertRow, btn };
