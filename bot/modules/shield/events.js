const { EmbedBuilder, PermissionFlagsBits: P } = require('discord.js'); const crypto = require('crypto');
const prisma = require('../../core/db'); const log = require('../../core/logger'); const config = require('../../core/config'); const perms = require('../../core/perms'); const { t } = require('../../core/i18n');
const S = require('./lib/settings'); const links = require('./lib/links'); const bl = require('./lib/blocklist'); const act = require('./lib/activity'); const A = require('./lib/actions');
const events = new Map(); const lastTrigger = new Map(); const raids = new Map(); const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const INVITE = /(?:discord(?:app)?\.(?:gg|com\/invite)|dsc\.gg)\/[\w-]+/gi;
const keyOf = (g, u) => `${g}:${u}`;
function push(key, e) { const arr = (events.get(key) || []).filter((x) => Date.now() - x.ts < act.WINDOW); arr.push(e); events.set(key, arr.slice(-30)); return arr; }
async function exempt(member, cfg, sh) { if (!member) return true; if (member.permissions.has(P.Administrator)) return true; if (await perms.isStaff(member, member.guild.id)) return true; return sh.exemptRoleIds.some((r) => member.roles.cache.has(r)); }
async function deleteSpam(client, key) { let n = 0; for (const e of events.get(key) || []) { if (!e.messageId) continue; const ch = await client.channels.fetch(e.channelId).catch(() => null); if (await ch?.messages.delete(e.messageId).then(() => true).catch(() => false)) n++; } events.set(key, []); return n; }

async function onLinkHit(ctx, msg, cfg, hit) {
  const sh = S.of(cfg).linkBlock; const guild = msg.guild; await msg.delete().catch(() => null); let action = sh.action; let qid = null;
  if (action === 'timeout') await msg.member.timeout(sh.timeoutMinutes * 60000, 'scam link').catch(() => { action = 'delete'; });
  if (action === 'quarantine') { const q = await A.quarantine(guild, msg.member, cfg, null).catch(() => null); qid = q?.id || null; if (!q) action = 'delete'; }
  const e = new EmbedBuilder().setColor(0xe74c3c).setTitle(t(cfg, 'shield.link.title')).setDescription(t(cfg, 'shield.link.body', { user: msg.author.id, channel: msg.channelId, host: hit.host, why: t(cfg, `shield.why.${hit.kind}`), action: t(cfg, `shield.act.${action}`) }));
  await A.record(ctx.client, guild.id, { userId: msg.author.id, kind: 'scam_link', action, details: { host: hit.host, hitKind: hit.kind, via: hit.via || null }, embed: e, components: [A.alertRow(cfg, msg.author.id, qid)] });
  msg.author.send(t(cfg, 'shield.dm.link', { guild: guild.name })).catch(() => null);
}
async function onCompromised(ctx, msg, cfg, res) {
  const guild = msg.guild; const key = keyOf(guild.id, msg.author.id); lastTrigger.set(key, Date.now());
  const q = await A.quarantine(guild, msg.member, cfg, null).catch(() => null); const deleted = await deleteSpam(ctx.client, key);
  const e = new EmbedBuilder().setColor(0xc0392b).setTitle(t(cfg, 'shield.comp.title')).setDescription(t(cfg, 'shield.comp.body', { user: msg.author.id, score: res.score, threshold: res.threshold, reasons: res.reasons.map((r) => t(cfg, `shield.reason.${r}`)).join('، '), deleted }));
  await A.record(ctx.client, guild.id, { userId: msg.author.id, kind: 'compromised', score: res.score, action: 'quarantine', details: { reasons: res.reasons, deleted }, embed: e, components: [A.alertRow(cfg, msg.author.id, q?.id)] });
}
async function onMessage(ctx, msg) {
  try {
    if (!msg.guild || msg.author.bot || !msg.member) return; const cfg = await config.get(msg.guildId); if (!config.enabled(cfg, 'shield', true)) return; const st = S.of(cfg);
    if (!st.linkBlock.enabled && !st.compromised.enabled) return; if (await exempt(msg.member, cfg, st.linkBlock)) return;
    const text = msg.content || ''; const hosts = links.extractHosts(text); const inv = (text.match(INVITE) || []).length;
    if (st.linkBlock.enabled && hosts.length) { const hit = await links.scan(text, { blocked: bl.set, custom: st.linkBlock.customDomains.map((d) => d.toLowerCase()), allow: st.linkBlock.allowDomains.map((d) => d.toLowerCase()) }); if (hit) return onLinkHit(ctx, msg, cfg, hit); }
    if (!st.compromised.enabled) return;
    const key = keyOf(msg.guildId, msg.author.id); const n = norm(text);
    const arr = push(key, { ts: Date.now(), channelId: msg.channelId, messageId: msg.id, hash: n.length >= 8 ? crypto.createHash('md5').update(n).digest('hex') : null, links: hosts.length, mentions: msg.mentions.users.size + msg.mentions.roles.size, everyone: msg.mentions.everyone, invites: inv });
    const sc = st.compromised; if (Date.now() - (lastTrigger.get(key) || 0) < sc.cooldownMin * 60000) return;
    const res = act.scoreActivity(arr, { memberAgeDays: msg.member.joinedTimestamp ? (Date.now() - msg.member.joinedTimestamp) / 86400000 : 0, sensitivity: sc.sensitivity }); if (res.triggered) await onCompromised(ctx, msg, cfg, res);
  } catch (e) { log.error('shield messageCreate', e); }
}
async function onJoin(ctx, member) {
  try {
    if (member.user.bot) return; const cfg = await config.get(member.guild.id); if (!config.enabled(cfg, 'shield', true)) return; const r = S.of(cfg).raid; if (!r.enabled) return; const guild = member.guild;
    const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;
    if (r.gateDays > 0 && ageDays < r.gateDays) { // account-age gate
      const dm = member.send(t(cfg, 'shield.gate.dm', { guild: guild.name })).catch(() => null); await dm; let action = r.gateAction; if (action === 'kick') await member.kick('account too new').catch(() => { action = 'timeout'; }); if (action === 'timeout') await member.timeout(24 * 3600000, 'account too new').catch(() => null);
      await A.record(ctx.client, guild.id, { userId: member.id, kind: 'gate', action, details: { ageDays: Math.floor(ageDays) }, embed: new EmbedBuilder().setColor(0xe67e22).setTitle(t(cfg, 'shield.gate.title')).setDescription(t(cfg, 'shield.gate.body', { user: member.id, days: Math.floor(ageDays), min: r.gateDays, action })) });
    }
    if (!raids.has(guild.id)) raids.set(guild.id, new act.RaidTracker()); const tr = raids.get(guild.id); tr.add(member.id, Date.now(), ageDays); const m = tr.check(r.joins, r.seconds, r.newAccountDays); if (!m) return;
    if (await prisma.shieldLockdown.findUnique({ where: { guildId: guild.id } })) return; tr.joins = []; const n = await A.lockdown(guild, r.lockdownChannelIds);
    const row = new (require('discord.js').ActionRowBuilder)().addComponents(A.btn('shield:endraid:0', t(cfg, 'shield.btn.endraid'), require('discord.js').ButtonStyle.Danger));
    await A.record(ctx.client, guild.id, { userId: 'raid', kind: 'raid', action: 'lockdown', details: { joins: m.length, users: m.map((j) => j.userId).slice(0, 50), channels: n }, embed: new EmbedBuilder().setColor(0xc0392b).setTitle(t(cfg, 'shield.raid.title')).setDescription(t(cfg, 'shield.raid.body', { n: m.length, sec: r.seconds, channels: n })), components: [row] });
  } catch (e) { log.error('shield guildMemberAdd', e); }
}
async function sweepRaids(ctx) { // auto-end lockdowns after autoEndMinutes
  for (const l of await prisma.shieldLockdown.findMany({ take: 100 })) { const guild = await ctx.client.guilds.fetch(l.guildId).catch(() => null); if (!guild) continue; const cfg = await config.get(l.guildId); const mins = S.of(cfg).raid.autoEndMinutes; if (mins > 0 && Date.now() - +l.startedAt >= mins * 60000) await A.endRaid(guild, 'system:auto'); }
}
let started = false; const every = (fn, ms, name) => setInterval(() => Promise.resolve(fn()).catch((e) => log.warn(name + ' failed', e.message)), ms);
module.exports = {
  messageCreate: onMessage, guildMemberAdd: onJoin,
  ready: async (ctx) => { if (started) return; started = true; await bl.load(); setTimeout(() => bl.update().catch(() => null), 20000); every(() => bl.update(), 24 * 3600000, 'blocklistUpdate'); every(() => sweepRaids(ctx), 60000, 'raidSweep');
    every(() => { for (const [k, v] of events) if (!v.length || Date.now() - v[v.length - 1].ts > act.WINDOW) events.delete(k); for (const [k, ts] of lastTrigger) if (Date.now() - ts > 86400000) lastTrigger.delete(k); if (raids.size > 2000) raids.clear(); }, 300000, 'activityGC'); },
};
