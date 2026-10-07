// Reusable private-ticket engine (used by store orders now, support tickets in Step 4).
const { ChannelType, PermissionFlagsBits: P, AttachmentBuilder } = require('discord.js');
const config = require('../../../core/config'); const log = require('../../../core/logger');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const VIEW = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];
// Creates a text channel visible only to the user, the staff roles and the bot.
async function createPrivateChannel(guild, { name, userId, staffRoleIds = [], parentId = null, topic = '' }) {
  const me = guild.members.me?.id || guild.client.user.id;
  const overwrites = [{ id: guild.roles.everyone.id, deny: [P.ViewChannel] }, { id: userId, allow: VIEW }, { id: me, allow: [...VIEW, P.ManageChannels, P.ManageMessages] },
    ...staffRoleIds.filter((r) => guild.roles.cache.has(r)).map((id) => ({ id, allow: [...VIEW, P.ManageMessages] }))];
  const opts = { name: name.slice(0, 90), type: ChannelType.GuildText, topic: topic.slice(0, 1000), permissionOverwrites: overwrites };
  if (parentId && guild.channels.cache.get(parentId)?.type === ChannelType.GuildCategory) opts.parent = parentId;
  return guild.channels.create(opts);
}
async function fetchAll(channel, max = 1000) {
  const out = []; let before;
  while (out.length < max) { const b = await channel.messages.fetch({ limit: 100, before }).catch(() => null); if (!b?.size) break; out.push(...b.values()); before = b.last().id; }
  return out.reverse();
}
async function buildTranscript(channel, title = '') {
  const msgs = await fetchAll(channel);
  const rows = msgs.map((m) => `<div class="m"><b>${esc(m.author?.tag || m.author?.username)}</b> <small>${m.createdAt.toISOString()}</small><div>${esc(m.content).replace(/\n/g, '<br>')}</div>`
    + [...m.attachments.values()].map((a) => `<div><a href="${esc(a.url)}">📎 ${esc(a.name)}</a></div>`).join('')
    + m.embeds.map((e) => `<div class="e">${esc(e.title || '')} ${esc(e.description || '')}</div>`).join('') + '</div>').join('\n');
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:sans-serif;background:#f4f4f4;padding:16px}.m{background:#fff;margin:6px 0;padding:8px;border-radius:6px}.e{background:#eef;padding:4px;margin-top:4px}small{color:#777}</style></head><body><h2>${esc(title)}</h2>${rows}</body></html>`;
}
// Sends the HTML transcript (+ optional embed) to the guild log channel of `kind`; returns true if sent. Never throws.
async function sendTranscript(client, guildId, kind, channel, { title, embed }) {
  try {
    const cfg = await config.get(guildId); const lc = cfg.guild.settings?.logChannels || {}; const id = lc[kind] || lc.general; if (!id) return false;
    const ch = await client.channels.fetch(id).catch(() => null); if (!ch?.isTextBased()) return false;
    const html = await buildTranscript(channel, title); const file = new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: 'transcript.html' });
    await ch.send({ embeds: embed ? [embed] : [], files: [file] }); return true;
  } catch (e) { log.warn('sendTranscript failed', e.message); return false; }
}
// Transcript to log channel, then delete the channel. Never throws.
async function closeChannel(client, channel, { guildId, kind, title, embed, delayMs = 0 }) {
  try { if (!channel) return; await sendTranscript(client, guildId, kind, channel, { title, embed }); if (delayMs) await new Promise((r) => setTimeout(r, delayMs)); await channel.delete('ticket closed').catch(() => null); }
  catch (e) { log.warn('closeChannel failed', e.message); }
}
module.exports = { createPrivateChannel, buildTranscript, sendTranscript, closeChannel, fetchAll, esc };
// Extra helpers for the support-ticket module (kept additive).
module.exports.logFile = async function logFile(client, guildId, kind, { embed, name = 'transcript.html', html }) {
  try {
    const cfg = await config.get(guildId); const lc = cfg.guild.settings?.logChannels || {}; const id = lc[kind] || lc.general; if (!id) return false;
    const ch = await client.channels.fetch(id).catch(() => null); if (!ch?.isTextBased()) return false;
    await ch.send({ embeds: embed ? [embed] : [], files: html ? [new AttachmentBuilder(Buffer.from(html, 'utf8'), { name })] : [] }); return true;
  } catch (e) { log.warn('logFile failed', e.message); return false; }
};
